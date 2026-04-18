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
import { LanguageToggle } from "@/components/LanguageToggle";
import { SCHOOL_BRAND } from "@/lib/brand";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath, localizeAppPath, sanitizeNextPath } from "@/lib/locale-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

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
        if (response.status >= 500 || !payload) {
          setError(t("auth.loginFailed"));
        } else if (payload?.reason === "server_config") {
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
      className="relative min-h-dvh overflow-hidden"
    >
      {/* Main layout */}
      <div className="relative mx-auto grid min-h-dvh max-w-[1380px] items-center gap-8 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        
        {/* Hero section - Desktop only */}
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-[620px] space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] backdrop-blur-xl">
              <Sparkles size={16} className="text-[var(--primary)]" />
              {t("auth.loginPage.heroBadge")}
            </div>

            {/* Brand and heading */}
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
                  <div className="text-[1.6rem] font-black tracking-tight whitespace-nowrap text-[var(--text-primary)]">
                    {brandName}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)]">{brandSubtitle}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-[var(--text-primary)] xl:text-5xl">
                  {t("auth.loginPage.heroTitle")}
                </h1>
                <p className="max-w-[46rem] text-lg leading-8 text-[var(--text-secondary)]">
                  {t("auth.loginPage.heroDescription")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form section */}
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-6">
          <div 
            className="relative w-full max-w-[480px] rounded-[var(--card-radius)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] sm:p-8 lg:p-10"
            style={{ border: "1px solid var(--card-border)" }}
          >
            <div className="mb-6 flex items-center justify-end gap-2">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle variant="inline" className="auth-login__theme-switch" compact />
            </div>

            {/* Mobile brand header */}
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <SchoolLogo
                  src={runtimeBranding.logoUrl}
                  alt={brandName}
                  label={brandName}
                  size={52}
                  className="rounded-[20px]"
                  fallbackClassName="text-[1rem] font-black text-white"
                />
                <div className="space-y-0.5">
                  <div className="text-lg font-black text-[var(--text-primary)]">
                    {brandName}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">{brandSubtitle}</div>
                </div>
              </div>
            </div>

            {/* Form header */}
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-extrabold text-[var(--text-secondary)]">
                <ShieldCheck size={14} className="text-[var(--success)]" />
                {t("auth.securePlatform")}
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
                {t("auth.login")}
              </h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {t("auth.loginPage.formDescription")}
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleLogin} noValidate>
              {/* Email field */}
              <FormField
                label={t("auth.email")}
                htmlFor="email"
                required
              >
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                    style={{ insetInlineStart: "1rem" }}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-invalid={Boolean(error)}
                    className="ps-11"
                  />
                </div>
              </FormField>

              {/* Password field */}
              <FormField
                label={t("auth.password")}
                htmlFor="password"
                required
              >
                <div className="relative">
                  <KeyRound
                    size={18}
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                    style={{ insetInlineStart: "1rem" }}
                  />
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    className="ps-11 pe-12"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                    style={{ insetInlineEnd: "0.25rem" }}
                    onClick={() => setShowPass((current) => !current)}
                    aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                    title={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormField>

              {/* Global error message */}
              {error ? (
                <div 
                  className="rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-semibold text-[var(--danger)]"
                  style={{ 
                    borderColor: "color-mix(in srgb, var(--danger) 18%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)"
                  }}
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              ) : null}

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!canSubmit}
                className="w-full"
              >
                {loading ? t("common.loading") : t("auth.login")}
              </Button>

              {/* Forgot password link */}
              <div className="flex justify-center pt-1">
                <Link
                  href={localizeAppPath("/forgot-password", locale)}
                  className="inline-flex text-sm font-extrabold text-[var(--primary)] transition hover:text-[var(--primary-strong)]"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </form>

            {/* Footer section */}
            <div 
              className="mt-8 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm font-bold text-[var(--text-secondary)]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--success)]" />
                  {t("auth.loginPage.sessionNote")}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <div className="text-xs font-semibold text-[var(--text-tertiary)]">
                  {t("auth.passwordRecoveryHint")}
                </div>
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm">
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
