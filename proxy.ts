import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import {
  isPagePathAllowed,
  resolvePageCodeFromApiPath,
} from "@/lib/authorization/page-access";
import { getPublicEnv } from "@/lib/env/public";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { routing } from "./i18n/routing";
import {
  getMatchingPermissionRule,
  getMatchingRouteRule,
  hasAnyPermission,
  isRoleAllowedForPath,
  normalizePath,
  PUBLIC_PATHS,
} from "@/types/roles";

/**
 * Generates a cryptographically random nonce for CSP.
 * Uses Web Crypto API which is available in Next.js runtime.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function resolveOptionalOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isSubscriptionExpired(endDate: string | null | undefined, now = new Date()) {
  if (!endDate) return false;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDay.getTime();
}

function getLocaleFromRequestPath(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return routing.locales.includes(firstSegment as (typeof routing.locales)[number])
    ? firstSegment
    : routing.defaultLocale;
}

function localizePath(pathname: string, locale: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/") {
    return `/${locale}`;
  }

  const stripped = normalizePath(normalized);
  return stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
}

function resolveGuardRedirect(reason: "unauthenticated" | "forbidden" | "school_inactive" | "subscription_expired", request: NextRequest) {
  const locale = getLocaleFromRequestPath(request.nextUrl.pathname);
  const fullPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (reason === "unauthenticated") {
    const loginUrl = new URL(localizePath("/login", locale), request.url);
    loginUrl.searchParams.set("next", fullPath);
    return loginUrl;
  }

  if (reason === "school_inactive" || reason === "subscription_expired") {
    return new URL(localizePath("/subscription-expired", locale), request.url);
  }

  return new URL(localizePath("/access-denied", locale), request.url);
}

function buildApiGuardResponse(status: 401 | 403, message: string) {
  return NextResponse.json(
    {
      error: status === 401 ? "Unauthorized" : "Forbidden",
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function getGuardRedirect(request: NextRequest): Promise<URL | NextResponse | null> {
  const normalizedPath = normalizePath(request.nextUrl.pathname);
  const isApiRequest = normalizedPath.startsWith("/api/");
  const isPublicPath = PUBLIC_PATHS.some((path) => normalizedPath === path);
  const isPublicApiPath =
    normalizedPath === "/api/auth/login" ||
    normalizedPath === "/api/auth/me" ||
    normalizedPath === "/api/auth/forgot-password" ||
    normalizedPath === "/api/auth/register" ||
    normalizedPath === "/api/rbac/session" ||
    normalizedPath === "/api/account/me" ||
    normalizedPath === "/api/health";

  if ((!isApiRequest && isPublicPath) || (isApiRequest && isPublicApiPath)) {
    return null;
  }

  const routeRule = isApiRequest ? null : getMatchingRouteRule(normalizedPath);
  if (!isApiRequest && !routeRule) {
    return null;
  }

  const rbacToken = request.cookies.get(RBAC_COOKIE_NAME)?.value;
  const session = await verifyRBACSession(rbacToken);

  if (!session) {
    if (isApiRequest) {
      return buildApiGuardResponse(401, "Authentication is required.");
    }
    return resolveGuardRedirect("unauthenticated", request);
  }

  if (!session.userActive) {
    if (isApiRequest) {
      return buildApiGuardResponse(403, "This account is inactive.");
    }
    return resolveGuardRedirect("forbidden", request);
  }

  const hasAssignedPageScope = session.allowedPages.length > 0;
  const isSchoolManagerScope =
    session.role === "admin" &&
    session.scopeLevel === "group_admin" &&
    !hasAssignedPageScope;

  if (!isApiRequest && !isRoleAllowedForPath(session.role, normalizedPath)) {
    return resolveGuardRedirect("forbidden", request);
  }

  const permissionRule = isApiRequest ? null : getMatchingPermissionRule(normalizedPath);
  if (!isApiRequest && permissionRule) {
    const allowed = permissionRule.requireAll
      ? permissionRule.permissions.every((permission) => session.permissions.includes(permission))
      : hasAnyPermission(session.permissions, permissionRule.permissions);

    if (!allowed) {
      return resolveGuardRedirect("forbidden", request);
    }
  }

  if (!isApiRequest && routeRule?.requiresActiveSchool && session.role !== "super_admin") {
    if (!session.schoolId || !session.schoolActive) {
      return resolveGuardRedirect("school_inactive", request);
    }

    const subscriptionStatus = (session.subscriptionStatus || "").toLowerCase();
    if (subscriptionStatus === "suspended" || subscriptionStatus === "inactive" || subscriptionStatus === "stopped") {
      return resolveGuardRedirect("school_inactive", request);
    }

    if (subscriptionStatus === "expired" || isSubscriptionExpired(session.subscriptionEnd)) {
      return resolveGuardRedirect("subscription_expired", request);
    }
  }

  // Group scope guard.
  if (!isApiRequest && normalizePath(request.nextUrl.pathname) === "/group" && session.role !== "super_admin") {
    if (!isSchoolManagerScope) {
      return resolveGuardRedirect("forbidden", request);
    }
  }

  if (isApiRequest) {
    const normalizedCurrent = normalizePath(request.nextUrl.pathname);
    const apiPageCode = resolvePageCodeFromApiPath(normalizedCurrent);
    const isSessionMaintenanceEndpoint =
      normalizedCurrent === "/api/rbac/session" ||
      normalizedCurrent === "/api/auth/login" ||
      normalizedCurrent === "/api/auth/me" ||
      normalizedCurrent === "/api/account/me" ||
      normalizedCurrent === "/api/health";
    const isSharedUtilityEndpoint =
      normalizedCurrent === "/api/web/schema-compat" ||
      normalizedCurrent === "/api/web/dashboard/branding";
    const isSchoolManagerEndpoint =
      normalizedCurrent === "/api/web/group/export" ||
      normalizedCurrent.startsWith("/api/web/group/");

    if (isSchoolManagerScope && !isSessionMaintenanceEndpoint && !isSharedUtilityEndpoint && !isSchoolManagerEndpoint) {
      return buildApiGuardResponse(403, "This account can only access the school manager page APIs.");
    }

    if (hasAssignedPageScope && !isSessionMaintenanceEndpoint && !isSharedUtilityEndpoint) {
      if (!apiPageCode || !session.allowedPages.includes(apiPageCode)) {
        return buildApiGuardResponse(403, "This account cannot access the requested API scope.");
      }
    }

    return null;
  }

  // Focused user enforcement: lock to allowed pages only.
  if (isSchoolManagerScope) {
    const normalizedCurrent = normalizePath(request.nextUrl.pathname);
    const locale = getLocaleFromRequestPath(request.nextUrl.pathname);
    const isPublicUtilityPath = PUBLIC_PATHS.some((path) => normalizedCurrent === path);

    if (!isPublicUtilityPath && normalizedCurrent !== "/group") {
      return new URL(localizePath("/group", locale), request.url);
    }
  }

  if (hasAssignedPageScope) {
    const normalizedCurrent = normalizePath(request.nextUrl.pathname);
    const locale = getLocaleFromRequestPath(request.nextUrl.pathname);
    const defaultPath = session.defaultPath || "/dashboard";
    const isPublicUtilityPath = PUBLIC_PATHS.some((path) => normalizedCurrent === path);

    if (!isPublicUtilityPath && normalizedCurrent === "/") {
      return new URL(localizePath(defaultPath, locale), request.url);
    }

    if (
      !isPublicUtilityPath &&
      !isPagePathAllowed(normalizedCurrent, session.allowedPages)
    ) {
      // The dashboard is intentionally blocked for focused users unless explicitly granted.
      if (normalizedCurrent === "/dashboard") {
        return new URL(localizePath(defaultPath, locale), request.url);
      }
      return resolveGuardRedirect("forbidden", request);
    }
  }

  return null;
}

const intlMiddleware = createIntlMiddleware(routing);

function buildCSP(): string {
  const publicEnv = getPublicEnv();
  const supabaseOrigin = resolveOptionalOrigin(publicEnv.supabaseUrl);
  const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : undefined;

  const connectSrc = ["'self'"];
  const imageSrc = ["'self'", "data:", "blob:", "https:"];

  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    imageSrc.push(supabaseOrigin);
  }
  if (supabaseHost) {
    connectSrc.push(`wss://${supabaseHost}`);
  }

  const scriptSrc: string[] = [
    "'self'",
    "'unsafe-inline'",
  ];

  if (process.env.NODE_ENV !== "production") {
    scriptSrc.push("'unsafe-eval'");
  }

  const cspParts = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `connect-src ${Array.from(new Set(connectSrc)).join(" ")}`,
    `img-src ${Array.from(new Set(imageSrc)).join(" ")}`,
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(" ")}`,
  ];

  return cspParts.join("; ");
}

function resolveRequestId(request: NextRequest) {
  const incoming = request.headers.get("x-request-id")?.trim();
  if (incoming && incoming.length <= 128) {
    return incoming;
  }
  return crypto.randomUUID();
}

function applyIntlResponse(target: NextResponse, source: NextResponse) {
  source.headers.forEach((value, key) => {
    target.headers.set(key, value);
  });

  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

function applyBaseSecurityHeaders(response: NextResponse, requestId: string, nonce: string, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-nonce", nonce);

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const nonce = generateNonce();
  const csp = buildCSP();
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isPageMethod = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";

  if (!isApiRequest && !isPageMethod) {
    const response = new NextResponse("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD, OPTIONS",
        "Cache-Control": "no-store",
      },
    });
    applyBaseSecurityHeaders(response, requestId, nonce, csp);
    return response;
  }

  const intlResponse = isApiRequest ? NextResponse.next() : intlMiddleware(request);

  if (!isApiRequest && (intlResponse.status === 307 || intlResponse.status === 308)) {
    return intlResponse;
  }

  const guardRedirect = await getGuardRedirect(request);
  if (guardRedirect) {
    if (guardRedirect instanceof NextResponse) {
      return guardRedirect;
    }
    return NextResponse.redirect(guardRedirect);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  applyIntlResponse(response, intlResponse);

  if (!isApiRequest) {
    applyBaseSecurityHeaders(response, requestId, nonce, csp);

    // Set layout mode cookie for client-side consumption
    const rbacToken = request.cookies.get(RBAC_COOKIE_NAME)?.value;
    if (rbacToken) {
      const session = await verifyRBACSession(rbacToken);
      if (session) {
        const sessionWithScope = session as typeof session & { scopeLevel?: string | null };
        let layoutMode: string;
        const hasPageScope = Array.isArray(session.allowedPages) && session.allowedPages.length > 0;
        const isGroupOverviewOnly =
          session.role === "admin" &&
          sessionWithScope.scopeLevel === "group_admin" &&
          !hasPageScope;
        const useSinglePageShell =
          hasPageScope &&
          session.allowedPages.length <= 1;

        if (isGroupOverviewOnly) {
          layoutMode = "group-only";
        } else if (useSinglePageShell) {
          layoutMode = "restricted";
        } else if ((session as { scope?: string }).scope === "focused") {
          layoutMode = "focused";
        } else {
          layoutMode = "full";
        }
        response.cookies.set("lm", layoutMode, { httpOnly: false, sameSite: "lax", path: "/" });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/api/web/:path*",
    "/api/students/:path*",
    "/api/dashboard/:path*",
    "/api/branches/:path*",
    "/api/users/:path*",
    "/api/auth/:path*",
    "/api/rbac/:path*",
    "/api/account/:path*",
    "/api/health",
  ],
};
