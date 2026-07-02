import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchGradeTypes(
  _supabase: SupabaseClient,
  _schoolId: string,
) {
  return { ok: true as const, items: [] as unknown[] };
}

export async function upsertGradeType(
  _supabase: SupabaseClient,
  _schoolId: string,
  _input: unknown,
) {
  return { ok: false as const, error: "Not implemented yet" };
}
