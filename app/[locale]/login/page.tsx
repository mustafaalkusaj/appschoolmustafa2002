"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getAccessDecision,
  getDefaultRouteForRole,
  type UserProfile,
} from "@/lib/auth";
import { SchoolLogo } from "@/components/brand";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { SCHOOL_BRAND } from "@/lib/brand";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath, localizeAppPath, sanitizeNextPath } from "@/lib/locale-routing";

type LoginResponse = {
  ok: boolean;
  profile?: UserProfile;
  reason?: "invalid_credentials" | "profile_missing" | "inactive_account" | "server_config";
};

export default function LoginPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isRTL = locale === "ar";
  const brandName = runtimeBranding.schoolName || SCHOOL_BRAND.nameAr;
  const brandSubtitle = locale === "en" ? SCHOOL_BRAND.subtitleEn : SCHOOL_BRAND.subtitleAr;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !loading;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as LoginResponse | null;
      const profile = payload?.profile ?? null;

      if (!response.ok || !payload?.ok || !profile) {
        if (payload?.reason === "server_config") {
          setError(t("auth.serverConfigError"));
        } else if (payload?.reason === "inactive_account") {
          setError(t("auth.inactiveAccount"));
        } else if (payload?.reason === "profile_missing") {
          setError(t("auth.profileLoadError"));
        } else {
          setError(t("auth.invalidCredentials"));
        }
        setLoading(false);
        return;
      }

      const requestedNext =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
      const safeNext = sanitizeNextPath(requestedNext);
      const localizedNext = safeNext ? localizeAppPath(safeNext, locale) : null;

      if (localizedNext) {
        const nextDecision = getAccessDecision(profile, localizedNext);
        if (nextDecision.allowed) {
          window.location.href = localizedNext;
          return;
        }
      }

      const defaultPath = localizeAppPath(getDefaultRouteForRole(profile.role), locale);
      const defaultDecision = getAccessDecision(profile, defaultPath);

      if (!defaultDecision.allowed) {
        if (defaultDecision.reason === "subscription_expired" || defaultDecision.reason === "school_inactive") {
          window.location.href = localizeAppPath("/subscription-expired", locale);
          return;
        }

        window.location.href = localizeAppPath("/access-denied", locale);
        return;
      }

      window.location.href = defaultPath;
      return;
    } catch {
      setError(t("auth.loginFailed"));
      setLoading(false);
      return;
    }
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative min-h-dvh overflow-hidden px-4 py-5 sm:px-6 lg:px-8"
    >
      <div className="ui-grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-[-18%] h-[38rem] rounded-full bg-[radial-gradient(circle,rgba(121,215,255,0.18),transparent_62%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.22),transparent_60%)] blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-[1380px] items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="space-y-8">
            <div className="max-w-[620px] space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] backdrop-blur-xl">
                <Sparkles size={16} className="text-[var(--primary)]" />
                تجربة عربية هادئة ومصقولة لإدارة المدرسة
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <SchoolLogo
                    src={runtimeBranding.logoUrl}
                    alt={brandName}
                    label={brandName}
                    size={72}
                    className="rounded-[28px]"
                    fallbackClassName="text-[1.1rem] font-black text-white"
                  />
                  <div className="space-y-1">
                    <div className="text-[1.6rem] font-black tracking-tight whitespace-nowrap [word-break:keep-all] text-[var(--text-primary)]">
                      {brandName}
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-secondary)]">{brandSubtitle}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl font-black leading-tight text-[var(--text-primary)] xl:text-5xl">
                    منصة مدرسية أكثر هدوءاً، أوضح في التسلسل، وأفضل في الثقة والاستخدام اليومي.
                  </h1>
                  <p className="max-w-[46rem] text-lg leading-8 text-[var(--text-secondary)]">
                    تسجيل دخول آمن مع واجهة عربية أولاً، دعم كامل للوضع الفاتح والداكن والتلقائي، وتجربة
                    مصممة لتقليل التشويش ورفع وضوح المهام الأساسية.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </section>

        <section className="relative flex items-center justify-center">
          <div className="ui-glass relative w-full max-w-[560px] rounded-[32px] p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)]" />

            <div className="mb-8 flex items-start gap-4">
              <div className="space-y-4">
                <div className="lg:hidden">
                  <div className="flex items-center gap-3">
                    <SchoolLogo
                      src={runtimeBranding.logoUrl}
                      alt={brandName}
                      label={brandName}
                      size={58}
                      className="rounded-[22px]"
                      fallbackClassName="text-[1rem] font-black text-white"
                    />
                    <div className="space-y-0.5">
                      <div className="text-[1.08rem] font-black whitespace-nowrap [word-break:keep-all] text-[var(--text-primary)]">
                        {brandName}
                      </div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">{brandSubtitle}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-extrabold text-[var(--text-secondary)]">
                    <ShieldCheck size={14} className="text-[var(--success)]" />
                    {t("auth.securePlatform")}
                  </div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-[2rem]">
                    {t("auth.login")}
                  </h2>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    أدخل بياناتك للوصول إلى لوحة المدرسة والبدء من حيث توقفت.
                  </p>
                </div>
              </div>

            </div>

            <form className="space-y-5" onSubmit={handleLogin} noValidate>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-extrabold text-[var(--text-primary)]">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute top-1/2 text-[var(--text-tertiary)]"
                    style={{ insetInlineStart: "1rem", transform: "translateY(-50%)" }}
                  />
                  <input
                    id="email"
                    type="email"
                    className="ui-input"
                    style={{ paddingInlineStart: "3rem", direction: "ltr" }}
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-extrabold text-[var(--text-primary)]">
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="pointer-events-none absolute top-1/2 text-[var(--text-tertiary)]"
                    style={{ insetInlineStart: "1rem", transform: "translateY(-50%)" }}
                  />
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    className="ui-input"
                    style={{ paddingInlineStart: "3rem", paddingInlineEnd: "3rem" }}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]"
                    style={{ insetInlineEnd: "0.65rem" }}
                    onClick={() => setShowPass((current) => !current)}
                    aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    title={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  href={localizeAppPath("/forgot-password", locale)}
                  className="text-sm font-extrabold text-[var(--primary)] transition hover:text-[var(--primary-strong)]"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              {error ? (
                <div className="rounded-[22px] border border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.12)] px-4 py-3 text-sm font-semibold text-[var(--danger)]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="ui-button ui-button--primary inline-flex w-full items-center justify-center gap-3 text-base"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    {t("auth.login")}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm font-bold text-[var(--text-secondary)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--success)]" />
                  جلسة آمنة مع تهيئة ثيم متوافقة مع الجهاز
                </div>
                <ThemeModeToggle variant="inline" compact />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <div className="text-[0.8rem] font-semibold text-[var(--text-tertiary)]">
                  {t("auth.passwordRecoveryHint")}
                </div>
                <div className="inline-flex items-center gap-2 text-[0.8rem] sm:text-sm">
                  <span>© {currentYear}</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)]" />
                  <span>{t("common.allRightsReserved")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
