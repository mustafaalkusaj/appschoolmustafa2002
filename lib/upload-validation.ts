/**
 * Server-side upload validation for logo images.
 *
 * Validates file size, declared MIME type, and magic bytes (file signature).
 * Must be used in every upload route before passing data to Supabase storage.
 * Fixes P-2001 and P-2002: previously only client-side browser validation existed.
 */

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Magic byte signatures per MIME type.
 * Each entry is an array of possible signatures (some formats have multiple).
 */
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // "RIFF" — verified further below
};

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

export type LogoValidationResult =
  | { ok: true; mime: AllowedMime; bytes: number }
  | { ok: false; code: "EMPTY" | "TOO_LARGE" | "BAD_MIME" | "MAGIC_MISMATCH"; message: string };

/**
 * Validate a logo upload.
 *
 * @param file - File or Blob from formData.get("file")
 * @param declaredType - file.type or Content-Type header value
 * @returns LogoValidationResult — check .ok before proceeding
 */
export async function validateLogoUpload(
  file: File | Blob,
  declaredType: string | null,
): Promise<LogoValidationResult> {
  if (!file || file.size === 0) {
    return { ok: false, code: "EMPTY", message: "ملف فارغ" };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `حجم الملف يتجاوز الحد المسموح (${MAX_LOGO_BYTES / 1024 / 1024} ميجا)`,
    };
  }

  const mime = (declaredType ?? "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME.includes(mime as AllowedMime)) {
    return {
      ok: false,
      code: "BAD_MIME",
      message: "نوع الملف غير مدعوم. الأنواع المسموحة: PNG، JPEG، WEBP",
    };
  }

  // Read first 12 bytes for magic byte check
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const candidates = MAGIC_BYTES[mime];
  const signatureMatches = candidates.some((sig) => sig.every((byte, i) => head[i] === byte));

  if (!signatureMatches) {
    return {
      ok: false,
      code: "MAGIC_MISMATCH",
      message: "محتوى الملف لا يطابق النوع المُعلن",
    };
  }

  // WEBP: verify "WEBP" marker at offset 8 (after "RIFF" at 0)
  if (mime === "image/webp") {
    const webpMarker = String.fromCharCode(head[8], head[9], head[10], head[11]);
    if (webpMarker !== "WEBP") {
      return {
        ok: false,
        code: "MAGIC_MISMATCH",
        message: "ملف WEBP غير صالح",
      };
    }
  }

  return { ok: true, mime: mime as AllowedMime, bytes: file.size };
}

/**
 * Sanitize a filename for use as a Supabase storage path segment.
 * Prevents path traversal and removes unicode that could cause issues.
 */
export function sanitizeStorageFilename(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
}
