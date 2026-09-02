import { NextRequest, NextResponse } from "next/server";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface StudentContext {
  userId: string;
  schoolId: string;
  studentId: string;
  className: string | null;
  supabase: SupabaseClient<Database>;
}

export async function resolveStudentContext(
  req: NextRequest,
): Promise<StudentContext | null> {
  const session = await verifyRBACSession(
    req.cookies.get(RBAC_COOKIE_NAME)?.value,
  );
  if (!session?.userActive || session.role !== "student" || !session.schoolId) {
    return null;
  }

  const supabase = createServiceSupabaseClient();

  const { data: profile } = await supabase
    .from("managed_user_profiles")
    .select("student_id")
    .eq("auth_user_id", session.userId)
    .eq("school_id", session.schoolId)
    .maybeSingle();

  let studentId =
    typeof (profile as Record<string, unknown>)?.student_id === "string"
      ? ((profile as Record<string, unknown>).student_id as string)
      : null;

  // Dual-identity fallback: a student who only has a legacy `user_profiles`
  // row (no `managed_user_profiles` row yet) is linked to `students` via
  // `students.auth_user_id` instead. Without this, every route built on
  // resolveStudentContext (dashboard, exams, assignments, messages, ...)
  // would 401/empty-state for that student despite a valid RBAC session.
  if (!studentId) {
    const { data: legacyStudent } = await supabase
      .from("students")
      .select("id")
      .eq("auth_user_id", session.userId)
      .eq("school_id", session.schoolId)
      .maybeSingle();

    studentId =
      typeof (legacyStudent as Record<string, unknown>)?.id === "string"
        ? ((legacyStudent as Record<string, unknown>).id as string)
        : null;
  }

  if (!studentId) return null;

  const { data: student } = await supabase
    .from("students")
    .select("class_name")
    .eq("id", studentId)
    .eq("school_id", session.schoolId)
    .maybeSingle();

  return {
    userId: session.userId,
    schoolId: session.schoolId,
    studentId,
    className: (student as Record<string, unknown>)?.class_name as string | null,
    supabase,
  };
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function serverError(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 500 },
  );
}
