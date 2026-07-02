import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchGradeSchemes(
  _supabase: SupabaseClient,
  _schoolId: string,
) {
  return { gradeTypes: [] as unknown[] };
}
