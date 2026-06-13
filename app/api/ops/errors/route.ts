import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import {
  getRecentOpsErrors,
  type OpsErrorStatus,
  type OpsErrorSeverity,
} from "@/lib/ops/error-capture";

const VALID_STATUSES = new Set<OpsErrorStatus>([
  "open",
  "investigating",
  "fixed",
  "ignored",
]);
const VALID_SEVERITIES = new Set<OpsErrorSeverity>([
  "info",
  "warning",
  "critical",
]);

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);
  if (!authorized) return notFound();

  const { searchParams } = new URL(request.url);

  const statusParam = searchParams.get("status");
  const severityParam = searchParams.get("severity");
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 50 : limitRaw), 200);

  const status = statusParam && VALID_STATUSES.has(statusParam as OpsErrorStatus)
    ? (statusParam as OpsErrorStatus)
    : undefined;

  const severity =
    severityParam && VALID_SEVERITIES.has(severityParam as OpsErrorSeverity)
      ? (severityParam as OpsErrorSeverity)
      : undefined;

  try {
    const errors = await getRecentOpsErrors({ limit, status, severity });

    // Strip fix_prompt from list view — fetch per-error via /[errorId]
    const safe = errors.map(({ fix_prompt: _fp, safe_stack: _ss, ...rest }) => rest);

    return NextResponse.json(
      { ok: true, errors: safe, count: safe.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
