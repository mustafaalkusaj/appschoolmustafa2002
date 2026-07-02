import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import type { ManagedUserRole } from "@/lib/managed-users";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

export type MobileAnyRole =
  | ManagedUserRole
  | "admin"
  | "parent"
  | "super_admin";

export interface MobileAdminRouteContext {
  authUserId: string;
  role: MobileAnyRole;
  schoolId: string;
  branchId: string | null;
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>;
}

export interface MobileFeatureGate {
  available: boolean;
  code?: "missing_table" | "forbidden" | "unknown";
  message?: string;
}

export const AVAILABLE_GATE: MobileFeatureGate = { available: true };

function readErr(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export function featureGateFromError(
  error: unknown,
  table: string,
): MobileFeatureGate {
  if (isMissingTableError(error, table)) {
    return {
      available: false,
      code: "missing_table",
      message: `جدول ${table} غير موجود بعد في قاعدة البيانات.`,
    };
  }
  const msg = readErr(error, "").toLowerCase();
  if (msg.includes("permission") || msg.includes("unauthorized")) {
    return {
      available: false,
      code: "forbidden",
      message: `لا توجد صلاحية كافية للوصول إلى ${table}.`,
    };
  }
  return {
    available: false,
    code: "unknown",
    message: readErr(error, `خطأ غير متوقع في ${table}.`),
  };
}

export function parseMobileListParams(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 25),
  );
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: (url.searchParams.get("search") ?? "").trim(),
  };
}

export async function resolveMobileRouteContextAny(
  req: NextRequest,
  expectedRole?: MobileAnyRole,
): Promise<
  | { ok: true; value: MobileAdminRouteContext }
  | { ok: false; response: NextResponse }
> {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return { ok: false, response: jsonError("يجب تسجيل الدخول أولاً.", 401) };
    }

    const authUserId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    let role: string | null = null;
    let schoolId: string | null = null;
    let branchId: string | null = null;

    const { data: profile, error: profileError } = await serviceSupabase
      .from("managed_user_profiles")
      .select("school_id, role, branch_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!profileError && profile) {
      role =
        typeof profile.role === "string" ? profile.role.trim() : null;
      schoolId =
        typeof profile.school_id === "string"
          ? profile.school_id.trim()
          : null;
      branchId =
        typeof profile.branch_id === "string"
          ? profile.branch_id.trim()
          : null;
    }

    if (!role || !schoolId) {
      const { data: legacy } = await serviceSupabase
        .from("user_profiles")
        .select("school_id, role, branch_id")
        .eq("id", authUserId)
        .maybeSingle();

      if (legacy) {
        role ||=
          typeof legacy.role === "string" ? legacy.role.trim() : null;
        schoolId ||=
          typeof legacy.school_id === "string"
            ? legacy.school_id.trim()
            : null;
        branchId ||=
          typeof legacy.branch_id === "string"
            ? legacy.branch_id.trim()
            : null;
      }
    }

    if (!role || !schoolId) {
      return {
        ok: false,
        response: jsonError("لا يوجد حساب مُدار صالح.", 403),
      };
    }

    if (expectedRole && role !== expectedRole) {
      return {
        ok: false,
        response: jsonError(
          "هذا الحساب لا يملك صلاحية استخدام هذا المسار.",
          403,
        ),
      };
    }

    return {
      ok: true,
      value: {
        authUserId,
        role: role as MobileAnyRole,
        schoolId,
        branchId: branchId || null,
        serviceSupabase,
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: jsonError(
        readErr(error, "تعذر التحقق من جلسة تطبيق الموبايل."),
        500,
      ),
    };
  }
}
