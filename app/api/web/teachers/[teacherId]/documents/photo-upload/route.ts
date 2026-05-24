import { NextRequest, NextResponse } from "next/server";
import { createStorageSignedUploadUrl } from "@/lib/logo-upload-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIMES)[number];

function isAllowedMime(v: unknown): v is AllowedMime {
  return ALLOWED_MIMES.includes(v as AllowedMime);
}

/**
 * POST — returns a presigned upload URL so the client uploads directly to
 * Supabase Storage. No file bytes travel through this server.
 *
 * Body: { schoolId: string, mimeType: string, fileSizeBytes: number }
 * Response: { signedUrl: string, publicUrl: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;

  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  if (!session?.userActive) {
    return NextResponse.json({ error: { message: "يجب تسجيل الدخول أولاً." } }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : null;
  const mimeType = isAllowedMime(body?.mimeType) ? body.mimeType : null;
  const fileSizeBytes = typeof body?.fileSizeBytes === "number" ? body.fileSizeBytes : null;

  if (!schoolId) {
    return NextResponse.json({ error: { message: "معرف المدرسة مطلوب." } }, { status: 400 });
  }
  if (!mimeType) {
    return NextResponse.json({ error: { message: "نوع الملف غير مدعوم. استخدم JPEG أو PNG أو WebP." } }, { status: 400 });
  }
  if (fileSizeBytes !== null && fileSizeBytes > 10 * 1024 * 1024) {
    return NextResponse.json({ error: { message: "حجم الصورة يتجاوز الحد المسموح به (10 MB)." } }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "رفع صور الوثائق متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return NextResponse.json(
      { error: { message: "message" in context ? context.message : "خطأ في التحقق." } },
      { status: "status" in context ? context.status : 500 },
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "teacher-doc-photo-upload",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { signedUrl, publicUrl } = await createStorageSignedUploadUrl({
      bucket: "teacher-documents",
      objectPrefix: `doc_${teacherId}`,
      schoolScope: schoolId,
      mime: mimeType,
    });
    return NextResponse.json({ signedUrl, publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "تعذر إنشاء رابط الرفع." } },
      { status: 500 },
    );
  }
}
