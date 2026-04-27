import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { uploadLogoToStorage } from "@/lib/logo-upload-server";
import { validateLogoUpload } from "@/lib/upload-validation";

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: { code: code ?? "UPLOAD_FAILED", message } },
    { status },
  );
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const schoolId = typeof formData?.get("school_id") === "string" ? String(formData.get("school_id")).trim() : "";

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "رفع شعار الفرع متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(context.message, context.status, "UNAUTHORIZED");
  }

  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return jsonError("لا يوجد ملف.", 400, "NO_FILE");
  }

  const validation = await validateLogoUpload(file, file.type);
  if (!validation.ok) {
    return jsonError(validation.message, 400, validation.code);
  }

  try {
    const url = await uploadLogoToStorage({
      bucket: "branch-logos",
      file,
      mime: validation.mime,
      objectPrefix: "branch_logo",
      schoolScope: context.value.targetSchoolId,
    });

    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر رفع شعار الفرع.",
      500,
    );
  }
}
