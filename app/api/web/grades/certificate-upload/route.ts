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
    return NextResponse.json({ error: { message: "البيانات غير صالحة." } }, { status: 400 });
  }

  const file = formData.get("file");
  const schoolId = typeof formData.get("schoolId") === "string" ? String(formData.get("schoolId")) : null;

  if (!schoolId) return NextResponse.json({ error: { message: "schoolId مطلوب." } }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: { message: "الملف مطلوب." } }, { status: 400 });

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "ليس لديك صلاحية رفع الشهادات." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return NextResponse.json(
      { error: { message: "message" in context ? context.message : "خطأ في التحقق." } },
      { status: "status" in context ? context.status : 500 },
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "grade-certificate-upload",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const validation = await validateLogoUpload(file, file.type as "image/jpeg" | "image/png" | "image/webp");
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.message } }, { status: 400 });
  }

  try {
    const url = await uploadLogoToStorage({
      bucket: "grade-certificates",
      file,
      mime: validation.mime,
      objectPrefix: `cert-${schoolId}`,
      schoolScope: schoolId,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "تعذر رفع الملف." } },
      { status: 500 },
    );
  }
}
