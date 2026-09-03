import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, schoolId } = ctx;

  const url = new URL(req.url);
  const className = url.searchParams.get("class_name");

  if (!className) {
    return NextResponse.json(
      { ok: false, error: "class_name_required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, class_name, phone, guardian_phone")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .order("full_name", { ascending: true });

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
      students: rows.map((s) => ({
        id: s.id as string,
        full_name: (s.full_name as string) ?? "",
        class_name: (s.class_name as string) ?? "",
        phone: (s.phone as string) ?? null,
        guardian_phone: (s.guardian_phone as string) ?? null,
      })),
    },
  });
}
