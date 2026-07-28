import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

const BUCKET = "school-media";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set([
  "assignments",
  "notifications",
  "exam-materials",
]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function safeFileName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return normalized.slice(0, 120) || "attachment";
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-storage-upload-url",
      windowMs: 60 * 60_000,
      maxHits: 60,
      identifier: context.value.authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const folder = typeof body?.folder === "string" ? body.folder.trim() : "";
    const fileName =
      typeof body?.file_name === "string" ? body.file_name.trim() : "";
    const mimeType =
      typeof body?.mime_type === "string"
        ? body.mime_type.trim().toLowerCase()
        : "";
    const sizeBytes =
      typeof body?.size_bytes === "number"
        ? body.size_bytes
        : Number(body?.size_bytes);

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { ok: false, error: "مجلد الرفع غير مسموح." },
        { status: 400 },
      );
    }
    if (!fileName || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: "نوع الملف غير مسموح. استخدم صورة أو PDF." },
        { status: 400 },
      );
    }
    if (
      !Number.isInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > MAX_BYTES
    ) {
      return NextResponse.json(
        { ok: false, error: "حجم الملف غير صالح أو يتجاوز 20 م.ب." },
        { status: 400 },
      );
    }

    const teacherId = context.value.account.teacher?.id;
    if (!teacherId) {
      return NextResponse.json(
        { ok: false, error: "حساب المعلم غير مرتبط بسجل صالح." },
        { status: 403 },
      );
    }

    const sanitizedName = safeFileName(fileName);
    const path = `${context.value.schoolId}/${teacherId}/${folder}/${randomUUID()}-${sanitizedName}`;
    const { data, error } = await context.value.serviceSupabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: "تعذر إنشاء رابط رفع آمن." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        bucket: BUCKET,
        path,
        file_name: fileName.slice(0, 180),
        mime_type: mimeType,
        size_bytes: sizeBytes,
        signed_url: data.signedUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
