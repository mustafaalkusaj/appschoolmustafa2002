import { NextRequest, NextResponse } from "next/server";

import { loadSuperAdminOverview, resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  try {
    const overview = await loadSuperAdminOverview(context.value.dataSupabase);
    return NextResponse.json({
      ok: true,
      ...overview,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر تحميل بيانات المدير العام.",
      500,
    );
  }
}
