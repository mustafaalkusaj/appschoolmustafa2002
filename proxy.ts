import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
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

async function getGuardRedirect(request: NextRequest) {
  const normalizedPath = normalizePath(request.nextUrl.pathname);
  const isPublicPath = PUBLIC_PATHS.some((path) => normalizedPath === path);

  if (isPublicPath) {
    return null;
  }

  const routeRule = getMatchingRouteRule(normalizedPath);
  if (!routeRule) {
    return null;
  }

  const rbacToken = request.cookies.get(RBAC_COOKIE_NAME)?.value;
  const session = await verifyRBACSession(rbacToken);

  if (!session) {
    return resolveGuardRedirect("unauthenticated", request);
  }

  if (!session.userActive) {
    return resolveGuardRedirect("forbidden", request);
  }

  if (!isRoleAllowedForPath(session.role, normalizedPath)) {
    return resolveGuardRedirect("forbidden", request);
  }

  const permissionRule = getMatchingPermissionRule(normalizedPath);
  if (permissionRule) {
    const allowed = permissionRule.requireAll
      ? permissionRule.permissions.every((permission) => session.permissions.includes(permission))
      : hasAnyPermission(session.permissions, permissionRule.permissions);

    if (!allowed) {
      return resolveGuardRedirect("forbidden", request);
    }
  }

  if (routeRule.requiresActiveSchool && session.role !== "super_admin") {
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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const nonce = generateNonce();
  const csp = buildCSP();

  const intlResponse = intlMiddleware(request);

  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const guardRedirect = await getGuardRedirect(request);
  if (guardRedirect) {
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

  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (!isApiRequest) {
    response.headers.set("Content-Security-Policy", csp);
  }

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

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
