import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

function normalizeStatus(value: unknown): AttendanceStatus | null {
  switch (value) {
    case "present":
    case "absent":
    case "late":
    case "excused":
      return value;
    default:
      return null;
  }
}

/** `YYYY-MM-DD` for today in Baghdad (UTC+3), matching the web attendance route. */
function baghdadToday(): string {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { searchParams } = new URL(req.url);
    const date =
      searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    // The class filter is keyed by class_name — `students` has no class_id
    // column. The param name is kept for client compatibility.
    const className = searchParams.get("class_id") ?? null;
    const status = searchParams.get("status") ?? null;

    // Read the canonical `attendance_records` table (the same one POST writes and
    // the teacher mobile routes write). The legacy `attendance` table this route
    // used to read is only a mirror and misses rows written directly to records.
    // `students!inner(...)` makes the class filter actually constrain the rows.
    let query = serviceSupabase
      .from("attendance_records")
      .select(
        "id, attendance_date, status, note, students!inner(id, full_name, class_name)",
      )
      .eq("school_id", schoolId)
      .eq("attendance_date", date);

    if (status) {
      query = query.eq("status", status);
    }

    if (className) {
      query = query.eq("students.class_name", className);
    }

    const { data, error } = await query.order("attendance_date", {
      ascending: false,
    });

    if (error) throw error;

    const items = (data ?? []).map((a) => {
      const student = Array.isArray(a.students) ? a.students[0] : a.students;
      return {
        id: a.id as string,
        date: a.attendance_date as string,
        status: a.status as string,
        notes: (a.note as string | null) ?? null,
        student_id: (student as { id: string } | null)?.id ?? null,
        student_name:
          (student as { full_name: string | null } | null)?.full_name ?? null,
        class_name:
          (student as { class_name: string | null } | null)?.class_name ?? null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

/**
 * Save a day's attendance from the admin app.
 *
 * Writes to `attendance_records` (the canonical table the web app uses) rather
 * than the legacy `attendance` table this route's GET reads — the
 * `trg_sync_attendance_record_to_legacy` trigger mirrors rows across, so both
 * surfaces stay consistent and the change is captured by the audit triggers.
 *
 * Auth deliberately goes through `resolveAdminMobileRouteContext` instead of the
 * web permission helper: mobile admins live in `managed_user_profiles` and most
 * of them have no `user_profiles` row, so `routeUserHasPermission` would deny
 * them.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, branchId, authUserId, serviceSupabase } = context.value;

    const body = (await req.json().catch(() => null)) as {
      date?: unknown;
      entries?: unknown;
    } | null;

    const date = normalizeDate(body?.date) ?? baghdadToday();
    if (date > baghdadToday()) {
      return NextResponse.json(
        { ok: false, error: "لا يمكن تسجيل الحضور لتاريخ مستقبلي." },
        { status: 400 },
      );
    }

    // Last write per student wins, so a double-tap cannot produce two rows.
    const deduped = new Map<
      string,
      { student_id: string; status: AttendanceStatus; note: string | null }
    >();
    for (const raw of Array.isArray(body?.entries) ? body.entries : []) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      const studentId =
        typeof entry.student_id === "string" ? entry.student_id.trim() : "";
      const status = normalizeStatus(entry.status);
      if (!studentId || !status) continue;
      deduped.set(studentId, {
        student_id: studentId,
        status,
        note: normalizeNote(entry.note),
      });
    }

    const entries = Array.from(deduped.values());
    if (entries.length === 0) {
      return NextResponse.json(
        { ok: false, error: "لا توجد سجلات حضور صالحة للحفظ." },
        { status: 400 },
      );
    }

    // The service client bypasses RLS, so school ownership is enforced here:
    // every student id must belong to the actor's school.
    const { data: students, error: studentsError } = await serviceSupabase
      .from("students")
      .select("id, branch_id")
      .eq("school_id", schoolId)
      .in(
        "id",
        entries.map((entry) => entry.student_id),
      );

    if (studentsError) {
      return NextResponse.json(
        { ok: false, error: "تعذر التحقق من الطلاب قبل الحفظ." },
        { status: 500 },
      );
    }

    const branchByStudent = new Map(
      (students ?? []).map((student) => [
        String((student as { id: string }).id),
        (student as { branch_id: string | null }).branch_id ?? null,
      ]),
    );

    if (branchByStudent.size !== entries.length) {
      return NextResponse.json(
        { ok: false, error: "بعض السجلات تشير إلى طلاب خارج نطاق مدرستك." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error } = await serviceSupabase.from("attendance_records").upsert(
      entries.map((entry) => ({
        school_id: schoolId,
        branch_id: branchByStudent.get(entry.student_id) ?? branchId,
        student_id: entry.student_id,
        attendance_date: date,
        status: entry.status,
        note: entry.note,
        updated_by: authUserId,
        updated_at: now,
      })),
      { onConflict: "school_id,student_id,attendance_date" },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر حفظ سجلات الحضور." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, saved: entries.length, date });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
