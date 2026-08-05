import { NextRequest, NextResponse } from "next/server";

import { enrichAssignmentRows } from "@/lib/academic-records-server";
import {
  normalizeClassKey,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";

type Params = { params: Promise<{ id: string }> };

// `assignment_submissions` is not present in the generated Database types yet,
// so we intentionally bypass the typed `.from()` overloads for this table
// (same pattern as ./submit/route.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignmentSubmissionsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "assignment_submissions",
  );
}

/**
 * Single-assignment detail for the mobile student detail screen.
 *
 * The list route is paginated, so the app previously refetched the whole list
 * and `.find()`-ed the record client-side — anything past the first page was
 * unopenable. Returns one assignment (enriched exactly like the list rows) plus
 * the student's own submission, which the detail screen shows as submit state.
 *
 * Entitlement mirrors `queryStudentAssignments`: the row must belong to the
 * caller's school AND be either directly assigned to this student, or a
 * class-wide row whose class (and section, when set) matches the student.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) {
      return context.response;
    }

    const { id: assignmentId } = await params;
    const { schoolId, account, serviceSupabase: supabase } = context.value;
    const student = account.student;

    if (!student?.id) {
      return NextResponse.json(
        { ok: false, error: { message: "لا يوجد حساب طالب مرتبط." } },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: { message: "internal_error" } },
        { status: 500 },
      );
    }

    const row = (data ?? null) as Record<string, unknown> | null;

    // Same visibility scope the list applies via applyModerationVisibilityScope:
    // admin-deleted / soft-deleted rows are invisible to students. Checked in JS
    // because the columns may not exist yet on older schemas.
    const isModeratedAway =
      row != null &&
      (row.status === "deleted_by_admin" ||
        (row.deleted_at !== undefined && row.deleted_at !== null));

    if (!row || isModeratedAway || !isVisibleToStudent(row, student)) {
      return NextResponse.json(
        { ok: false, error: { message: "الواجب غير موجود." } },
        { status: 404 },
      );
    }

    const [enriched] = await enrichAssignmentRows(supabase, [row]);

    const { data: submission } = await assignmentSubmissionsTable(supabase)
      .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
      .eq("school_id", schoolId)
      .eq("assignment_id", assignmentId)
      .eq("student_id", student.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      assignment: enriched ?? row,
      submission: submission ?? null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

/**
 * Mirrors the class/section matching in `queryStudentAssignments`: an exact
 * student_id match always wins; otherwise the row must be a class-wide one
 * (student_id null) whose normalized class matches, and whose section either is
 * unset (whole-class) or matches the student's section.
 */
function isVisibleToStudent(
  row: Record<string, unknown>,
  student: { id: string; class_name?: string | null; section?: string | null },
): boolean {
  const rowStudentId =
    typeof row.student_id === "string" ? row.student_id.trim() : "";
  if (rowStudentId) {
    return rowStudentId === student.id;
  }

  const studentClassKey = student.class_name
    ? normalizeClassKey(student.class_name)
    : null;
  if (!studentClassKey) return false;
  if (normalizeClassKey(row.class_name) !== studentClassKey) return false;

  const rowSection = row.section;
  if (rowSection == null) return true; // whole-class assignment

  const studentSectionKey = student.section
    ? normalizeClassKey(student.section)
    : null;
  return (
    studentSectionKey !== null &&
    normalizeClassKey(rowSection) === studentSectionKey
  );
}
