import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId, className } = ctx;

  if (!className) {
    return NextResponse.json({ ok: true, data: { exams: [] } });
  }

  const { data, error } = await supabase
    .from("exams")
    .select("id, title, type, subject, total_marks, starts_at, ends_at")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return NextResponse.json({
    ok: true,
    data: {
      exams: rows.map((e) => {
        const startsAt = (e.starts_at as string) ?? "";
        return {
          id: e.id as string,
          subject_name: (e.subject as string) ?? (e.title as string) ?? "—",
          exam_date: startsAt.slice(0, 10),
          exam_type: (e.type as string) ?? null,
          max_score: e.total_marks != null ? Number(e.total_marks) : null,
          room: null,
        };
      }),
    },
  });
}
