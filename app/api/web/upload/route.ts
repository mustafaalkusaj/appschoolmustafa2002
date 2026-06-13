import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { uploadFile, type StorageBucket } from "@/lib/storage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const schoolId = req.headers.get("x-school-id") || new URL(req.url).searchParams.get("schoolId");
  if (!schoolId) {
    return jsonError("schoolId is required.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح بالوصول." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "file-upload",
    windowMs: 60_000,
    maxHits: 20,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("Invalid multipart/form-data.", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("No file provided. Use field name 'file'.", 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(
      `File type "${file.type}" is not allowed. Accepted: ${Array.from(ALLOWED_TYPES).join(", ")}`,
      400,
    );
  }

  if (file.size > MAX_SIZE) {
    return jsonError(`File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.`, 400);
  }

  const bucket = (formData.get("bucket") as StorageBucket) || "attachments";
  if (bucket !== "avatars" && bucket !== "attachments") {
    return jsonError("Invalid bucket. Use 'avatars' or 'attachments'.", 400);
  }

  // Build a unique path: schoolId/timestamp-filename
  const ext = file.name.split(".").pop() || "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${targetSchoolId}/${safeName}`;

  try {
    const buffer = await file.arrayBuffer();
    const publicUrl = await uploadFile(actorSupabase, bucket, path, buffer, file.type);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      bucket,
      path,
      size: file.size,
      contentType: file.type,
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Upload failed.",
      500,
    );
  }
}
