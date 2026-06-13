import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

const VALID_EVENT_TYPES = ["app_switch", "tab_change", "screenshot_attempt", "copy_paste", "focus_lost"];

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { schoolId, account, serviceSupabase: supabase } = context.value;
    const studentId = account.student?.id;

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: { message: "لم يتم العثور على بيانات الطالب." } },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    // Mobile sends snake_case (attempt_id / event_type); accept camelCase too.
    const attemptId: string | undefined = body?.attempt_id ?? body?.attemptId;
    const rawEventType: string | undefined = body?.event_type ?? body?.eventType;
    if (!attemptId || !rawEventType) {
      return NextResponse.json(
        { ok: false, error: { message: "attempt_id و event_type مطلوبان." } },
        { status: 400 },
      );
    }

    const eventType = String(rawEventType).trim().toLowerCase();
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { ok: false, error: { message: `نوع الحدث غير صالح. الأنواع المسموحة: ${VALID_EVENT_TYPES.join(", ")}` } },
        { status: 400 },
      );
    }

    // Verify attempt belongs to this student
    const { data: attempt, error: attemptError } = await supabase
      .from("exam_attempts")
      .select("id, exam_id, student_id")
      .eq("id", attemptId)
      .eq("student_id", studentId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { ok: false, error: { message: "المحاولة غير موجودة." } },
        { status: 404 },
      );
    }

    const attemptRow = attempt as { id: string; exam_id: string };

    // Insert integrity log
    const { data, error } = await supabase
      .from("exam_integrity_logs")
      .insert({
        attempt_id: attemptRow.id,
        exam_id: attemptRow.exam_id,
        student_id: studentId,
        school_id: schoolId,
        event_type: eventType,
        metadata: body.metadata ?? null,
      })
      .select("id, event_type, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      logged: true,
      item: data,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
