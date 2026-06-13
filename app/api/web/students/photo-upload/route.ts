import { NextRequest, NextResponse } from "next/server";
import { validateLogoUpload } from "@/lib/upload-validation";
import { uploadLogoToStorage } from "@/lib/logo-upload-server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";

export async function POST(req: NextRequest) {
  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  if (!session?.userActive) {
    return NextResponse.json({ error: { message: "يجب تسجيل الدخول أولاً." } }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: { message: "البيانات المرسلة غير صالحة." } }, { status: 400 });
  }

  const file = formData.get("file");
  const schoolId = typeof formData.get("schoolId") === "string" ? String(formData.get("schoolId")) : null;

  if (!schoolId) {
    return NextResponse.json({ error: { message: "معرف المدرسة مطلوب." } }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { message: "الملف مطلوب." } }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية رفع صور الطلاب." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return NextResponse.json(
      { error: { message: "message" in context ? context.message : "خطأ في التحقق." } },
      { status: "status" in context ? context.status : 500 },
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "student-photo-upload",
    windowMs: 60_000,
    maxHits: 30,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const validation = await validateLogoUpload(file, file.type as "image/jpeg" | "image/png" | "image/webp");
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.message } }, { status: 400 });
  }

  try {
    const url = await uploadLogoToStorage({
      bucket: "student-photos",
      file,
      mime: validation.mime,
      objectPrefix: "student",
      schoolScope: schoolId,
    });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "تعذر رفع الصورة." } },
      { status: 500 },
    );
  }
}
