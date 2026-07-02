import type { SupabaseClient } from "@supabase/supabase-js";

const NOT_IMPL = { ok: false as const, error: "Not implemented yet" };

export async function listAnnouncements(
  _supabase: SupabaseClient,
  _schoolId: string,
  _opts: { branchId?: string; page: number; pageSize: number },
) {
  return { items: [] as unknown[], total: 0 };
}

export async function createAnnouncement(
  _supabase: SupabaseClient,
  _input: Record<string, unknown>,
) {
  return NOT_IMPL;
}

export async function updateAnnouncement(
  _supabase: SupabaseClient,
  _id: string,
  _schoolId: string,
  _updates: Record<string, unknown>,
) {
  return NOT_IMPL;
}

export async function deleteAnnouncement(
  _supabase: SupabaseClient,
  _id: string,
  _schoolId: string,
) {
  return NOT_IMPL;
}
