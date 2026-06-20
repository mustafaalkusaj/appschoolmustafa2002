import { cookies } from "next/headers";
import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";
import { resolveKnownUserRole, type UserRole } from "@/types/roles";
import type {
  ManagedUsersActorContext,
  SchoolScopedActorContext,
} from "./types";

import { endOfDayBaghdad } from "@/lib/tz";
import { getCachedSchoolContext, setCachedSchoolContext, recordTiming } from "@/lib/request-context-cache";

// Check if school subscription is expired
function isSchoolSubscriptionExpired(endDate: string | null | undefined) {
  if (!endDate) return false;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() > endOfDayBaghdad(parsed).getTime();
}

// Cheap single-row recheck of the user's live RBAC state against the DB.
// Guards the signed-cookie fast-path: a cookie is valid for up to
// RBAC_SESSION_MAX_AGE (8h), during which an admin may have deactivated the
// user or bumped permissions_version. Returns "stale" when the cookie must be
// rejected, "ok" when it is still trustworthy, and "skip" when the lookup
// itself failed (do not block on infra errors — fall through to full resolve).
async function recheckRbacFreshness(
  userId: string,
  cookiePermissionsVersion: number | null | undefined,
): Promise<"ok" | "stale" | "skip"> {
  try {
    const serviceClient = createServiceSupabaseClient();
    const { data, error } = await serviceClient
      .from("user_profiles")
      .select("is_active, permissions_version")
      .eq("id", userId)
      .maybeSingle<{ is_active: boolean | null; permissions_version: number | null }>();

    if (error || !data) {
      return "skip";
    }

    if (!data.is_active) {
      return "stale";
    }

    if (
      typeof cookiePermissionsVersion === "number" &&
      typeof data.permissions_version === "number" &&
      data.permissions_version !== cookiePermissionsVersion
    ) {
      return "stale";
    }

    return "ok";
  } catch {
    return "skip";
  }
}

