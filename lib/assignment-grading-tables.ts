// ============================================================
// Grading-column escape hatch for `assignments` / `assignment_submissions`
// ------------------------------------------------------------
// The homework grading columns (assignments.max_grade/allow_late/status,
// assignment_submissions.is_late/grade/feedback/graded_at/graded_by) are
// added by migrations/20260909_000000_homework_grading_fields.sql, which
// has NOT been applied to the live database yet. types/database.types.ts
// is generated from the live schema, so the typed Supabase client rejects
// `.select()`/`.update()`/`.insert()` calls that reference these columns
// at compile time.
//
// Bypass the typed `.from()` overload for these two tables, mirroring the
// existing escape hatch in
// app/api/mobile/student/assignments/[id]/submit/route.ts. Once the
// migration is applied and `types/database.types.ts` is regenerated, this
// file (and its call sites) can be deleted in favor of the typed client.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assignmentsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from("assignments");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assignmentSubmissionsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "assignment_submissions",
  );
}
