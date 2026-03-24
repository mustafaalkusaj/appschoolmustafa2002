import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  DEFAULT_PATH_BY_ROLE,
  getMatchingPermissionRule,
  hasAnyPermission,
  isRoleAllowedForPath,
  normalizePermissions,
  resolveKnownUserRole,
  type Permission,
  type UserRole,
} from "@/types/roles";
import {
  APP_LOCALE,
  getLocaleFromPath,
  hasLocalePrefix,
  localizeAppPath,
  sanitizeNextPath,
  stripLocaleFromPath,
} from "@/lib/locale-routing";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";

const PUBLIC_PATHS = new Set(["/login", "/access-denied", "/subscription-expired"]);

function isSubscriptionExpired(endDate: string | null | undefined): boolean {
  if (!endDate) return false;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return Date.now() > d.getTime();
}

function redirectWithPreservedNext(req: NextRequest, locale: string) {
  const url = req.nextUrl.clone();
  const requestedPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const nextPath = sanitizeNextPath(requestedPath);
  url.pathname = localizeAppPath("/login", locale);
  url.search = "";
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url);
}

type ProxyAccessState = {
  role: UserRole;
  permissions: Permission[];
  schoolId: string | null;
  userActive: boolean;
  schoolActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
};

async function resolveFallbackAccessState(supabase: any, userId: string): Promise<ProxyAccessState | null> {
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, school_id, is_active, permissions, custom_permissions")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const role = resolveKnownUserRole(profile.role);
  if (!role) {
    return null;
  }

  const rawPermissions =
    Array.isArray(profile.custom_permissions) && profile.custom_permissions.length > 0
      ? profile.custom_permissions
      : profile.permissions;
  const permissions = normalizePermissions(rawPermissions, role);

  let schoolActive = true;
  let subscriptionStatus: string | null = null;
  let subscriptionEnd: string | null = null;

  if (profile.school_id) {
    const [{ data: school }, { data: subscription }] = await Promise.all([
      supabase
        .from("schools")
        .select("is_active")
        .eq("id", profile.school_id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, end_date")
        .eq("school_id", profile.school_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    schoolActive = school?.is_active !== false;
    subscriptionStatus = subscription?.status ?? null;
    subscriptionEnd = subscription?.end_date ?? null;
  } else if (role !== "super_admin") {
    schoolActive = false;
  }

  return {
    role,
    permissions,
    schoolId: profile.school_id ?? null,
    userActive: Boolean(profile.is_active),
    schoolActive,
    subscriptionStatus,
    subscriptionEnd,
  };
}

function normalizeLocaleInPath(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  if (!hasLocalePrefix(pathname)) {
    url.pathname = localizeAppPath(pathname, APP_LOCALE);
    return NextResponse.redirect(url);
  }

  const locale = getLocaleFromPath(pathname);
  if (!pathname.startsWith(`/${locale}`)) {
    url.pathname = localizeAppPath(pathname, locale);
    return NextResponse.redirect(url);
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const normalizedLocaleResponse = normalizeLocaleInPath(req);
  if (normalizedLocaleResponse) return normalizedLocaleResponse;

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const locale = getLocaleFromPath(pathname);
  const strippedPath = stripLocaleFromPath(pathname);
  const isPublic = PUBLIC_PATHS.has(strippedPath);
  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  const fallbackAccess = !session?.role && user?.id ? await resolveFallbackAccessState(supabase, user.id) : null;

  // If user is authenticated but hits login, redirect using RBAC or a direct profile fallback.
  if (strippedPath === "/login" && user && (session?.role || fallbackAccess?.role)) {
    const role = session?.role ?? fallbackAccess?.role;
    const url = req.nextUrl.clone();
    url.pathname = localizeAppPath(DEFAULT_PATH_BY_ROLE[role ?? "employee"] ?? "/dashboard", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // If path is protected and user is NOT authenticated with Supabase, redirect to login
  if (!isPublic && !user) {
    return redirectWithPreservedNext(req, locale);
  }

  if (!session?.role && !fallbackAccess) {
    if (!isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = localizeAppPath("/access-denied", locale);
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const role = session?.role ?? fallbackAccess?.role;
  const permissions = session?.role
    ? normalizePermissions(session.permissions, session.role)
    : fallbackAccess?.permissions ?? [];
  const userActive = session?.role ? session.userActive : fallbackAccess?.userActive ?? false;
  const schoolId = session?.role ? session.schoolId : fallbackAccess?.schoolId ?? null;
  const schoolActive = session?.role ? session.schoolActive : fallbackAccess?.schoolActive ?? false;
  const subscriptionStatus = session?.role
    ? session.subscriptionStatus
    : fallbackAccess?.subscriptionStatus ?? null;
  const subscriptionEnd = session?.role ? session.subscriptionEnd : fallbackAccess?.subscriptionEnd ?? null;

  if (!role) {
    return response;
  }

  if (!userActive && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = localizeAppPath("/access-denied", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!isPublic && !isRoleAllowedForPath(role, strippedPath)) {
    const url = req.nextUrl.clone();
    url.pathname = localizeAppPath("/access-denied", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  const permissionRule = getMatchingPermissionRule(strippedPath);
  if (!isPublic && permissionRule && !hasAnyPermission(permissions, permissionRule.permissions)) {
    const url = req.nextUrl.clone();
    url.pathname = localizeAppPath("/access-denied", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (role !== "super_admin" && !isPublic) {
    const status = (subscriptionStatus || "").toLowerCase();
    const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
    const blockedByExpiry = status === "expired" || isSubscriptionExpired(subscriptionEnd);

    if (!schoolId || schoolActive === false || blockedByStatus || blockedByExpiry) {
      const url = req.nextUrl.clone();
      url.pathname = localizeAppPath("/subscription-expired", locale);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
