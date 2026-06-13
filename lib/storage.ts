/**
 * Supabase Storage helper for file uploads.
 * Buckets: 'avatars' (student/teacher photos), 'attachments' (assignments, materials)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type StorageBucket = "avatars" | "attachments" | "exam-photos";

const BUCKET_CONFIG: Record<StorageBucket, { public: boolean }> = {
  avatars: { public: true },
  attachments: { public: true },
  "exam-photos": { public: true },
};

/**
 * Ensure a storage bucket exists. Creates it if missing.
 * Safe to call multiple times — idempotent.
 */
export async function ensureBucket(
  supabase: SupabaseClient,
  bucket: StorageBucket,
): Promise<void> {
  const config = BUCKET_CONFIG[bucket];
  const { error } = await supabase.storage.createBucket(bucket, {
    public: config.public,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  });
  // "already exists" is fine
  if (error && !error.message?.includes("already exists")) {
    throw new Error(`Failed to create bucket "${bucket}": ${error.message}`);
  }
}

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL on success.
 */
export async function uploadFile(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
  file: Blob | Buffer | ArrayBuffer,
  contentType: string,
): Promise<string> {
  await ensureBucket(supabase, bucket);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return getPublicUrl(supabase, bucket, path);
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get the public URL for a file in a public bucket.
 */
export function getPublicUrl(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
