import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  DEFAULT_PATH_BY_ROLE,
  getMatchingPermissionRule,
  hasAnyPermission,
  isRoleAllowedForPath,
  normalizePermissions,
  normalizeUserRole,
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

function normalizeLocaleInPath(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  if (!hasLocalePrefix(pathname)) {
    url.pathname = localizeAppPath(pathname, APP_LOCALE);
    return NextResponse.redirect(url);
  }

  const locale = getLocaleFromPath(pathname);
  if (locale !== APP_LOCALE || pathname.startsWith(`/${APP_LOCALE}`) === false) {
    url.pathname = localizeAppPath(pathname, APP_LOCALE);
    return NextResponse.redirect(url);
  }

  return null;
}

export async function middleware(req: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => {
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

  // If user is authenticated but hits login, redirect to dashboard if RBAC is also valid
  if (strippedPath === "/login" && user && session?.role) {
    const role = normalizeUserRole(session.role);
    const url = req.nextUrl.clone();
    url.pathname = localizeAppPath(DEFAULT_PATH_BY_ROLE[role] ?? "/dashboard", locale);
    url.search = "";
    return NextResponse.redirect(url);
  }

  // If path is protected and user is NOT authenticated with Supabase, redirect to login
  if (!isPublic && !user) {
    return redirectWithPreservedNext(req, locale);
  }

  // If path is protected and user IS authenticated but RBAC is missing, 
  // let it proceed so client-side can initialize RBAC.
  if (!isPublic && !session?.role) {
    return response;
  }

  if (!session?.role) {
    return response;
  }

  // From here on, we have both Supabase User and RBAC Session
  // We can proceed with RBAC checks

  const role = normalizeUserRole(session.role);
  const permissions = normalizePermissions(session.permissions, role);

  if (!session.userActive && !isPublic) {
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
    const status = (session.subscriptionStatus || "").toLowerCase();
    const blockedByStatus = status === "suspended" || status === "inactive" || status === "stopped";
    const blockedByExpiry = status === "expired" || isSubscriptionExpired(session.subscriptionEnd);

    if (!session.schoolId || session.schoolActive === false || blockedByStatus || blockedByExpiry) {
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
