import { NextRequest, NextResponse } from "next/server";
import { endOfDayBaghdad } from "@/lib/tz";
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

// --- Mobile API Rate Limiter (Redis-backed via lib/rate-limit) ---
import { enforceRateLimit, getRateLimitClientIp } from "@/lib/rate-limit";

const MOBILE_API_WINDOW_MS = 60_000;
const MOBILE_API_MAX_HITS = 100;

async function checkMobileRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/mobile/")) return null;
  if (pathname === "/api/mobile/auth/login") return null;

  const ip = getRateLimitClientIp(request);
  const response = await enforceRateLimit(request, {
    namespace: "mobile-api",
    windowMs: MOBILE_API_WINDOW_MS,
    maxHits: MOBILE_API_MAX_HITS,
    identifier: ip,
    onRateLimited: {
      error: "rate_limited",
      message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
    },
    productionFailureMode: "memory-fallback",
  });

  return response as NextResponse | null;
}

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
  return now.getTime() > endOfDayBaghdad(parsed).getTime();
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

function readBearerOrQueryToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      return token;
    }
  }

  return request.nextUrl.searchParams.get("token")?.trim() || null;
}

function isAuthorizedOpsProbe(request: NextRequest, normalizedPath: string) {
  const providedToken = readBearerOrQueryToken(request);
  if (!providedToken) {
    return false;
  }

  if (normalizedPath === "/api/ops/health") {
    return [process.env.OPS_ALERT_TOKEN, process.env.HEALTHCHECK_TOKEN].some((token) => token && token === providedToken);
  }

  if (
    normalizedPath === "/api/ops/whatsapp-test" ||
    normalizedPath === "/api/ops/latest" ||
    normalizedPath === "/api/ops/notification-test"
  ) {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Telegram webhook management — protected by OPS_ALERT_TOKEN
  if (
    normalizedPath === "/api/ops/telegram-webhook/setup" ||
    normalizedPath === "/api/ops/telegram-webhook/delete"
  ) {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Error capture API — protected by OPS_ALERT_TOKEN
  if (
    normalizedPath === "/api/ops/errors" ||
    normalizedPath.startsWith("/api/ops/errors/")
  ) {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Audit logs — protected by OPS_ALERT_TOKEN
  if (normalizedPath === "/api/ops/audit-logs") {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Deep check — protected by OPS_ALERT_TOKEN
  if (normalizedPath === "/api/ops/deepcheck") {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Pending actions management — protected by OPS_ALERT_TOKEN
  if (normalizedPath === "/api/ops/pending-actions") {
    return process.env.OPS_ALERT_TOKEN === providedToken;
  }

  // Scheduled jobs driven by the host crontab.
  //
  // Every one of these was permanently 401 before this branch existed:
  // /api/cron/* never reached this function at all, warm and weekly-report
  // fell through to `return false`, calendar/daily-check is not under
  // /api/ops/ so it was never routed here, and daily-report was gated on
  // OPS_REPORT_CRON_SECRET — an env var that does not exist in production,
  // so the comparison was always `undefined === token`.
  //
  // CRON_SECRET is the scheduler credential; OPS_ALERT_TOKEN is accepted for
  // manual incident runs. This mirrors the guard each route handler already
  // applies via isOpsTokenAuthorized, so the proxy no longer rejects requests
  // that the route itself would have accepted.
  // NOTE: this branch must not be preceded by a path-specific check for any
  // path it covers — an earlier `return` short-circuits it. /api/ops/daily-report
  // used to have its own branch gated on OPS_REPORT_CRON_SECRET, which is unset
  // in production, so that route stayed 401 even after this branch was added.
  if (isScheduledJobPath(normalizedPath)) {
    return [
      process.env.CRON_SECRET,
      process.env.OPS_ALERT_TOKEN,
      process.env.OPS_REPORT_CRON_SECRET,
    ].some((token) => token && token === providedToken);
  }

  return false;
}

/** Paths invoked by the host crontab rather than by a signed-in user. */
function isScheduledJobPath(normalizedPath: string) {
  return (
    normalizedPath.startsWith("/api/cron/") ||
    normalizedPath === "/api/ops/warm" ||
    normalizedPath === "/api/ops/daily-report" ||
    normalizedPath === "/api/ops/weekly-report" ||
    normalizedPath === "/api/web/calendar/daily-check"
  );
}

async function getGuardRedirect(request: NextRequest): Promise<URL | NextResponse | null> {
  const normalizedPath = normalizePath(request.nextUrl.pathname);
  const isApiRequest = normalizedPath.startsWith("/api/");
  const isPublicPath = PUBLIC_PATHS.some((path) => normalizedPath === path) ||
    normalizedPath.startsWith("/upload/");
  const isPublicApiPath =
    // Mobile APIs use their own auth (Supabase token / resolveMobileRouteContext)
    normalizedPath.startsWith("/api/mobile/") ||
    normalizedPath === "/api/auth/login" ||
    normalizedPath === "/api/auth/me" ||
    normalizedPath === "/api/auth/demo-users" ||
    normalizedPath === "/api/auth/forgot-password" ||
    normalizedPath === "/api/auth/register" ||
    normalizedPath === "/api/rbac/session" ||
    normalizedPath === "/api/account/me" ||
    normalizedPath === "/api/ping" ||
    normalizedPath === "/api/health" ||
    // Telegram webhook receiver — Telegram posts here; route handles ?secret auth
    normalizedPath === "/api/ops/telegram-webhook" ||
    // Client error reporting — called from frontend without ops token
    normalizedPath === "/api/ops/client-error" ||
    // Mobile photo upload — uses token-based auth, no session cookie
    normalizedPath === "/api/web/upload/mobile" ||
    normalizedPath === "/api/web/upload/status";

  if ((!isApiRequest && isPublicPath) || (isApiRequest && isPublicApiPath)) {
    return null;
  }

  if (
    isApiRequest &&
    (normalizedPath.startsWith("/api/ops/") ||
      isScheduledJobPath(normalizedPath)) &&
    isAuthorizedOpsProbe(request, normalizedPath)
  ) {
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

  // Branch user scope guard — branch_user admins go to /branch-overview, not /dashboard.
  if (!isApiRequest && normalizedPath === "/dashboard" && session.scopeLevel === "branch_user") {
    const locale = getLocaleFromRequestPath(request.nextUrl.pathname);
    return new URL(localizePath("/branch-overview", locale), request.url);
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
      normalizedCurrent.startsWith("/api/web/group/") ||
      normalizedCurrent.startsWith("/api/web/branch/");

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

function buildCSP(nonce: string): string {
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
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "https://static.cloudflareinsights.com",
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
  const rateLimitResponse = await checkMobileRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  if (process.env.MAINTENANCE_MODE === 'true') {
    return new NextResponse(
      `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>الموقع تحت الصيانة</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .container { background: white; padding: 60px 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 480px; width: 90%; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 28px; color: #1e293b; margin-bottom: 12px; }
    p { font-size: 16px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔧</div>
    <h1>الموقع تحت الصيانة</h1>
    <p>نقوم حالياً بإجراء تحديثات وتحسينات. سنعود قريباً.</p>
  </div>
</body>
</html>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '3600' } }
    );
  }

  const requestId = resolveRequestId(request);
  const nonce = generateNonce();
  const csp = buildCSP(nonce);
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

  applyCdnCacheHeaders(response, request.nextUrl.pathname, isApiRequest);

  return response;
}

const CDN_CACHE_RULES: Array<{ match: (p: string, isApi: boolean) => boolean; sMaxAge: number; staleRevalidate: number }> = [
  { match: (p) => p === "/api/ping" || p === "/api/health", sMaxAge: 30, staleRevalidate: 60 },
  // Page-only rule. API auth endpoints must never be CDN/browser cached — a cached
  // login response gets replayed without its Set-Cookie headers, leaving the client
  // "logged in" with no session cookie and bouncing straight back to /login.
  { match: (p, isApi) => !isApi && (p.endsWith("/login") || p.endsWith("/forgot-password")), sMaxAge: 300, staleRevalidate: 600 },
  { match: (_p, isApi) => !isApi, sMaxAge: 0, staleRevalidate: 0 },
];

function applyCdnCacheHeaders(response: NextResponse, pathname: string, isApiRequest: boolean) {
  for (const rule of CDN_CACHE_RULES) {
    if (rule.match(pathname, isApiRequest)) {
      if (rule.sMaxAge > 0) {
        response.headers.set(
          "Cache-Control",
          `public, s-maxage=${rule.sMaxAge}, stale-while-revalidate=${rule.staleRevalidate}`,
        );
        response.headers.set("CDN-Cache-Control", `public, s-maxage=${rule.sMaxAge}`);
      }
      return;
    }
  }
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
    "/api/mobile/:path*",
  ],
};
