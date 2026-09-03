import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId } = ctx;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, phone, avatar_url, role, job_title")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const row = data as Record<string, unknown> | null;

  if (!row) {
    return NextResponse.json(
      { ok: false, error: "profile_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      profile: {
        id: row.id as string,
        full_name: (row.full_name as string) ?? "",
        email: (row.email as string) ?? null,
        phone: (row.phone as string) ?? null,
        avatar_url: (row.avatar_url as string) ?? null,
        role: (row.role as string) ?? "teacher",
        job_title: (row.job_title as string) ?? null,
      },
    },
  });
}
