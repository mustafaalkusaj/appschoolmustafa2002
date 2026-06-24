import { NextRequest, NextResponse } from "next/server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * GET /api/mobile/parent/appointments
 * Returns the parent's teacher appointment requests.
 */
export async function GET(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const userId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    const { data, error } = await serviceSupabase
      .from("teacher_appointments")
      .select(
        `id, status, parent_notes, scheduled_at, created_at,
         students(full_name),
         managed_user_profiles!teacher_id(full_name, subject)`,
      )
      .eq("parent_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError("خطأ في جلب المواعيد.", 500);
    }

    const items = (data ?? []).map((row: Record<string, unknown>) => {
      const student = row.students as { full_name?: string } | null;
      const teacher = row["managed_user_profiles!teacher_id"] as {
        full_name?: string;
        subject?: string;
      } | null;
      return {
        id: row.id,
        status: row.status,
        parent_notes: row.parent_notes,
        scheduled_at: row.scheduled_at,
        created_at: row.created_at,
        student_name: student?.full_name ?? null,
        teacher_name: teacher?.full_name ?? null,
        teacher_subject: teacher?.subject ?? null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch {
    return jsonError("خطأ داخلي في الخادم.", 500);
  }
}

/**
 * POST /api/mobile/parent/appointments
 * Creates a new appointment request.
 * Body: { student_id, parent_notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const userId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    const body = (await req.json().catch(() => null)) ?? {};
    const studentId = body.student_id as string | undefined;
    const parentNotes = (body.parent_notes as string | undefined) ?? null;

    if (!studentId) {
      return jsonError("student_id مطلوب.", 400);
    }

    // Verify this student belongs to the parent and get school_id.
    const { data: link, error: linkError } = await serviceSupabase
      .from("parent_student_links")
      .select("school_id")
      .eq("parent_user_id", userId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (linkError) {
      return jsonError("خطأ في التحقق من بيانات الطالب.", 500);
    }

    if (!link) {
      return jsonError("الطالب غير مرتبط بحسابك.", 403);
    }

    const { data: appointment, error: insertError } = await serviceSupabase
      .from("teacher_appointments")
      .insert({
        school_id: link.school_id,
        parent_user_id: userId,
        student_id: studentId,
        teacher_id: null,
        parent_notes: parentNotes,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      return jsonError("تعذر إنشاء طلب الموعد.", 500);
    }

    return NextResponse.json({ ok: true, appointment });
  } catch {
    return jsonError("خطأ داخلي في الخادم.", 500);
  }
}
