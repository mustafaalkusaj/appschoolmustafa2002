import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Issues a short-lived signed upload URL so a student can attach a file to an
 * assignment submission.
 *
 * `school-media` is a private bucket with no INSERT policy, so a direct
 * client-side upload with the anon key is rejected by storage RLS. Uploads go
 * through a service-role-signed URL instead — the same pattern the teacher
 * route uses. The student never gets write access to the bucket itself.
 */

const BUCKET = "school-media";
const MAX_BYTES = 20 * 1024 * 1024;
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
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) return context.response;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-student-upload-url",
      windowMs: 60 * 60_000,
      maxHits: 60,
      identifier: context.value.authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const assignmentId =
      typeof body?.assignment_id === "string" ? body.assignment_id.trim() : "";
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

    if (!assignmentId) {
      return NextResponse.json(
        { ok: false, error: "الواجب غير محدد." },
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

    const studentId = context.value.account.student?.id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "حساب الطالب غير مرتبط بسجل صالح." },
        { status: 403 },
      );
    }

    // Only allow uploads against an assignment inside the student's school.
    const { data: assignment } = await context.value.serviceSupabase
      .from("assignments")
      .select("id")
      .eq("id", assignmentId)
      .eq("school_id", context.value.schoolId)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { ok: false, error: "الواجب غير موجود." },
        { status: 404 },
      );
    }

    const sanitizedName = safeFileName(fileName);
    const path = `${context.value.schoolId}/${studentId}/assignments/${assignmentId}/${randomUUID()}-${sanitizedName}`;
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
