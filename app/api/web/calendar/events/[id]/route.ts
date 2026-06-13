import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { resolveBranchScope } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل أحداث التقويم متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "calendar-events-update",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const allowedFields = ["title", "title_en", "date", "end_date", "type", "hijri_date", "description", "color"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] ?? null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("لا توجد حقول صالحة للتحديث.", 400);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const supabase = context.value.actorSupabase;

  // Verify the event belongs to this school (non-global events) and to the actor's branch scope
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id, school_id, branch_id, is_global")
    .eq("id", id)
    .single();

  if (!existing) {
    return jsonError("الحدث غير موجود.", 404);
  }

  if (existing.is_global) {
    return jsonError("لا يمكن تعديل الأحداث الوطنية العامة.", 403);
  }

  if (existing.school_id !== context.value.targetSchoolId) {
    return jsonError("لا تملك صلاحية تعديل هذا الحدث.", 403);
  }

  // If the actor is branch-scoped, verify the event belongs to their branch (or has no branch)
  if (branchScope.value.branchIds.length > 0 && existing.branch_id) {
    if (!branchScope.value.branchIds.includes(existing.branch_id)) {
      return jsonError("لا تملك صلاحية تعديل هذا الحدث.", 403);
    }
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, event: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف أحداث التقويم متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "calendar-events-delete",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const deleteBranchScope = resolveBranchScope(context.value, req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"));
  if (!deleteBranchScope.ok) {
    return jsonError(deleteBranchScope.message, deleteBranchScope.status);
  }

  const supabase = context.value.actorSupabase;

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id, school_id, branch_id, is_global")
    .eq("id", id)
    .single();

  if (!existing) {
    return jsonError("الحدث غير موجود.", 404);
  }

  if (existing.is_global) {
    return jsonError("لا يمكن حذف الأحداث الوطنية العامة.", 403);
  }

  if (existing.school_id !== context.value.targetSchoolId) {
    return jsonError("لا تملك صلاحية حذف هذا الحدث.", 403);
  }

  // If the actor is branch-scoped, verify the event belongs to their branch (or has no branch)
  if (deleteBranchScope.value.branchIds.length > 0 && existing.branch_id) {
    if (!deleteBranchScope.value.branchIds.includes(existing.branch_id)) {
      return jsonError("لا تملك صلاحية حذف هذا الحدث.", 403);
    }
  }

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
