import { NextRequest, NextResponse } from "next/server";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

// `teacher_appointments` is not present in the generated Database types yet,
// so we intentionally bypass the typed `.from()` overloads for this table to
// avoid excessively-deep type instantiation while preserving existing
// runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function teacherAppointmentsTable(client: unknown): any {
  return (client as { from: (table: string) => any }).from("teacher_appointments");
}

/**
 * GET /api/mobile/teacher/appointments
 * Returns all appointment requests for this teacher.
 */
export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, account, serviceSupabase } = context.value;
    const teacherId = account.teacher?.id;

    if (!teacherId) {
      return NextResponse.json({ ok: false, error: "المعلم غير موجود." }, { status: 403 });
    }

    const { data, error } = await teacherAppointmentsTable(serviceSupabase)
      .select(`id, status, parent_notes, scheduled_at, created_at, students(full_name)`)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "خطأ في جلب المواعيد." }, { status: 500 });
    }

    const items = ((data ?? []) as Record<string, unknown>[]).map((row: Record<string, unknown>) => {
      const student = row.students as { full_name?: string } | null;
      return {
        id: row.id,
        status: row.status,
        parent_notes: row.parent_notes,
        scheduled_at: row.scheduled_at,
        created_at: row.created_at,
        student_name: student?.full_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, error: "خطأ داخلي." }, { status: 500 });
  }
}

/**
 * PATCH /api/mobile/teacher/appointments
 * Updates appointment status and optionally schedules a time.
 * Body: { id, status, scheduled_at? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, account, serviceSupabase } = context.value;
    const teacherId = account.teacher?.id;

    if (!teacherId) {
      return NextResponse.json({ ok: false, error: "المعلم غير موجود." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) ?? {};
    const appointmentId = body.id as string | undefined;
    const status = body.status as string | undefined;
    const scheduledAt = (body.scheduled_at as string | undefined) ?? null;

    if (!appointmentId || !status) {
      return NextResponse.json({ ok: false, error: "id و status مطلوبان." }, { status: 400 });
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ ok: false, error: "قيمة status غير صالحة." }, { status: 400 });
    }

    // Verify the appointment belongs to this teacher and school.
    const { data: existing, error: fetchError } = await teacherAppointmentsTable(serviceSupabase)
      .select("id")
      .eq("id", appointmentId)
      .eq("teacher_id", teacherId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ ok: false, error: "خطأ في التحقق من الموعد." }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ ok: false, error: "الموعد غير موجود أو غير مصرح." }, { status: 404 });
    }

    const { error: updateError } = await teacherAppointmentsTable(serviceSupabase)
      .update({ status, scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
      .eq("id", appointmentId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "تعذر تحديث الموعد." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطأ داخلي." }, { status: 500 });
  }
}
