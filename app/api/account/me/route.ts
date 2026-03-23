import { NextRequest, NextResponse } from "next/server";

import { buildManagedAppAccountContext } from "@/lib/managed-user-app-context";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(routeSupabase, req.headers.get("authorization"));

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const account = await buildManagedAppAccountContext(authResult.data.user.id);
    if (!account.identity.role) {
      return jsonError("الحساب الحالي ليس حساب طالب أو مدرس جاهزاً للتطبيق.", 403);
    }

    return NextResponse.json({
      ok: true,
      account,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل سياق الحساب الحالي.", 500);
  }
}
