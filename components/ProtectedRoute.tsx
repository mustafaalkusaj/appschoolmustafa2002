"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { getAccessDecision, hasPermission, type Permission, type UserRole } from "@/lib/auth";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permission?: Permission;
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  fallback?: React.ReactNode;
}

function AuthGateFallback({
  pathname,
  blockedReason,
  loading,
}: {
  pathname: string;
  blockedReason: ReturnType<typeof getAccessDecision>["reason"] | "forbidden" | undefined;
  loading: boolean;
}) {
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const title = loading
    ? isEnglish
      ? "Checking your access"
      : "جارٍ التحقق من صلاحيتك"
    : blockedReason === "unauthenticated"
      ? isEnglish
        ? "Redirecting to sign in"
        : "جارٍ تحويلك إلى تسجيل الدخول"
      : blockedReason === "school_inactive" || blockedReason === "subscription_expired"
        ? isEnglish
          ? "Opening access details"
          : "جارٍ فتح تفاصيل الوصول"
        : isEnglish
          ? "Preparing the correct route"
          : "جارٍ تجهيز المسار الصحيح";
  const description = loading
    ? isEnglish
      ? "We are validating the current session and permissions before opening the page."
      : "نراجع الجلسة الحالية والصلاحيات قبل فتح الصفحة."
    : blockedReason === "unauthenticated"
      ? isEnglish
        ? "Your session needs to be restored first."
        : "يجب استعادة الجلسة أولاً قبل متابعة الصفحة."
      : isEnglish
        ? "The route is being updated based on your current access level."
        : "نحدث المسار الآن بناءً على مستوى الوصول الحالي لديك.";

  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="ui-grid-lines pointer-events-none absolute inset-0 opacity-35" />
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-3xl items-center justify-center">
        <section className="ui-glass w-full max-w-[36rem] rounded-[34px] px-6 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-strong)] border-t-[var(--primary)]" />
          <h1 className="mt-5 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            {description}
          </p>
        </section>
      </div>
    </div>
  );
}

function resolveRedirect(reason: ReturnType<typeof getAccessDecision>["reason"], pathname: string) {
  const locale = getLocaleFromPath(pathname);
  const safePath = pathname && pathname.startsWith("/") ? pathname : localizeAppPath("/", locale);

  if (reason === "unauthenticated") {
    return `${localizeAppPath("/login", locale)}?next=${encodeURIComponent(safePath)}`;
  }

  if (reason === "school_inactive" || reason === "subscription_expired") {
    return localizeAppPath("/subscription-expired", locale);
  }

  return localizeAppPath("/access-denied", locale);
}

export function ProtectedRoute({
  children,
  roles,
  permission,
  permissions,
  requireAllPermissions = false,
  fallback = null,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { profile, loading, canAny, canAll } = useRole();

  const access = getAccessDecision(profile, pathname);
  const roleDenied = Boolean(roles && (!profile || !roles.includes(profile.role)));
  const singlePermissionDenied = Boolean(permission && !hasPermission(profile, permission));
  const multiplePermissionsDenied = Boolean(
    permissions &&
      permissions.length > 0 &&
      (requireAllPermissions ? !canAll(permissions) : !canAny(permissions)),
  );

  const blockedReason =
    !access.allowed
      ? access.reason
      : roleDenied || singlePermissionDenied || multiplePermissionsDenied
      ? "forbidden"
      : undefined;

  useEffect(() => {
    if (loading || !blockedReason) return;
    router.replace(resolveRedirect(blockedReason, pathname));
  }, [blockedReason, loading, pathname, router]);

  if (loading || blockedReason) {
    return <>{fallback ?? <AuthGateFallback pathname={pathname} blockedReason={blockedReason} loading={loading} />}</>;
  }

  return <>{children}</>;
}
