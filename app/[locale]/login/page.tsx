"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getAccessDecision,
  getDefaultRouteForProfile,
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
import s from "./login.module.css";

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

      const defaultPath = localizeAppPath(getDefaultRouteForProfile(profile), locale);
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
      className={s.loginRoot}
    >
      {/* Main layout */}
      <div className={`${s.loginGrid} relative mx-auto grid min-h-dvh max-w-[1380px] items-center gap-8 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8`}>

        {/* Hero section - Desktop */}
        <section className={`hidden lg:flex lg:flex-col lg:justify-center ${s.animateIn}`}>
          <div className="max-w-[620px] space-y-8">
            {/* Badge */}
            <div className={`${s.animateIn} ${s.delay1} inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] backdrop-blur-xl`}>
              <Sparkles size={16} className="text-[var(--primary)]" />
              {t("auth.loginPage.heroBadge")}
            </div>

            {/* Brand and heading */}
            <div className={`${s.animateIn} ${s.delay2} space-y-5`}>
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
                  <div className={`${s.goldDivider} text-sm font-semibold text-[var(--text-secondary)]`}>{brandSubtitle}</div>
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

            {/* Illustration */}
            <div className={`${s.animateIn} ${s.delay3}`}>
              <BookIllustration />
            </div>

            {/* Value cards */}
            <div className={`${s.valueCards} ${s.animateIn} ${s.delay4}`}>
              <div className={s.valueCard}>
                <div className={s.valueIcon}><EducationIcon /></div>
                <div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">{isRTL ? "التعليم" : "Education"}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{isRTL ? "محتوى تعليمي موثوق" : "Trusted content"}</div>
                </div>
              </div>
              <div className={s.valueCard}>
                <div className={s.valueIcon}><GrowthIcon /></div>
                <div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">{isRTL ? "النمو" : "Growth"}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{isRTL ? "تطوير المهارات" : "Skill building"}</div>
                </div>
              </div>
              <div className={s.valueCard}>
                <div className={s.valueIcon}><OpportunityIcon /></div>
                <div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">{isRTL ? "الفرص" : "Opportunity"}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{isRTL ? "أبواب المستقبل" : "Future doors"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form section */}
        <section className={`${s.animateIn} ${s.delay2} relative flex items-center justify-center px-4 py-8 sm:px-6`}>
          <div
            className={`${s.formCard} relative w-full max-w-[480px] rounded-[var(--card-radius)] p-6 sm:p-8 lg:p-10`}
          >
            <div className="mb-6 flex items-center justify-end gap-2">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle variant="inline" className="auth-login__theme-switch" compact />
            </div>

            {/* Mobile brand header + mini illustration */}
            <div className={`${s.mobileHero} mb-6 lg:hidden`}>
              <div className="flex items-center justify-center gap-3 mb-4">
                <SchoolLogo
                  src={runtimeBranding.logoUrl}
                  alt={brandName}
                  label={brandName}
                  size={52}
                  className="rounded-[20px]"
                  fallbackClassName="text-[1rem] font-black text-white"
                />
                <div className="text-start space-y-0.5">
                  <div className="text-lg font-black text-[var(--text-primary)]">
                    {brandName}
                  </div>
                  <div className={`${s.goldDivider} text-xs font-semibold text-[var(--text-secondary)]`}>{brandSubtitle}</div>
                </div>
              </div>
              <h2>{isRTL ? "طريقك للتعلم والفرص" : "Your path to learning"}</h2>
            </div>

            {/* Form header */}
            <div className={`${s.animateIn} ${s.delay3} mb-8 space-y-3`}>
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
              <div className={`${s.animateIn} ${s.delay4}`}>
                <FormField
                  label={t("auth.email")}
                  htmlFor="email"
                  required
                >
                  <div className={`relative ${s.inputFocusGlow}`} style={{ borderRadius: "var(--input-radius)" }}>
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
                      autoFocus
                      aria-invalid={Boolean(error)}
                      className="ps-11"
                    />
                  </div>
                </FormField>
              </div>

              {/* Password field */}
              <div className={`${s.animateIn} ${s.delay5}`}>
                <FormField
                  label={t("auth.password")}
                  htmlFor="password"
                  required
                >
                  <div className={`relative ${s.inputFocusGlow}`} style={{ borderRadius: "var(--input-radius)" }}>
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
              </div>

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
              <div className={`${s.animateIn} ${s.delay6}`}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={!canSubmit}
                  className={`w-full ${s.submitButton}`}
                >
                  {loading ? t("common.loading") : t("auth.login")}
                </Button>
              </div>

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

/* ── Book/Door/Path Illustration (CSS art inspired by brand logo) ── */

function BookIllustration() {
  return (
    <div className={s.illustration} aria-hidden="true">
      <div className={s.bookGlow} />
      <div className={s.starGold}>✦</div>
      <div className={s.bookPageLeft} />
      <div className={s.bookPageRight} />
      <div className={s.innerPageLeft} />
      <div className={s.innerPageRight} />
      <div className={s.door} />
      <div className={s.stairsPath}>
        <span className={s.stairStep} style={{ top: "15%", width: "40%" }} />
        <span className={s.stairStep} style={{ top: "30%", width: "50%" }} />
        <span className={s.stairStep} style={{ top: "47%", width: "60%" }} />
        <span className={s.stairStep} style={{ top: "65%", width: "70%" }} />
        <span className={s.stairStep} style={{ top: "83%", width: "80%" }} />
      </div>
    </div>
  );
}

/* ── Value icons (matching brand identity) ── */

function EducationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L2 8.5l10 5.5 10-5.5L12 3Z" fill="#062B63" />
      <path d="M4 10v5.5c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5V10" stroke="#13AEEA" strokeWidth="1.5" fill="none" />
      <path d="M20 10v6" stroke="#F5C84C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GrowthIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="14" width="4" height="7" rx="1" fill="#13AEEA" />
      <rect x="10" y="9" width="4" height="12" rx="1" fill="#062B63" />
      <rect x="17" y="4" width="4" height="17" rx="1" fill="#13AEEA" />
      <path d="M4 8l5-4 4 3 6-5" stroke="#F5C84C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z" fill="#F5C84C" />
      <path d="M5 16l1 2.5L8.5 20 6 21l-1 2.5L4 21l-2.5-1L4 18.5 5 16Z" fill="#20B96B" opacity="0.7" />
      <path d="M19 14l.8 2 2.2.8-2.2.8-.8 2-.8-2-2.2-.8 2.2-.8.8-2Z" fill="#13AEEA" opacity="0.7" />
    </svg>
  );
}
