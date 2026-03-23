import { NextResponse, type NextRequest } from "next/server";

import { parseSessionValue, SESSION_COOKIE } from "@/lib/auth-session";
import { hasAnyPermission } from "@/lib/permissions";
import { isSubscriptionExpired } from "@/lib/saas";
import type { Permission } from "@/lib/types";

const PUBLIC_ROUTES = ["/login", "/forbidden", "/subscription-expired"];

const PERMISSION_RULES: Array<{ prefix: string; permissions: Permission[] }> = [
  { prefix: "/portal/students", permissions: ["view_students"] },
  { prefix: "/portal/payments", permissions: ["view_payments"] },
  { prefix: "/portal/salaries", permissions: ["view_salaries"] },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const session = parseSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!session) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(session.role === "super_admin" ? "/super-admin" : "/portal", request.url));
  }

  if (pathname.startsWith("/super-admin") && session.role !== "super_admin") {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  if (pathname.startsWith("/portal") && session.role !== "super_admin") {
    const isSchoolLocked =
      session.schoolStatus !== "active" ||
      (session.subscriptionExpiresAt ? isSubscriptionExpired(session.subscriptionExpiresAt) : true);

    if (isSchoolLocked && pathname !== "/subscription-expired") {
      return NextResponse.redirect(new URL("/subscription-expired", request.url));
    }
  }

  const permissionRule = PERMISSION_RULES.find((rule) => pathname.startsWith(rule.prefix));
  if (permissionRule && !hasAnyPermission(session.permissions, permissionRule.permissions)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
