import { NextRequest, NextResponse } from "next/server";

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

export interface AdminMobileRouteContext {
  authUserId: string;
  schoolId: string;
  role: "admin" | "super_admin";
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>;
}

export async function resolveAdminMobileRouteContext(
  req: NextRequest,
): Promise<{ ok: true; value: AdminMobileRouteContext } | { ok: false; response: NextResponse }> {
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
      .select("school_id, role")
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

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "هذا الحساب لا يملك صلاحية الوصول." },
          { status: 403 },
        ),
      };
    }

    if (!profile.school_id) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "لم يتم ربط الحساب بمدرسة." },
          { status: 403 },
        ),
      };
    }

    return {
      ok: true,
      value: {
        authUserId: userId,
        schoolId: profile.school_id,
        role: profile.role as "admin" | "super_admin",
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
