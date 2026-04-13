import { isMissingTableError } from "@/lib/admin-infrastructure";
import { cookies } from "next/headers";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import {
  createRouteSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { resolveKnownUserRole, type UserRole } from "@/types/roles";
import type {
  ManagedUsersActorContext,
  SchoolScopedActorContext,
} from "./types";

// Check if school subscription is expired
function isSchoolSubscriptionExpired(endDate: string | null | undefined) {
  if (!endDate) return false;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(23, 59, 59, 999);
  return Date.now() > parsed.getTime();
}

async function readValidatedRbacSession(authHeader?: string | null) {
  if (authHeader?.trim()) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RBAC_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return verifyRBACSession(token);
  } catch {
    return null;
  }
}

// Resolve school-scoped actor context
export async function resolveSchoolScopedActorContext(
  requestedSchoolId: string | null | undefined,
  options: {
    allowedRoles: UserRole[];
    roleDeniedMessage: string;
  },
  authHeader?: string | null,
): Promise<
  | { ok: true; value: SchoolScopedActorContext }
  | { ok: false; status: number; message: string }
> {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: actorUserError,
  } = await getRouteAuthenticatedUser(actorSupabase, authHeader);

  if (actorUserError || !user?.id) {
    return { ok: false, status: 401, message: "يجب تسجيل الدخول أولاً." };
  }

  const rbacSession = await readValidatedRbacSession(authHeader);
  if (rbacSession) {
    const actorRole = resolveKnownUserRole(rbacSession.role);
    if (!actorRole) {
      return { ok: false, status: 403, message: "هذا الحساب غير مخصص للوصول إلى لوحة الويب الإدارية." };
    }

    if (!options.allowedRoles.includes(actorRole)) {
      return { ok: false, status: 403, message: options.roleDeniedMessage };
    }

    if (!rbacSession.userActive) {
      return { ok: false, status: 403, message: "ليس لديك صلاحية لاستخدام هذه الواجهة." };
    }

    const requested = requestedSchoolId?.trim() || null;
    let targetSchoolId = requested;

    if (actorRole !== "super_admin") {
      if (!rbacSession.schoolId) {
        return { ok: false, status: 403, message: "الحساب الحالي غير مرتبط بمدرسة صالحة." };
      }

      if (requested && requested !== rbacSession.schoolId) {
        return { ok: false, status: 403, message: "لا يمكنك تنفيذ هذا الإجراء خارج مدرسة حسابك الحالية." };
      }

      targetSchoolId = rbacSession.schoolId;
    }

    if (!targetSchoolId) {
      return { ok: false, status: 400, message: "يجب تحديد مدرسة قبل متابعة هذا الإجراء." };
    }

    if (actorRole !== "super_admin") {
      if (!rbacSession.schoolActive) {
        return { ok: false, status: 403, message: "المدرسة الحالية غير مفعلة، لذلك تم حظر هذا الإجراء." };
      }

      const status = (rbacSession.subscriptionStatus || "").toLowerCase();
      const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
      const blockedByExpiry = status === "expired" || isSchoolSubscriptionExpired(rbacSession.subscriptionEnd);

      if (blockedByStatus || blockedByExpiry) {
        return { ok: false, status: 403, message: "اشتراك المدرسة الحالية غير صالح، لذلك تم حظر هذا الإجراء." };
      }
    }

    return {
      ok: true,
      value: {
        actorSupabase,
        actorUserId: user.id,
        actorRole,
        targetSchoolId,
      },
    };
  }

  const { data: actorProfile, error: actorProfileError } = await actorSupabase
    .from("user_profiles")
    .select("role, school_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
    return { ok: false, status: 403, message: "ليس لديك صلاحية لاستخدام هذه الواجهة." };
  }

  const actorRole = resolveKnownUserRole(actorProfile.role);
  if (!actorRole) {
    return { ok: false, status: 403, message: "هذا الحساب غير مخصص للوصول إلى لوحة الويب الإدارية." };
  }

  if (!options.allowedRoles.includes(actorRole)) {
    return { ok: false, status: 403, message: options.roleDeniedMessage };
  }

  const requested = requestedSchoolId?.trim() || null;
  let targetSchoolId = requested;

  if (actorRole !== "super_admin") {
    if (!actorProfile.school_id) {
      return { ok: false, status: 403, message: "الحساب الحالي غير مرتبط بمدرسة صالحة." };
    }

    if (requested && requested !== actorProfile.school_id) {
      return { ok: false, status: 403, message: "لا يمكنك تنفيذ هذا الإجراء خارج مدرسة حسابك الحالية." };
    }

    targetSchoolId = actorProfile.school_id;
  }

  if (!targetSchoolId) {
    return { ok: false, status: 400, message: "يجب تحديد مدرسة قبل متابعة هذا الإجراء." };
  }

  const [{ data: school, error: schoolError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    actorSupabase
      .from("schools")
      .select("id, is_active")
      .eq("id", targetSchoolId)
      .maybeSingle(),
    actorSupabase
      .from("subscriptions")
      .select("status, end_date")
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (schoolError || !school?.id) {
    return { ok: false, status: 400, message: "المدرسة المحددة غير متاحة لهذا المستخدم." };
  }

  if (subscriptionError && !isMissingTableError(subscriptionError, "subscriptions")) {
    return { ok: false, status: 500, message: "تعذر التحقق من حالة اشتراك المدرسة الحالية." };
  }

  if (actorRole !== "super_admin") {
    if (school.is_active === false) {
      return { ok: false, status: 403, message: "المدرسة الحالية غير مفعلة، لذلك تم حظر هذا الإجراء." };
    }

    const status = (subscription?.status || "").toLowerCase();
    const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
    const blockedByExpiry = status === "expired" || isSchoolSubscriptionExpired(subscription?.end_date);

    if (blockedByStatus || blockedByExpiry) {
      return { ok: false, status: 403, message: "اشتراك المدرسة الحالية غير صالح، لذلك تم حظر هذا الإجراء." };
    }
  }

  return {
    ok: true,
    value: {
      actorSupabase,
      actorUserId: user.id,
      actorRole,
      targetSchoolId,
    },
  };
}

// Resolve managed users actor context
export async function resolveManagedUsersActorContext(
  requestedSchoolId?: string | null,
  authHeader?: string | null,
): Promise<
  | { ok: true; value: ManagedUsersActorContext }
  | { ok: false; status: number; message: string }
> {
  const context = await resolveSchoolScopedActorContext(requestedSchoolId, {
    allowedRoles: ["super_admin", "admin"],
    roleDeniedMessage: "إدارة الحسابات متاحة للمدير فقط.",
  }, authHeader);

  if (!context.ok) {
    return {
      ok: false,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  return {
    ok: true,
    value: {
      actorSupabase: context.value.actorSupabase,
      actorUserId: context.value.actorUserId,
      actorRole: context.value.actorRole as "super_admin" | "admin",
      targetSchoolId: context.value.targetSchoolId,
    },
  };
}
