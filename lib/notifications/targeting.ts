import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTargetUsers(
  _supabase: SupabaseClient,
  _schoolId: string,
  _opts: { roles?: string[]; userIds?: string[] },
) {
  return [] as Array<{ id: string; push_token?: string }>;
}
