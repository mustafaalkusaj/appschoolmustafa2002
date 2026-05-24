import { NextRequest, NextResponse } from "next/server";
import { validateLogoUpload } from "@/lib/upload-validation";
import { uploadLogoToStorage } from "@/lib/logo-upload-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// POST — upload one exam photo and attach it to a grade entry (max 4)
export async function POST(req: NextRequest) {
  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  if (!session?.userActive) return jsonError("يجب تسجيل الدخول أولاً.", 401);

  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("البيانات المرسلة غير صالحة.", 400);

  const file = formData.get("file");
  const entryId = typeof formData.get("entryId") === "string" ? String(formData.get("entryId")) : null;
  const schoolId = typeof formData.get("schoolId") === "string" ? String(formData.get("schoolId")) : null;

  if (!entryId || !schoolId) return jsonError("entryId و schoolId مطلوبان.", 400);
  if (!(file instanceof File)) return jsonError("الملف مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) return jsonError("message" in context ? context.message : "خطأ في التحقق.", "status" in context ? context.status : 500);

  const rateLimited = await enforceRateLimit(req, { namespace: "exam-photo-upload", windowMs: 60_000, maxHits: 40, identifier: context.value.actorUserId });
  if (rateLimited) return rateLimited;

  const canEnter = await routeUserHasPermission(context.value.actorSupabase, context.value.actorUserId, "enter_grades");
  if (!canEnter) return jsonError("ليس لديك صلاحية رفع صور الامتحان.", 403);

  const branchScopePost = resolveBranchScope(context.value);
  if (!branchScopePost.ok) return jsonError(branchScopePost.message, branchScopePost.status);

  const validation = await validateLogoUpload(file, file.type as "image/jpeg" | "image/png" | "image/webp");
  if (!validation.ok) return jsonError(validation.message, 400);

  // Check current photo count
  const { data: entry } = await context.value.actorSupabase
    .from("grade_entries")
    .select("exam_photos, school_id, student_id")
    .eq("id", entryId)
    .eq("school_id", context.value.targetSchoolId)
    .single();

  if (!entry) return jsonError("سجل الدرجة غير موجود.", 404);

  // Branch isolation: verify grade entry's student belongs to this branch
  if (branchScopePost.value.branchIds.length > 0) {
    const studentId = (entry as Record<string, unknown>).student_id as string | null;
    if (studentId) {
      const { data: studentCheck } = await applyBranchScopeToQuery(
        context.value.actorSupabase.from("students").select("id").eq("id", studentId),
        branchScopePost.value,
      ).limit(1);
      if (!studentCheck || (studentCheck as unknown[]).length === 0) {
        return jsonError("لا يمكنك تعديل درجات طلاب من فرع آخر.", 403);
      }
    }
  }

  const currentPhotos: string[] = Array.isArray(entry.exam_photos) ? entry.exam_photos : [];
  if (currentPhotos.length >= 4) return jsonError("الحد الأقصى 4 صور لكل امتحان.", 400);

  try {
    const url = await uploadLogoToStorage({
      bucket: "student-photos",
      file,
      mime: validation.mime,
      objectPrefix: `exam/${entryId}`,
      schoolScope: schoolId,
    });

    const updatedPhotos = [...currentPhotos, url];
    await context.value.actorSupabase
      .from("grade_entries")
      .update({ exam_photos: updatedPhotos, updated_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("school_id", context.value.targetSchoolId);

    return NextResponse.json({ ok: true, url, photos: updatedPhotos });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "تعذر رفع الصورة.", 500);
  }
}

// DELETE — remove a photo URL from a grade entry
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");
  const schoolId = searchParams.get("schoolId");
  const photoUrl = searchParams.get("url");

  if (!entryId || !schoolId || !photoUrl) return jsonError("entryId و schoolId و url مطلوبة.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) return jsonError("message" in context ? context.message : "خطأ في التحقق.", "status" in context ? context.status : 500);

  const branchScopeDelete = resolveBranchScope(context.value);
  if (!branchScopeDelete.ok) return jsonError(branchScopeDelete.message, branchScopeDelete.status);

  const { data: entry } = await context.value.actorSupabase
    .from("grade_entries")
    .select("exam_photos, student_id")
    .eq("id", entryId)
    .eq("school_id", context.value.targetSchoolId)
    .single();

  if (!entry) return jsonError("سجل الدرجة غير موجود.", 404);

  // Branch isolation: verify grade entry's student belongs to this branch
  if (branchScopeDelete.value.branchIds.length > 0) {
    const studentId = (entry as Record<string, unknown>).student_id as string | null;
    if (studentId) {
      const { data: studentCheck } = await applyBranchScopeToQuery(
        context.value.actorSupabase.from("students").select("id").eq("id", studentId),
        branchScopeDelete.value,
      ).limit(1);
      if (!studentCheck || (studentCheck as unknown[]).length === 0) {
        return jsonError("لا يمكنك تعديل درجات طلاب من فرع آخر.", 403);
      }
    }
  }

  const updated = (Array.isArray(entry.exam_photos) ? entry.exam_photos as string[] : []).filter((p: string) => p !== photoUrl);
  await context.value.actorSupabase
    .from("grade_entries")
    .update({ exam_photos: updated, updated_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("school_id", context.value.targetSchoolId);

  return NextResponse.json({ ok: true, photos: updated });
}
