import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const classId = searchParams.get("class_id") ?? null;
    const status = searchParams.get("status") ?? null;

    let query = serviceSupabase
      .from("attendance")
      .select("id, date, status, notes, students(id, full_name, class_name)")
      .eq("school_id", schoolId)
      .eq("date", date);

    if (status) {
      query = query.eq("status", status);
    }

    if (classId) {
      // Filter via the joined students table
      query = query.eq("students.class_id", classId);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) throw error;

    const items = (data ?? []).map((a) => {
      const student = Array.isArray(a.students) ? a.students[0] : a.students;
      return {
        id: a.id as string,
        date: a.date as string,
        status: a.status as string,
        notes: (a.notes as string | null) ?? null,
        student_id: (student as { id: string } | null)?.id ?? null,
        student_name: (student as { full_name: string | null } | null)?.full_name ?? null,
        class_name: (student as { class_name: string | null } | null)?.class_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
