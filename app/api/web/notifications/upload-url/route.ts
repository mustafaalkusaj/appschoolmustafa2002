import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sanitizeStorageFilename } from "@/lib/upload-validation";

const ENDPOINT = "GET /api/web/notifications/upload-url";
const BUCKET = "notification-media";

const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export async function GET(request: NextRequest) {
  const { auth, response } = requireAuth(request, ENDPOINT);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const filename    = searchParams.get("filename") ?? "video";
  const contentType = searchParams.get("contentType") ?? "";
  // School isolation: storage path must use the authenticated user's schoolId
  const schoolId = auth.schoolId;

  if (!ALLOWED_VIDEO_MIME.includes(contentType as (typeof ALLOWED_VIDEO_MIME)[number])) {
    return NextResponse.json(
      { ok: false, error: "نوع الملف غير مدعوم للرفع المباشر" },
      { status: 415 },
    );
  }

  const safeName   = sanitizeStorageFilename(filename) || `video_${Date.now()}`;
  const objectPath = `${schoolId}/${Date.now()}_${safeName}`;

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "تعذر إنشاء رابط الرفع" },
      { status: 500 },
    );
  }

  const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  return NextResponse.json({
    ok: true,
    signedUrl: data.signedUrl,
    publicUrl: pubData.publicUrl,
    path: objectPath,
  });
}
