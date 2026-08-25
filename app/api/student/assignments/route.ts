import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId, className } = ctx;

  const { data, error } = await supabase
    .from("assignments")
    .select("id, title, subject, due_at, content_kind, description, created_at")
    .eq("school_id", schoolId)
    .eq("class_name", className ?? "")
    .order("due_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const assignments = rows.map((a) => ({
    id: a.id as string,
    title: (a.title as string) ?? "—",
    subject: (a.subject as string) ?? null,
    due_at: ((a.due_at as string) ?? "").slice(0, 10),
    content_kind: (a.content_kind as string) ?? "homework",
    description: (a.description as string) ?? null,
    created_at: ((a.created_at as string) ?? "").slice(0, 10),
    is_past: (a.due_at as string) < now,
  }));

  return NextResponse.json({ ok: true, data: assignments });
}
