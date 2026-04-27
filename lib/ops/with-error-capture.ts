import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { OpsErrorSource } from "@/lib/ops/error-capture";
import { captureOpsError } from "@/lib/ops/error-capture";

export interface WithOpsErrorCaptureOptions {
  source?: OpsErrorSource;
  action?: string;
  /**
   * Optional async function to extract user context from the request.
   * Called before the handler. Errors here are swallowed.
   */
  getUserContext?: (req: NextRequest) => Promise<{
    user_role?: string | null;
    school_id?: string | null;
    branch_id?: string | null;
    auth_user_id?: string | null;
  }>;
}

type RouteHandler = (
  req: NextRequest,
  ctx?: unknown,
) => Promise<NextResponse | Response>;

/**
 * Wraps a Next.js route handler to capture errors into ops_errors table.
 *
 * - Catches thrown errors and returns a generic 500 response.
 * - Captures returned 5xx responses.
 * - Never changes the behaviour of successful responses.
 * - Never throws — if capture itself fails, the original error is still surfaced.
 *
 * Usage:
 *   export const POST = withOpsErrorCapture(handler, { source: "api", action: "save_class" });
 */
export function withOpsErrorCapture(
  handler: RouteHandler,
  options: WithOpsErrorCaptureOptions = {},
): RouteHandler {
  return async (req: NextRequest, ctx?: unknown): Promise<NextResponse | Response> => {
    const source = options.source ?? "api";
    const pathname = new URL(req.url).pathname;

    let userContext: {
      user_role?: string | null;
      school_id?: string | null;
      branch_id?: string | null;
      auth_user_id?: string | null;
    } = {};

    if (options.getUserContext) {
      try {
        userContext = await options.getUserContext(req);
      } catch {
        // ignore — user context is best-effort
      }
    }

    let response: NextResponse | Response;

    try {
      response = await handler(req, ctx);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      const stack = err instanceof Error ? err.stack : undefined;

      captureOpsError({
        source,
        route: pathname,
        method: req.method,
        action: options.action,
        status_code: 500,
        error_message: message,
        stack,
        user_agent: req.headers.get("user-agent") ?? undefined,
        ...userContext,
      }).catch(() => {});

      return NextResponse.json(
        { ok: false, error: "server_error", message: "تعذر تنفيذ الطلب." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Capture 5xx responses returned (not thrown) by the handler
    if (response.status >= 500) {
      captureOpsError({
        source,
        route: pathname,
        method: req.method,
        action: options.action,
        status_code: response.status,
        error_message: `HTTP ${response.status} from ${req.method} ${pathname}`,
        user_agent: req.headers.get("user-agent") ?? undefined,
        ...userContext,
      }).catch(() => {});
    }

    return response;
  };
}
