import { NextRequest, NextResponse } from "next/server";

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

export interface SuperAdminMobileRouteContext {
  authUserId: string;
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>;
}

export async function resolveSuperAdminMobileRouteContext(
  req: NextRequest,
): Promise<{ ok: true; value: SuperAdminMobileRouteContext } | { ok: false; response: NextResponse }> {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return {
        ok: false,
        response: NextResponse.json({ ok: false, error: "يجب تسجيل الدخول أولاً." }, { status: 401 }),
      };
    }

    const userId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from("managed_user_profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (profileError) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "تعذر التحقق من الصلاحيات." },
          { status: 500 },
        ),
      };
    }

    if (!profile || profile.role !== "super_admin") {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "هذا الحساب لا يملك صلاحية الوصول." },
          { status: 403 },
        ),
      };
    }

    return {
      ok: true,
      value: {
        authUserId: userId,
        serviceSupabase,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 }),
    };
  }
}
