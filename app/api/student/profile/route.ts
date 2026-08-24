import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId, userId } = ctx;

  const [profileRes, studentRes, schoolRes] = await Promise.all([
    supabase
      .from("managed_user_profiles")
      .select("full_name, email, phone")
      .eq("auth_user_id", userId)
      .eq("school_id", schoolId)
      .maybeSingle(),

    supabase
      .from("students")
      .select(
        "full_name, class_name, registration_number, date_of_birth, photo_url, created_at",
      )
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle(),

    supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data as Record<string, unknown> | null;
  const student = studentRes.data as Record<string, unknown> | null;
  const school = schoolRes.data as Record<string, unknown> | null;

  return NextResponse.json({
    ok: true,
    data: {
      full_name:
        (student?.full_name as string) ??
        (profile?.full_name as string) ??
        null,
      email: (profile?.email as string) ?? null,
      phone: (profile?.phone as string) ?? null,
      class_name: (student?.class_name as string) ?? null,
      school_name: (school?.name as string) ?? null,
      enrollment_date:
        ((student?.created_at as string) ?? "").slice(0, 10) || null,
      student_id: (student?.registration_number as string) ?? null,
      avatar_url: (student?.photo_url as string) ?? null,
    },
  });
}
