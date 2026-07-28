import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

const BUCKET = "school-media";

export async function DELETE(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const bucket = typeof body?.bucket === "string" ? body.bucket.trim() : "";
    const path = typeof body?.path === "string" ? body.path.trim() : "";
    const teacherId = context.value.account.teacher?.id;
    const requiredPrefix = `${context.value.schoolId}/${teacherId}/`;

    if (
      !teacherId ||
      bucket !== BUCKET ||
      !path.startsWith(requiredPrefix) ||
      path.includes("..")
    ) {
      return NextResponse.json(
        { ok: false, error: "لا تملك صلاحية حذف هذا الملف." },
        { status: 403 },
      );
    }

    const { error } = await context.value.serviceSupabase.storage
      .from(BUCKET)
      .remove([path]);
    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر حذف الملف." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
