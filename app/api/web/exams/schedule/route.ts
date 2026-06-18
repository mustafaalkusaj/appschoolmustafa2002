import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { toBaghdadTimestamp } from "@/lib/tz";

export const dynamic = "force-dynamic";

const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

interface ScheduledExam {
  id: string;
  title: string;
  subject: string | null;
  class_name: string | null;
  total_marks: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
}

interface ConflictInfo {
  examId: string;
  examTitle: string;
  className: string | null;
  startsAt: string;
  endsAt: string;
}

function groupByDate(exams: ScheduledExam[]): Record<string, ScheduledExam[]> {
  const groups: Record<string, ScheduledExam[]> = {};
  for (const exam of exams) {
    const date = exam.starts_at ? exam.starts_at.slice(0, 10) : "unscheduled";
    const list = groups[date] ?? [];
    list.push(exam);
    groups[date] = list;
  }
  return groups;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض جدول الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = actorSupabase
    .from("exams")
    .select("id, title, subject, class_name, total_marks, starts_at, ends_at, created_by")
    .eq("school_id", targetSchoolId)
    .not("starts_at", "is", null)
    .order("starts_at", { ascending: true });

  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("starts_at", to);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const exams = (data ?? []) as ScheduledExam[];
  const grouped = groupByDate(exams);

  return NextResponse.json({ ok: true, schedule: grouped, total: exams.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.examId || !body?.starts_at || !body?.ends_at) {
    return NextResponse.json({ ok: false, error: "examId, starts_at, and ends_at are required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية جدولة الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;

  // Verify exam
  const { data: exam, error: examError } = await actorSupabase
    .from("exams")
    .select("id, school_id, title, class_name, subject")
    .eq("id", body.examId)
    .eq("school_id", targetSchoolId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ ok: false, error: "exam not found" }, { status: 404 });
  }

  const examRow = exam as { id: string; title: string; class_name: string | null; subject: string | null };
  const startsAt = toBaghdadTimestamp(body.starts_at as string) as string;
  const endsAt = toBaghdadTimestamp(body.ends_at as string) as string;

  // ------- Conflict detection -------
  const conflicts: ConflictInfo[] = [];

  if (examRow.class_name) {
    const { data: overlapping } = await actorSupabase
      .from("exams")
      .select("id, title, class_name, starts_at, ends_at")
      .eq("school_id", targetSchoolId)
      .eq("class_name", examRow.class_name)
      .neq("id", body.examId)
      .not("starts_at", "is", null)
      .not("ends_at", "is", null)
      .lte("starts_at", endsAt)
      .gte("ends_at", startsAt);

    for (const row of (overlapping ?? []) as Array<{ id: string; title: string; class_name: string | null; starts_at: string; ends_at: string }>) {
      conflicts.push({
        examId: row.id,
        examTitle: row.title,
        className: row.class_name,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      });
    }
  }

  if (conflicts.length > 0 && !body.force) {
    return NextResponse.json({
      ok: false,
      error: "schedule_conflict",
      conflicts,
      message: `يوجد ${conflicts.length} تعارض في الجدول لنفس الصف`,
    }, { status: 409 });
  }

  // Update exam schedule
  const { error: updateError } = await actorSupabase
    .from("exams")
    .update({ starts_at: startsAt, ends_at: endsAt })
    .eq("id", body.examId)
    .eq("school_id", targetSchoolId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  // Create calendar event (fire-and-forget)
  try {
    await actorSupabase.from("calendar_events").insert({
      school_id: targetSchoolId,
      title: `امتحان: ${examRow.title}`,
      title_en: `Exam: ${examRow.title}`,
      date: startsAt.slice(0, 10),
      end_date: endsAt.slice(0, 10),
      type: "exams",
      description: examRow.class_name
        ? `امتحان ${examRow.title} - ${examRow.class_name}`
        : `امتحان ${examRow.title}`,
      created_by: actorUserId,
    });
  } catch {
    // calendar event failure must never block scheduling
  }

  // Send push notifications (fire-and-forget)
  if (body.notify !== false) {
    try {
      const { notifyExamScheduled } = await import("@/lib/notify-events");
      await notifyExamScheduled({
        supabase: actorSupabase,
        schoolId: targetSchoolId,
        className: examRow.class_name,
        examTitle: examRow.title,
        subject: examRow.subject,
        startsAt,
      });
    } catch {
      // notification failure must never block scheduling
    }
  }

  return NextResponse.json({
    ok: true,
    examId: body.examId,
    starts_at: startsAt,
    ends_at: endsAt,
    conflicts,
    calendarEventCreated: true,
    notificationSent: body.notify !== false,
  });
}