async function readValidatedRbacSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RBAC_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return await verifyRBACSession(token);
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
  const t0 = performance.now();
  const cacheKey = (requestedSchoolId ?? "").trim() || "null";

  // SAFE: Request-level cache only. Each request gets isolated cache.
  // No data leakage between requests or users.
  const cached = getCachedSchoolContext("_pending", cacheKey);
  if (cached) {
    recordTiming("auth_cache_hit", performance.now() - t0);
    return cached;
  }

  const tSessionStart = performance.now();
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: actorUserError,
  } = await getRouteAuthenticatedUser(actorSupabase, authHeader);
  const tSessionEnd = performance.now();
  recordTiming("auth_session_resolve", tSessionEnd - tSessionStart);

  if (actorUserError || !user?.id) {
    const result = { ok: false as const, status: 401, message: "يجب تسجيل الدخول أولاً." };
    setCachedSchoolContext("_pending", cacheKey, result);
    return result;
  }

  const tRbacStart = performance.now();
  const rbacSession = await readValidatedRbacSession();
  const tRbacEnd = performance.now();
  recordTiming("auth_rbac_verify", tRbacEnd - tRbacStart);
  if (rbacSession && rbacSession.userId === user.id) {
    const tValidStart = performance.now();
    const actorRole = resolveKnownUserRole(rbacSession.role);
    if (!actorRole) {
      const result = { ok: false as const, status: 403, message: "هذا الحساب غير مخصص للوصول إلى لوحة الويب الإدارية." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    if (!options.allowedRoles.includes(actorRole)) {
      const result = { ok: false as const, status: 403, message: options.roleDeniedMessage };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    if (!rbacSession.userActive) {
      const result = { ok: false as const, status: 403, message: "ليس لديك صلاحية لاستخدام هذه الواجهة." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    // Cheap DB recheck: the signed cookie can be up to 8h old. If the user was
    // deactivated or permissions_version was bumped since the cookie was
    // issued, reject the fast-path and fall through to full re-resolution
    // (which re-reads the DB and enforces the live state).
    const tFreshStart = performance.now();
    const freshness = await recheckRbacFreshness(user.id, rbacSession.permissionsVersion);
    recordTiming("auth_rbac_freshness", performance.now() - tFreshStart);
    if (freshness === "stale") {
      // Do not return cached: drop to the expensive resolve path below.
    } else {

    const requested = requestedSchoolId?.trim() || null;
    let targetSchoolId = requested;

    if (actorRole !== "super_admin") {
      if (!rbacSession.schoolId) {
        const result = { ok: false as const, status: 403, message: "الحساب الحالي غير مرتبط بمدرسة صالحة." };
        setCachedSchoolContext("_pending", cacheKey, result);
        recordTiming("auth_validation", performance.now() - tValidStart);
        return result;
      }

      if (requested && requested !== rbacSession.schoolId) {
        const result = { ok: false as const, status: 403, message: "لا يمكنك تنفيذ هذا الإجراء خارج مدرسة حسابك الحالية." };
        setCachedSchoolContext("_pending", cacheKey, result);
        recordTiming("auth_validation", performance.now() - tValidStart);
        return result;
      }

      targetSchoolId = rbacSession.schoolId;
    }

    if (!targetSchoolId) {
      const result = { ok: false as const, status: 400, message: "يجب تحديد مدرسة قبل متابعة هذا الإجراء." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    if (actorRole !== "super_admin") {
      if (!rbacSession.schoolActive) {
        const result = { ok: false as const, status: 403, message: "المدرسة الحالية غير مفعلة، لذلك تم حظر هذا الإجراء." };
        setCachedSchoolContext("_pending", cacheKey, result);
        recordTiming("auth_validation", performance.now() - tValidStart);
        return result;
      }

      const status = (rbacSession.subscriptionStatus || "").toLowerCase();
      const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
      const blockedByExpiry = status === "expired" || isSchoolSubscriptionExpired(rbacSession.subscriptionEnd);

      if (blockedByStatus || blockedByExpiry) {
        const result = { ok: false as const, status: 403, message: "اشتراك المدرسة الحالية غير صالح، لذلك تم حظر هذا الإجراء." };
        setCachedSchoolContext("_pending", cacheKey, result);
        recordTiming("auth_validation", performance.now() - tValidStart);
        return result;
      }
    }

    recordTiming("auth_validation", performance.now() - tValidStart);
    const successResult = {
      ok: true as const,
      value: {
        actorSupabase,
        actorUserId: user.id,
        actorRole,
        targetSchoolId,
        actorBranchId: rbacSession.branchId,
        allowedBranchIds: rbacSession.allowedBranchIds,
        scopeLevel: rbacSession.scopeLevel,
        isSinglePageUser: rbacSession.isSinglePageUser,
        permissionsVersion: rbacSession.permissionsVersion,
      },
    };
    setCachedSchoolContext("_pending", cacheKey, successResult);
    return successResult;
    } // end freshness-ok fast-path
  }

  // RBAC cache miss: expensive path. Measure sub-queries.
  const tProfileStart = performance.now();
  const resolvedProfile = await resolveWebUserProfile(actorSupabase, user.id).catch(() => null);
  const tProfileEnd = performance.now();
  recordTiming("auth_user_profiles_query", tProfileEnd - tProfileStart);

  if (!resolvedProfile || !resolvedProfile.snapshot.userActive) {
    const result = { ok: false as const, status: 403, message: "ليس لديك صلاحية لاستخدام هذه الواجهة." };
    setCachedSchoolContext("_pending", cacheKey, result);
    return result;
  }

  const tValidStart = performance.now();
  const { snapshot } = resolvedProfile;
  const actorRole = snapshot.role;

  if (!options.allowedRoles.includes(actorRole)) {
    const result = { ok: false as const, status: 403, message: options.roleDeniedMessage };
    setCachedSchoolContext("_pending", cacheKey, result);
    recordTiming("auth_validation", performance.now() - tValidStart);
    return result;
  }

  const requested = requestedSchoolId?.trim() || null;
  let targetSchoolId = requested;

  if (actorRole !== "super_admin") {
    if (!snapshot.schoolId) {
      const result = { ok: false as const, status: 403, message: "الحساب الحالي غير مرتبط بمدرسة صالحة." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    if (requested && requested !== snapshot.schoolId) {
      const result = { ok: false as const, status: 403, message: "لا يمكنك تنفيذ هذا الإجراء خارج مدرسة حسابك الحالية." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    targetSchoolId = snapshot.schoolId;
  }

  if (!targetSchoolId) {
    const result = { ok: false as const, status: 400, message: "يجب تحديد مدرسة قبل متابعة هذا الإجراء." };
    setCachedSchoolContext("_pending", cacheKey, result);
    recordTiming("auth_validation", performance.now() - tValidStart);
    return result;
  }

  if (actorRole !== "super_admin") {
    if (!snapshot.schoolActive) {
      const result = { ok: false as const, status: 403, message: "المدرسة الحالية غير مفعلة، لذلك تم حظر هذا الالإجراء." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }

    const status = (snapshot.subscriptionStatus || "").toLowerCase();
    const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
    const blockedByExpiry = status === "expired" || isSchoolSubscriptionExpired(snapshot.subscriptionEnd);

    if (blockedByStatus || blockedByExpiry) {
      const result = { ok: false as const, status: 403, message: "اشتراك المدرسة الحالية غير صالح، لذلك تم حظر هذا الإجراء." };
      setCachedSchoolContext("_pending", cacheKey, result);
      recordTiming("auth_validation", performance.now() - tValidStart);
      return result;
    }
  }

  recordTiming("auth_validation", performance.now() - tValidStart);
  const successResult = {
    ok: true as const,
    value: {
      actorSupabase,
      actorUserId: user.id,
      actorRole,
      targetSchoolId,
      actorBranchId: snapshot.branchId,
      allowedBranchIds: snapshot.allowedBranchIds,
      scopeLevel: snapshot.scopeLevel,
      isSinglePageUser: snapshot.isSinglePageUser,
      permissionsVersion: snapshot.permissionsVersion,
    },
  };
  setCachedSchoolContext("_pending", cacheKey, successResult);
  return successResult;
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
      actorBranchId: context.value.actorBranchId,
      allowedBranchIds: context.value.allowedBranchIds,
    },
  };
}
