import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { sanitizeStorageFilename } from "@/lib/upload-validation";

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"] as const;
const ALLOWED_PDF_MIME   = ["application/pdf"] as const;
const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME, ...ALLOWED_PDF_MIME];

const MAX_IMAGE_BYTES = 5  * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_PDF_BYTES   = 20 * 1024 * 1024; // 20 MB

const BUCKET = "notification-media";

// M3: Magic-byte signatures for common file types
const MAGIC_BYTES: Array<{ mime: string[]; signature: number[] }> = [
  { mime: ["image/png"],        signature: [0x89, 0x50, 0x4E, 0x47] }, // PNG: 89504E47
  { mime: ["image/jpeg"],       signature: [0xFF, 0xD8, 0xFF] },       // JPEG: FFD8FF
  { mime: ["application/pdf"],  signature: [0x25, 0x50, 0x44, 0x46] }, // PDF: 25504446
  { mime: ["image/gif"],        signature: [0x47, 0x49, 0x46] },       // GIF: 474946
  { mime: ["image/webp"],       signature: [0x52, 0x49, 0x46, 0x46] }, // WEBP: RIFF (partial — full check needs bytes 8-11 = WEBP)
];

function validateMagicBytes(bytes: Uint8Array, declaredMime: string): boolean {
  // Only validate types we have signatures for; allow others through
  const matchingRule = MAGIC_BYTES.find((rule) => rule.mime.includes(declaredMime));
  if (!matchingRule) return true; // No rule for this MIME — skip validation

  if (bytes.length < matchingRule.signature.length) return false;

  for (let i = 0; i < matchingRule.signature.length; i++) {
    if (bytes[i] !== matchingRule.signature[i]) return false;
  }

  // Extra check for WEBP: bytes 8-11 must be "WEBP"
  if (declaredMime === "image/webp" && bytes.length >= 12) {
    const webpTag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (webpTag !== "WEBP") return false;
  }

  return true;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية رفع الملفات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const schoolId = (formData.get("schoolId") as string | null) ?? targetSchoolId;

  if (!file || file.size === 0) {
    return NextResponse.json({ ok: false, error: "ملف مطلوب" }, { status: 400 });
  }

  const mime = file.type.toLowerCase().split(";")[0].trim();

  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    return NextResponse.json(
      { ok: false, error: "نوع الملف غير مدعوم. الأنواع المسموحة: صور (JPEG/PNG/WEBP/GIF)، فيديو (MP4/WEBM)، أو PDF" },
      { status: 415 },
    );
  }

  const isVideo = ALLOWED_VIDEO_MIME.includes(mime as (typeof ALLOWED_VIDEO_MIME)[number]);
  const isPdf   = ALLOWED_PDF_MIME.includes(mime as (typeof ALLOWED_PDF_MIME)[number]);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;

  if (file.size > maxBytes) {
    const limitMB = maxBytes / 1024 / 1024;
    return NextResponse.json(
      { ok: false, error: `حجم الملف يتجاوز الحد (${limitMB} ميجا)` },
      { status: 413 },
    );
  }

  const safeName = sanitizeStorageFilename(file.name) || `upload_${Date.now()}`;
  const objectPath = `${schoolId}/${Date.now()}_${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // M3: Validate magic bytes match declared MIME type
  if (!validateMagicBytes(bytes, mime)) {
    return NextResponse.json(
      { ok: false, error: "محتوى الملف لا يتطابق مع النوع المعلن. تأكد من أن الملف صالح." },
      { status: 415 },
    );
  }

  const { error: uploadError } = await actorSupabase.storage
    .from(BUCKET)
    .upload(objectPath, bytes, { upsert: false, contentType: mime });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  const { data } = actorSupabase.storage.from(BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    return NextResponse.json({ ok: false, error: "تعذر إنشاء رابط الملف" }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, url: data.publicUrl, mime, isVideo, isPdf },
    { status: 201 },
  );
}
