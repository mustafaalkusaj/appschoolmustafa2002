import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sanitizeStorageFilename } from "@/lib/upload-validation";

const DEFAULT_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

type SignedUploadUrlInput = {
  bucket: "teacher-documents";
  objectPrefix: string;
  schoolScope: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
};

/**
 * Generates a presigned upload URL so the client can upload directly to
 * Supabase Storage — no server relay for the file bytes.
 * Returns { signedUrl, publicUrl } where publicUrl is the final CDN URL.
 */
export async function createStorageSignedUploadUrl({
  bucket,
  objectPrefix,
  schoolScope,
  mime,
}: SignedUploadUrlInput): Promise<{ signedUrl: string; publicUrl: string }> {
  const serviceSupabase = createServiceSupabaseClient();
  const ext = DEFAULT_EXTENSION_BY_MIME[mime] ?? "webp";
  const objectPath = `${schoolScope}/${objectPrefix}_${Date.now()}.${ext}`;

  const { data, error } = await serviceSupabase.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "تعذر إنشاء رابط الرفع.");
  }

  const { data: publicData } = serviceSupabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!publicData?.publicUrl) {
    throw new Error("تعذر إنشاء رابط الصورة.");
  }

  return { signedUrl: data.signedUrl, publicUrl: publicData.publicUrl };
}

type UploadLogoInput = {
  bucket: "school-logos" | "branch-logos" | "student-photos" | "teacher-documents" | "grade-certificates";
  file: File;
  mime: "image/jpeg" | "image/png" | "image/webp";
  objectPrefix: string;
  schoolScope: string;
};

export async function uploadLogoToStorage({
  bucket,
  file,
  mime,
  objectPrefix,
  schoolScope,
}: UploadLogoInput): Promise<string> {
  const serviceSupabase = createServiceSupabaseClient();
  const safeName = sanitizeStorageFilename(file.name) || `${objectPrefix}.${DEFAULT_EXTENSION_BY_MIME[mime]}`;
  const hasExtension = /\.[A-Za-z0-9]+$/.test(safeName);
  const finalName = hasExtension ? safeName : `${safeName}.${DEFAULT_EXTENSION_BY_MIME[mime]}`;
  const objectPath = `${schoolScope}/${objectPrefix}_${Date.now()}_${finalName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await serviceSupabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      upsert: true,
      contentType: mime,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "تعذر رفع الصورة.");
  }

  const { data } = serviceSupabase.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error("تعذر إنشاء رابط الصورة بعد الرفع.");
  }

  return data.publicUrl;
}
