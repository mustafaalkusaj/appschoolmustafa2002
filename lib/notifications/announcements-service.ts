// ============================================================
// خدمة الإعلانات
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnnouncementListItem, CreateAnnouncementInput } from "./types";

// ----------------------------------------------------------------
// إنشاء إعلان جديد
// ----------------------------------------------------------------
export async function createAnnouncement(
  supabase: SupabaseClient,
  input: CreateAnnouncementInput,
): Promise<{ ok: true; item: AnnouncementListItem } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("school_announcements")
    .insert({
      school_id: input.schoolId,
      branch_id: input.branchId ?? null,
      title: input.title,
      body: input.body,
      media_url: input.mediaUrl ?? null,
      media_type: input.mediaType ?? null,
      is_pinned: input.isPinned ?? false,
      expires_at: input.expiresAt ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create announcement" };
  }

  return { ok: true, item: mapRow(data) };
}

// ----------------------------------------------------------------
// قائمة الإعلانات
// ----------------------------------------------------------------
export async function listAnnouncements(
  supabase: SupabaseClient,
  schoolId: string,
  opts: { branchId?: string; page?: number; pageSize?: number } = {},
): Promise<{ items: AnnouncementListItem[]; totalCount: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, opts.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const now = new Date().toISOString();

  let query = supabase
    .from("school_announcements")
    .select("*", { count: "exact" })
    .eq("school_id", schoolId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (opts.branchId) {
    query = query.eq("branch_id", opts.branchId);
  }

  const { data, count, error } = await query;
  if (error || !data) return { items: [], totalCount: 0 };

  return { items: data.map(mapRow), totalCount: count ?? 0 };
}

// ----------------------------------------------------------------
// تثبيت / إلغاء تثبيت إعلان
// ----------------------------------------------------------------
export async function pinAnnouncement(
  supabase: SupabaseClient,
  id: string,
  schoolId: string,
  pinned: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("school_announcements")
    .update({ is_pinned: pinned })
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----------------------------------------------------------------
// حذف إعلان
// ----------------------------------------------------------------
export async function deleteAnnouncement(
  supabase: SupabaseClient,
  id: string,
  schoolId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("school_announcements")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----------------------------------------------------------------
// تعديل إعلان
// ----------------------------------------------------------------
export async function updateAnnouncement(
  supabase: SupabaseClient,
  id: string,
  schoolId: string,
  patch: {
    title?: string;
    body?: string;
    isPinned?: boolean;
    mediaUrl?: string | null;
    mediaType?: string | null;
    expiresAt?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const update: Record<string, unknown> = {};
  if (patch.title     !== undefined) update.title      = patch.title;
  if (patch.body      !== undefined) update.body       = patch.body;
  if (patch.isPinned  !== undefined) update.is_pinned  = patch.isPinned;
  if (patch.mediaUrl  !== undefined) update.media_url  = patch.mediaUrl;
  if (patch.mediaType !== undefined) update.media_type = patch.mediaType;
  if (patch.expiresAt !== undefined) update.expires_at = patch.expiresAt;

  const { error } = await supabase
    .from("school_announcements")
    .update(update)
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ----------------------------------------------------------------
// تحويل صف قاعدة البيانات
// ----------------------------------------------------------------
function mapRow(row: any): AnnouncementListItem {
  return {
    id: row.id,
    schoolId: row.school_id,
    branchId: row.branch_id,
    title: row.title,
    body: row.body,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    isPinned: row.is_pinned,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}
