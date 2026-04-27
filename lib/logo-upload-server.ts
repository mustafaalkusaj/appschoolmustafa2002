import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sanitizeStorageFilename } from "@/lib/upload-validation";

const DEFAULT_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadLogoInput = {
  bucket: "school-logos" | "branch-logos";
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
