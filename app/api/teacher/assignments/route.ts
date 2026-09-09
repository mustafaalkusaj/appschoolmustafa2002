import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";
import { sendPushNotification } from "@/lib/push-notifications";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("assignments")
    .select(
      "id, title, description, class_name, subject, due_at, created_at",
    )
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: (data ?? []) as Record<string, unknown>[],
  });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId, schoolId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const title = body.title as string | undefined;
  const description = body.description as string | undefined;
  const className = body.class_name as string | undefined;
  const subject = body.subject as string | undefined;
  const dueAt = body.due_at as string | undefined;
  const maxGrade = body.max_grade as number | undefined;
  const allowLate = body.allow_late as boolean | undefined;

  if (!title || !className || !subject) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      title,
      description: description ?? null,
      class_name: className,
      subject,
      due_at: dueAt ?? null,
      teacher_id: teacherId,
      school_id: schoolId,
      ...(typeof maxGrade === "number" ? { max_grade: maxGrade } : {}),
      ...(typeof allowLate === "boolean" ? { allow_late: allowLate } : {}),
    })
    .select("id, title, class_name, subject, due_at, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "insert_failed" },
      { status: 500 },
    );
  }

  const created = data as Record<string, unknown>;

  try {
    const { data: students } = await supabase
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("school_id", schoolId)
      .eq("role", "student")
      .eq("class_name", className)
      .eq("is_active", true);

    const studentIds = (students ?? [])
      .map((s) => (s as Record<string, unknown>).auth_user_id as string)
      .filter(Boolean);

    if (studentIds.length > 0) {
      await sendPushNotification(supabase, {
        schoolId,
        branchId: null,
        userIds: studentIds,
        type: "assignment",
        title: "📝 واجب جديد",
        message: `${title} — ${subject}`,
        link: "/student/assignments",
        metadata: { assignmentId: created.id },
        recipientRole: "student",
      });
    }
  } catch {
    // notification failure should not block assignment creation
  }

  return NextResponse.json({
    ok: true,
    data: created,
  });
}
