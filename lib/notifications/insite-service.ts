import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNotificationInput } from "./types";

export async function createInsiteNotification(
  _supabase: SupabaseClient,
  _input: CreateNotificationInput,
) {
  return { ok: false as const, error: "Not implemented yet" };
}

export async function getUnreadCount(
  _supabase: SupabaseClient,
  _userId: string,
) {
  return 0;
}
