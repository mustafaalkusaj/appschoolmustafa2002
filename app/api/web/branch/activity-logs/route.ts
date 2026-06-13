import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { getRecentAuditLogs } from "@/lib/audit/audit-log";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    req.nextUrl.searchParams.get("schoolId"),
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية عرض سجل النشاط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { targetSchoolId, actorBranchId, actorRole } = context.value;
  const { searchParams } = req.nextUrl;
  // Use explicit branchId param if provided, else fall back to actor's branchId
  const branchId = searchParams.get("branchId") || actorBranchId || null;
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);

  if (!branchId) {
    // Super admin with no branch scope: return empty (not an error)
    return NextResponse.json({ ok: true, logs: [] });
  }

  // Branch isolation: employee can only view their own branch
  if (
    actorRole !== "super_admin" &&
    actorRole !== "admin" &&
    actorBranchId !== branchId
  ) {
    return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 403 });
  }

  const logs = await getRecentAuditLogs({ branch_id: branchId, school_id: targetSchoolId, limit });

  return NextResponse.json({ ok: true, logs });
}
