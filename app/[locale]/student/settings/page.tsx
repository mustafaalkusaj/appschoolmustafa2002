"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  School,
  Lock,
  Globe,
  LogOut,
  Info,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface StudentProfile {
  full_name: string | null;
  class_name: string | null;
  school_name: string | null;
}

export default function StudentSettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/profile")
      .then((res) => {
        if (res.response.ok) setProfile((res.payload as any)?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const oppositeLocale = isAr ? "en" : "ar";
  const oppositeLocalePath = pathname.replace(
    `/${locale}/`,
    `/${oppositeLocale}/`,
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* proceed regardless */
    }
    window.location.href = "/student-login";
  }

  return (
    <StudentShell
      currentPath="/student/settings"
      titleAr="إعداداتي"
      titleEn="My Settings"
    >
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-[140px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="h-[160px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : (
          <>
            {/* Account Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle className="text-sm sm:text-base">
                    {t("معلومات الحساب", "Account Info")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="divide-y divide-[var(--card-border)]">
                    {[
                      {
                        label: t("الاسم", "Name"),
                        value: profile.full_name,
                        icon: User,
                      },
                      {
                        label: t("الصف", "Class"),
                        value: profile.class_name,
                        icon: GraduationCap,
                      },
                      {
                        label: t("المدرسة", "School"),
                        value: profile.school_name,
                        icon: School,
                      },
                    ].map((field) => {
                      const Icon = field.icon;
                      return (
                        <div
                          key={field.label}
                          className="flex items-center gap-2 sm:gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--primary)]/[0.08]">
                            <Icon className="h-4 w-4 text-[var(--primary)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--text-muted)]">
                              {field.label}
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                              {field.value ?? "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={
                      <User className="h-10 w-10 text-[var(--text-tertiary)]" />
                    }
                    title={t("لا توجد بيانات", "No data available")}
                  />
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  {t("الروابط السريعة", "Quick Links")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[var(--card-border)]">
                  {/* Change Password */}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/${locale}/student/profile`)
                    }
                    className="flex items-center gap-2 sm:gap-3 py-3 first:pt-0 last:pb-0 w-full text-start hover:opacity-80 transition-opacity"
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--warning)]/[0.08]">
                      <Lock className="h-4 w-4 text-[var(--warning)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        {t("تغيير كلمة المرور", "Change Password")}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-[var(--text-muted)] shrink-0 rtl:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* Language Switch */}
                  <button
                    type="button"
                    onClick={() => router.push(oppositeLocalePath)}
                    className="flex items-center gap-2 sm:gap-3 py-3 first:pt-0 last:pb-0 w-full text-start hover:opacity-80 transition-opacity"
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--primary)]/[0.08]">
                      <Globe className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        {t("اللغة", "Language")}
                      </p>
                      <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                        {isAr ? "العربية — switch to English" : "English — التبديل للعربية"}
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-[var(--text-muted)] shrink-0 rtl:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* App Info */}
            <Card>
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--surface-soft)]">
                    <Info className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                      {t("بوابة الطالب", "Student Portal")}
                    </p>
                    <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                      v1.0
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 rounded-[var(--card-radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] px-4 py-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/[0.12] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut
                ? t("جاري تسجيل الخروج...", "Logging out...")
                : t("تسجيل الخروج", "Log Out")}
            </button>
          </>
        )}
      </div>
    </StudentShell>
  );
}
