import { NextRequest, NextResponse } from "next/server";

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { endOfDayBaghdad } from "@/lib/tz";

// Mirrors lib/authorization/snapshot.ts isSchoolAccessRestricted so an admin of
// an expired/suspended/inactive school cannot read finance via the mobile path.
// super_admin is exempt, matching the web behavior.
function isSchoolAccessRestrictedForMobile(input: {
  role: "admin" | "super_admin";
  isActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
}): boolean {
  if (input.role === "super_admin") {
    return false;
  }
  if (!input.isActive) {
    return true;
  }
  const status = (input.subscriptionStatus || "").toLowerCase();
  if (status === "suspended" || status === "inactive" || status === "stopped" || status === "expired") {
    return true;
  }
  if (!input.subscriptionEnd) {
    return false;
  }
  const parsed = new Date(input.subscriptionEnd);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return Date.now() > endOfDayBaghdad(parsed).getTime();
}

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

    // Subscription-expiry / school-active gate (the web path enforces this via
    // resolveSchoolScopedActorContext). Without it an admin of an expired or
    // suspended school could still read finance via mobile.
    const role = profile.role as "admin" | "super_admin";
    const [{ data: school }, { data: subscription }] = await Promise.all([
      serviceSupabase
        .from("schools")
        .select("is_active")
        .eq("id", profile.school_id)
        .maybeSingle(),
      serviceSupabase
        .from("subscriptions")
        .select("status, end_date")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const restricted = isSchoolAccessRestrictedForMobile({
      role,
      isActive: (school as { is_active?: boolean } | null)?.is_active !== false,
      subscriptionStatus: (subscription as { status?: string | null } | null)?.status ?? null,
      subscriptionEnd: (subscription as { end_date?: string | null } | null)?.end_date ?? null,
    });

    if (restricted) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "انتهى اشتراك المدرسة أو تم إيقاف الحساب." },
          { status: 403 },
        ),
      };
    }

    return {
      ok: true,
      value: {
        authUserId: userId,
        schoolId: profile.school_id,
        role,
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
