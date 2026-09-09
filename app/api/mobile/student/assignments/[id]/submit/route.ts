import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendPushNotification } from "@/lib/push-notifications";
import { resolveTeacherAuthUserId } from "@/lib/assignment-notifications";

type Params = { params: Promise<{ id: string }> };

// `assignment_submissions` is not present in the generated Database types
// yet, so we intentionally bypass the typed `.from()` overloads for this
// table while preserving existing runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignmentSubmissionsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "assignment_submissions",
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: assignmentId } = await params;
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) return context.response;

    const { schoolId, account } = context.value;
    const studentId = account.student?.id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "لا يوجد حساب طالب مرتبط." },
        { status: 403 },
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await assignmentSubmissionsTable(supabase)
      .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
      .eq("school_id", schoolId)
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, submission: data ?? null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

interface SubmitBody {
  notes?: string;
  file_url?: string;
  file_name?: string;
  file_mime_type?: string;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: assignmentId } = await params;
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) return context.response;

    // Submissions carry user content; keep the write path from becoming a
    // spam amplifier.
    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-student-assignment-submit",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: context.value.authUserId,
    });
    if (rateLimited) return rateLimited;

    const { schoolId, account } = context.value;
    const studentId = account.student?.id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "لا يوجد حساب طالب مرتبط." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as SubmitBody;
    const { notes, file_url, file_name, file_mime_type } = body;

    if (!notes && !file_url) {
      return NextResponse.json(
        { ok: false, error: "يجب إرفاق ملاحظة أو ملف على الأقل." },
        { status: 400 },
      );
    }

    const supabase = createServiceSupabaseClient();

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, title, teacher_id, due_at")
      .eq("id", assignmentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    const assignmentRow = assignment as Record<string, unknown> | null;

    let allowLate = true; // permissive default until the migration adds the column
    try {
      const { data: allowLateRow } = await supabase
        .from("assignments")
        .select("allow_late")
        .eq("id", assignmentId)
        .maybeSingle();
      const value = (allowLateRow as Record<string, unknown> | null)
        ?.allow_late;
      if (typeof value === "boolean") allowLate = value;
    } catch {
      // column not present yet — keep permissive default
    }

    const dueAt = assignmentRow?.due_at as string | null | undefined;
    const isLate = Boolean(dueAt) && new Date() > new Date(dueAt as string);

    if (isLate && !allowLate) {
      return NextResponse.json(
        { ok: false, error: "التسليم المتأخر غير مسموح لهذا الواجب." },
        { status: 403 },
      );
    }

    const { data: existing } = await assignmentSubmissionsTable(supabase)
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle();
    const isNewSubmission = !existing;

    const { data, error } = await assignmentSubmissionsTable(supabase)
      .upsert(
        {
          school_id: schoolId,
          assignment_id: assignmentId,
          student_id: studentId,
          notes: notes ?? null,
          file_url: file_url ?? null,
          file_name: file_name ?? null,
          file_mime_type: file_mime_type ?? null,
          submitted_at: new Date().toISOString(),
          is_late: isLate,
        },
        { onConflict: "assignment_id,student_id" },
      )
      .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
      .single();

    if (error) throw error;

    if (isNewSubmission) {
      try {
        const teacherId = assignmentRow?.teacher_id as string | null | undefined;
        if (teacherId) {
          const teacherAuthUserId = await resolveTeacherAuthUserId(
            supabase,
            schoolId,
            teacherId,
          );
          if (teacherAuthUserId) {
            const { data: studentRow } = await supabase
              .from("students")
              .select("full_name")
              .eq("id", studentId)
              .eq("school_id", schoolId)
              .maybeSingle();
            const studentName = (studentRow as Record<string, unknown> | null)
              ?.full_name as string | undefined;

            await sendPushNotification(supabase, {
              schoolId,
              branchId: null,
              userIds: [teacherAuthUserId],
              type: "assignment_submission",
              title: "📥 تسليم جديد",
              message: `${studentName ?? "طالب"} سلّم واجب: ${assignmentRow?.title as string}`,
              link: `/teacher/assignments/${assignmentId}`,
              metadata: { assignmentId, studentId },
              recipientRole: "teacher",
            });
          }
        }
      } catch {
        // notification failure should not block submission
      }
    }

    return NextResponse.json({ ok: true, submission: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
