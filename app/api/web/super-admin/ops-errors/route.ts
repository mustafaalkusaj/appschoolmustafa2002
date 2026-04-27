import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import {
  getRecentOpsErrors,
  updateOpsErrorStatus,
  getOpsErrorById,
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

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// GET /api/web/super-admin/ops-errors — list errors
export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "غير مصرح.",
      "status" in context ? context.status : 401,
    );
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const severityParam = searchParams.get("severity");
  const limitRaw = parseInt(searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 100 : limitRaw), 200);

  const status =
    statusParam && VALID_STATUSES.has(statusParam as OpsErrorStatus)
      ? (statusParam as OpsErrorStatus)
      : undefined;
  const severity =
    severityParam && VALID_SEVERITIES.has(severityParam as OpsErrorSeverity)
      ? (severityParam as OpsErrorSeverity)
      : undefined;

  try {
    const errors = await getRecentOpsErrors({ limit, status, severity });
    // Strip fix_prompt and safe_stack from list — fetch per-error on demand
    const safe = errors.map(({ fix_prompt: _fp, safe_stack: _ss, ...rest }) => rest);
    return NextResponse.json(
      { ok: true, errors: safe, count: safe.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "unknown",
      500,
    );
  }
}

// PATCH /api/web/super-admin/ops-errors?id=... — update status
export async function PATCH(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "غير مصرح.",
      "status" in context ? context.status : 401,
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("id مطلوب.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  const b = body as Record<string, unknown>;
  const status = b.status as OpsErrorStatus | undefined;
  if (!status || !VALID_STATUSES.has(status)) {
    return jsonError("status غير صالح.", 400);
  }

  try {
    const existing = await getOpsErrorById(id);
    if (!existing) return jsonError("الخطأ غير موجود.", 404);

    await updateOpsErrorStatus(id, status);
    return NextResponse.json(
      { ok: true, id, status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "unknown", 500);
  }
}
