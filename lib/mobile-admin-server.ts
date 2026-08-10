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
  if (
    status === "suspended" ||
    status === "inactive" ||
    status === "stopped" ||
    status === "expired"
  ) {
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

/**
 * Server-side logging for a failed admin mobile route.
 *
 * Postgres errors surfaced through PostgREST carry `code` / `message` /
 * `details` / `hint`; a bare `catch` that returns a generic 500 hides exactly
 * the information needed to diagnose constraint violations (e.g. 23502 NOT
 * NULL). Log them here, never in the client-facing response body.
 */
export function logAdminMobileRouteError(scope: string, error: unknown): void {
  const pgError = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  } | null;

  console.error(`[mobile-admin] ${scope} failed`, {
    code: pgError?.code ?? null,
    message: pgError?.message ?? String(error),
    details: pgError?.details ?? null,
    hint: pgError?.hint ?? null,
  });
}

export interface AdminMobileRouteContext {
  authUserId: string;
  schoolId: string;
  /**
   * Branch the admin writes into. `students.branch_id` / `teachers.branch_id`
   * are NOT NULL with no default, so every create path needs a resolved value.
   */
  branchId: string;
  role: "admin" | "super_admin";
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>;
}

/**
 * Resolve the branch a mobile admin writes into.
 *
 * Order: the branch stored on the profile → the school's main branch
 * (`is_main = true`) → the school's oldest branch. Returns null when the
 * school has no branch at all, so the caller can reject instead of inserting
 * a NULL into a NOT NULL column.
 */
async function resolveAdminBranchId(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  schoolId: string,
  profileBranchId: string | null,
): Promise<string | null> {
  if (profileBranchId) {
    return profileBranchId;
  }

  const { data: mainBranch } = await serviceSupabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .eq("is_main", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (mainBranch?.id) {
    return mainBranch.id;
  }

  const { data: oldestBranch } = await serviceSupabase
    .from("branches")
    .select("id")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return oldestBranch?.id ?? null;
}

export async function resolveAdminMobileRouteContext(
  req: NextRequest,
): Promise<
  | { ok: true; value: AdminMobileRouteContext }
  | { ok: false; response: NextResponse }
> {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "يجب تسجيل الدخول أولاً." },
          { status: 401 },
        ),
      };
    }

    const userId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from("managed_user_profiles")
      .select("school_id, role, branch_id, is_active")
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

    if (
      !profile ||
      (profile.role !== "admin" && profile.role !== "super_admin")
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "هذا الحساب لا يملك صلاحية الوصول." },
          { status: 403 },
        ),
      };
    }

    // A deactivated admin/super_admin still holds a valid Supabase session, and
    // every query below runs on the service-role client (RLS bypassed), so the
    // current_app_role() is_active filter is no backstop here. Gate explicitly.
    if ((profile as { is_active?: boolean }).is_active === false) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "تم إيقاف هذا الحساب." },
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
      subscriptionStatus:
        (subscription as { status?: string | null } | null)?.status ?? null,
      subscriptionEnd:
        (subscription as { end_date?: string | null } | null)?.end_date ?? null,
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

    const branchId = await resolveAdminBranchId(
      serviceSupabase,
      profile.school_id,
      profile.branch_id ?? null,
    );

    if (!branchId) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error:
              "لا يوجد فرع مُعرَّف لهذه المدرسة. يرجى إنشاء فرع رئيسي من لوحة التحكم قبل إضافة البيانات.",
          },
          { status: 400 },
        ),
      };
    }

    return {
      ok: true,
      value: {
        authUserId: userId,
        schoolId: profile.school_id,
        branchId,
        role,
        serviceSupabase,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "internal_error" },
        { status: 500 },
      ),
    };
  }
}
