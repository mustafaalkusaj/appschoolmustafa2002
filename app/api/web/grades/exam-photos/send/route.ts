import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// POST — send exam photos notification to student
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError("طلب غير صالح.", 400); }

  const { entryId, schoolId } = body as { entryId?: string; schoolId?: string };
  if (!entryId || !schoolId) return jsonError("entryId و schoolId مطلوبان.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) return jsonError("message" in context ? context.message : "خطأ.", "status" in context ? context.status : 500);

  const rateLimited = await enforceRateLimit(req, { namespace: "exam-photo-send", windowMs: 60_000, maxHits: 20, identifier: context.value.actorUserId });
  if (rateLimited) return rateLimited;

  const canEnter = await routeUserHasPermission(context.value.actorSupabase, context.value.actorUserId, "enter_grades");
  if (!canEnter) return jsonError("ليس لديك صلاحية إرسال إشعارات الدرجات.", 403);

  const { actorSupabase, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const { data: entry } = await actorSupabase
    .from("grade_entries")
    .select("id, student_id, exam_photos, grade_type_name, score, max_score")
    .eq("id", entryId)
    .eq("school_id", targetSchoolId)
    .single();

  if (!entry) return jsonError("سجل الدرجة غير موجود.", 404);

  // Branch isolation: verify grade entry's student belongs to this branch
  if (branchScope.value.branchIds.length > 0) {
    const studentId = (entry as Record<string, unknown>).student_id as string | null;
    if (studentId) {
      const { data: studentCheck } = await applyBranchScopeToQuery(
        actorSupabase.from("students").select("id").eq("id", studentId),
        branchScope.value,
      ).limit(1);
      if (!studentCheck || (studentCheck as unknown[]).length === 0) {
        return jsonError("لا يمكنك إرسال إشعارات لطلاب من فرع آخر.", 403);
      }
    }
  }

  const photos: string[] = Array.isArray(entry.exam_photos) ? entry.exam_photos : [];
  if (photos.length === 0) return jsonError("لا توجد صور لإرسالها.", 400);

  try {
    // Insert notification for the student
    await actorSupabase.from("notifications").insert({
      school_id: targetSchoolId,
      user_id: entry.student_id,
      type: "grade_photos",
      title: "صور الامتحان",
      body: `تم إرسال صور امتحان ${entry.grade_type_name ?? "الدرجة"}: ${entry.score ?? "—"} / ${entry.max_score ?? 100}`,
      data: { grade_entry_id: entryId, exam_photos: photos },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // Mark sent
    await actorSupabase
      .from("grade_entries")
      .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("school_id", targetSchoolId);

    return NextResponse.json({ ok: true, message: "تم إرسال صور الامتحان للطالب بنجاح." });
  } catch {
    return jsonError("تعذر إرسال الإشعار.", 500);
  }
}
