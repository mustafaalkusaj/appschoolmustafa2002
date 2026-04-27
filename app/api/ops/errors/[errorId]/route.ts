import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import {
  getOpsErrorById,
  updateOpsErrorStatus,
  type OpsErrorStatus,
} from "@/lib/ops/error-capture";

const VALID_STATUSES = new Set<OpsErrorStatus>([
  "open",
  "investigating",
  "fixed",
  "ignored",
]);

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

type RouteContext = { params: Promise<{ errorId: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);
  if (!authorized) return notFound();

  const { errorId } = await ctx.params;
  if (!errorId || typeof errorId !== "string") return notFound();

  try {
    const record = await getOpsErrorById(errorId);
    if (!record) return notFound();

    // Return full record including fix_prompt and safe_stack
    return NextResponse.json(
      { ok: true, error: record },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);
  if (!authorized) return unauthorized();

  const { errorId } = await ctx.params;
  if (!errorId || typeof errorId !== "string") return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const b = body as Record<string, unknown>;
  const status = b.status as OpsErrorStatus | undefined;

  if (!status || !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_status",
        allowed: Array.from(VALID_STATUSES),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const existing = await getOpsErrorById(errorId);
    if (!existing) return notFound();

    await updateOpsErrorStatus(errorId, status);

    return NextResponse.json(
      { ok: true, id: errorId, status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
