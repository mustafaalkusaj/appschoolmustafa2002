import type { SupabaseClient } from "@supabase/supabase-js";

export interface GradeAnalyticsFilter {
  academicYear: string;
  semester: 1 | 2;
  classId?: string;
}

export interface GradeLockFilter {
  classId: string;
  subjectId: string;
  academicYear: string;
  semester: 1 | 2;
}

interface SectionFilter {
  classId?: string;
  academicYear: string;
  semester: 1 | 2;
  status?: string;
  studentIds?: string[];
}

const NOT_IMPL = { ok: false as const, error: "Not implemented yet" };

export async function fetchGradeAnalytics(
  _supabase: SupabaseClient,
  _schoolId: string,
  _filter: GradeAnalyticsFilter,
  _branchStudentIds?: string[],
) {
  return { ok: true as const, data: [] as Array<{ subjectId: string; subjectName: string; avgPercentage: number; totalStudents: number; passingCount: number; failingCount: number; passRate: number }> };
}

export async function fetchGradeEntriesForSection(
  _supabase: SupabaseClient,
  _schoolId: string,
  _filter: SectionFilter,
) {
  return { ok: true as const, items: [] as unknown[] };
}

export async function fetchStudentGradeHistory(
  _supabase: SupabaseClient,
  _schoolId: string,
  _studentId: string,
  _opts?: Record<string, unknown>,
) {
  return { ok: true as const, items: [] as unknown[] };
}

export async function upsertGradeEntry(
  _supabase: SupabaseClient,
  _schoolId: string,
  _input: unknown,
) {
  return NOT_IMPL;
}

export async function confirmGradeEntries(
  _supabase: SupabaseClient,
  _schoolId: string,
  _filter: unknown,
) {
  return NOT_IMPL;
}

export async function lockGradeSection(
  _supabase: SupabaseClient,
  _schoolId: string,
  _filter: GradeLockFilter,
) {
  return NOT_IMPL;
}
