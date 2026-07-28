import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

const BUCKET = "school-media";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function hasExpectedMagic(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  if (mimeType === "application/pdf") {
    return buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-";
  }
  return false;
}

async function stripImageMetadata(buffer: Buffer, mimeType: string) {
  const image = sharp(buffer, { failOn: "warning" }).rotate();
  if (mimeType === "image/jpeg")
    return image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  if (mimeType === "image/png")
    return image.png({ compressionLevel: 9 }).toBuffer();
  return image.webp({ quality: 90 }).toBuffer();
}

export async function POST(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (context.ok === false) return context.response;

  const limited = await enforceRateLimit(req, {
    namespace: "mobile-storage-finalize",
    windowMs: 60 * 60_000,
    maxHits: 60,
    identifier: context.value.authUserId,
    productionFailureMode: "fail-closed",
  });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const path = typeof body?.path === "string" ? body.path.trim() : "";
  const mimeType =
    typeof body?.mime_type === "string"
      ? body.mime_type.trim().toLowerCase()
      : "";
  const fileName =
    typeof body?.file_name === "string"
      ? body.file_name.trim().slice(0, 180)
      : "attachment";
  const expectedSize =
    typeof body?.size_bytes === "number"
      ? body.size_bytes
      : Number(body?.size_bytes);
  const teacherId = context.value.account.teacher?.id;
  const allowedPrefix = teacherId
    ? `${context.value.schoolId}/${teacherId}/`
    : "";

  if (
    !teacherId ||
    !path.startsWith(allowedPrefix) ||
    path.includes("..") ||
    !ALLOWED_MIME_TYPES.has(mimeType)
  ) {
    return NextResponse.json(
      { ok: false, error: "ملف الرفع غير صالح." },
      { status: 403 },
    );
  }

  const storage = context.value.serviceSupabase.storage.from(BUCKET);
  const removeRejected = async () => {
    await storage.remove([path]).catch(() => undefined);
  };

  try {
    const { data, error } = await storage.download(path);
    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "تعذر التحقق من الملف المرفوع." },
        { status: 400 },
      );
    }

    const buffer: Buffer = Buffer.from(await data.arrayBuffer());
    if (
      !Number.isInteger(expectedSize) ||
      expectedSize <= 0 ||
      expectedSize > MAX_BYTES ||
      buffer.length !== expectedSize ||
      !hasExpectedMagic(buffer, mimeType)
    ) {
      await removeRejected();
      return NextResponse.json(
        { ok: false, error: "محتوى الملف لا يطابق نوعه أو حجمه المعلن." },
        { status: 400 },
      );
    }

    let finalBuffer = buffer;
    if (mimeType.startsWith("image/")) {
      finalBuffer = await stripImageMetadata(buffer, mimeType);
      if (finalBuffer.length > MAX_BYTES) {
        await removeRejected();
        return NextResponse.json(
          { ok: false, error: "الصورة المعالجة تتجاوز حد الحجم." },
          { status: 400 },
        );
      }
      const { error: replaceError } = await storage.upload(path, finalBuffer, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      });
      if (replaceError) throw replaceError;
    }

    return NextResponse.json({
      ok: true,
      data: {
        bucket: BUCKET,
        path,
        file_name: fileName || "attachment",
        mime_type: mimeType,
        size_bytes: finalBuffer.length,
      },
    });
  } catch {
    await removeRejected();
    return NextResponse.json(
      { ok: false, error: "فشل فحص الملف أو تنظيف بياناته الوصفية." },
      { status: 400 },
    );
  }
}
