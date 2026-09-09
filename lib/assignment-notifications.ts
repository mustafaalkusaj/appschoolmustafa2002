// ============================================================
// Assignment notification helpers
// ------------------------------------------------------------
// `assignments.teacher_id` and `assignment_submissions.student_id` are not
// guaranteed to be auth_user_id values — see the dual-identity fallback
// already used in lib/student-api.ts (resolveStudentContext). A student can
// be linked via `managed_user_profiles.student_id` -> `students.id`, or
// (legacy) directly via `students.auth_user_id`. Teachers have the same
// shape via `managed_user_profiles.teacher_id` -> `teachers.id`, or a
// `teachers.auth_user_id` fallback. `sendPushNotification` needs the real
// auth_user_id, so every notification trigger must resolve through here
// rather than assuming the stored id is already an auth id.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";

function authUserIdOf(row: unknown): string | null {
  const value = (row as Record<string, unknown> | null)?.auth_user_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Resolve the auth_user_id of a teacher, given the value stored in
 * `assignments.teacher_id`. That value may already be an auth_user_id (the
 * common path via resolveTeacherContext) or a `teachers.id` value.
 */
export async function resolveTeacherAuthUserId(
  supabase: SupabaseClient,
  schoolId: string,
  teacherId: string,
): Promise<string | null> {
  const { data: byAuthUserId } = await supabase
    .from("managed_user_profiles")
    .select("auth_user_id")
    .eq("auth_user_id", teacherId)
    .eq("school_id", schoolId)
    .maybeSingle();
  const viaAuthUserId = authUserIdOf(byAuthUserId);
  if (viaAuthUserId) return viaAuthUserId;

  const { data: byTeacherId } = await supabase
    .from("managed_user_profiles")
    .select("auth_user_id")
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .maybeSingle();
  const viaTeacherId = authUserIdOf(byTeacherId);
  if (viaTeacherId) return viaTeacherId;

  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("auth_user_id")
    .eq("id", teacherId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return authUserIdOf(teacherRow);
}

/**
 * Resolve the auth_user_id of a student, given the value stored in
 * `assignment_submissions.student_id` / `grades.student_id` (which is
 * always `students.id`, never an auth id).
 */
export async function resolveStudentAuthUserId(
  supabase: SupabaseClient,
  schoolId: string,
  studentId: string,
): Promise<string | null> {
  const { data: managed } = await supabase
    .from("managed_user_profiles")
    .select("auth_user_id")
    .eq("student_id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  const viaManaged = authUserIdOf(managed);
  if (viaManaged) return viaManaged;

  const { data: student } = await supabase
    .from("students")
    .select("auth_user_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return authUserIdOf(student);
}
