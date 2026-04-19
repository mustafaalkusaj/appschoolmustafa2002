import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight auth-gate middleware — no DB calls, cookie presence check only.
 *
 * Supabase SSR stores the session in a cookie named `sb-<project-ref>-auth-token`.
 * We match any cookie that follows the `sb-*-auth-token` pattern.
 */

const PROTECTED_SEGMENTS = [
  "dashboard",
  "students",
  "teachers",
  "payments",
  "salaries",
  "reports",
  "expenses",
  "attendance",
  "monitoring",
  "fee-notifications",
  "super-admin",
  "schools",
  "subscriptions",
];

const SUPPORTED_LOCALES = ["ar", "en"];

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  for (const [name] of request.cookies) {
    if (/^sb-.+-auth-token/.test(name)) {
      return true;
    }
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Determine locale from first path segment
  const segments = pathname.split("/").filter(Boolean);
  const locale = SUPPORTED_LOCALES.includes(segments[0]) ? segments[0] : "ar";
  const afterLocale = segments[1] ?? "";

  // Only gate protected segments
  if (!PROTECTED_SEGMENTS.includes(afterLocale)) {
    return NextResponse.next();
  }

  if (!hasSupabaseAuthCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public assets
     * - /api routes
     * - login, register, forgot-password, access-denied, subscription-expired pages
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$).*)",
  ],
};
