import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { sanitizeStorageFilename } from "@/lib/upload-validation";

const BUCKET = "notification-media";

const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية رفع الملفات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const { searchParams } = new URL(request.url);
  const filename    = searchParams.get("filename") ?? "video";
  const contentType = searchParams.get("contentType") ?? "";

  if (!ALLOWED_VIDEO_MIME.includes(contentType as (typeof ALLOWED_VIDEO_MIME)[number])) {
    return NextResponse.json(
      { ok: false, error: "نوع الملف غير مدعوم للرفع المباشر" },
      { status: 415 },
    );
  }

  const safeName   = sanitizeStorageFilename(filename) || `video_${Date.now()}`;
  const objectPath = `${targetSchoolId}/${Date.now()}_${safeName}`;

  const { data, error } = await actorSupabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "تعذر إنشاء رابط الرفع" },
      { status: 500 },
    );
  }

  const { data: pubData } = actorSupabase.storage.from(BUCKET).getPublicUrl(objectPath);

  return NextResponse.json({
    ok: true,
    signedUrl: data.signedUrl,
    publicUrl: pubData.publicUrl,
    path: objectPath,
  });
}
