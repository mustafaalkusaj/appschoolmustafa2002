"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles, Users, Wallet, CalendarDays, CheckCircle2, MessageSquare } from "@/lib/icons";
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

type LoginResponse = {
  ok: boolean;
  profile?: UserProfile;
  reason?: "invalid_credentials" | "profile_missing" | "inactive_account" | "server_config";
};

const FEATURES = {
  ar: [
    { icon: Users, label: "إدارة الطلاب", desc: "سجلات شاملة ومتابعة" },
    { icon: Wallet, label: "الحسابات والمالية", desc: "تحصيل ومتابعة الرسوم" },
    { icon: CalendarDays, label: "الحضور والغياب", desc: "تسجيل يومي ومتابعة" },
  ],
  en: [
    { icon: Users, label: "Student Management", desc: "Comprehensive records" },
    { icon: Wallet, label: "Finance & Billing", desc: "Fee collection & tracking" },
    { icon: CalendarDays, label: "Attendance", desc: "Daily tracking & reports" },
  ],
} as const;

const TESTIMONIALS = {
  ar: [
    { text: "النظام سهّل علينا إدارة الطلاب والحسابات بشكل كامل، ووفّر وقت كبير على الكادر الإداري", author: "مدير مدرسة" },
    { text: "أفضل منصة تعليمية استخدمناها — سهلة ومتكاملة وتدعم كل احتياجاتنا", author: "مديرة مدرسة" },
  ],
  en: [
    { text: "The system made managing students and finances effortless, saving our admin staff significant time", author: "School Principal" },
    { text: "Best educational platform we've used — intuitive, comprehensive, and covers all our needs", author: "School Director" },
  ],
} as const;

export default function LoginPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isRTL = locale === "ar";
  const brandName = runtimeBranding.schoolName || SCHOOL_BRAND.nameAr;
  const brandSubtitle = locale === "en" ? SCHOOL_BRAND.subtitleEn : SCHOOL_BRAND.subtitleAr;
  const features = FEATURES[locale === "en" ? "en" : "ar"];
  const testimonials = TESTIMONIALS[locale === "en" ? "en" : "ar"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !loading;

  // Cycle testimonials
  const testimonialIndex = useMemo(() => Math.floor(Math.random() * testimonials.length), [testimonials.length]);

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

      let targetUrl = "";

      if (localizedNext) {
        const nextDecision = getAccessDecision(profile, localizedNext);
        if (nextDecision.allowed) {
          targetUrl = localizedNext;
        }
      }

      if (!targetUrl) {
        const defaultPath = localizeAppPath(getDefaultRouteForProfile(profile), locale);
        const defaultDecision = getAccessDecision(profile, defaultPath);

        if (!defaultDecision.allowed) {
          if (defaultDecision.reason === "subscription_expired" || defaultDecision.reason === "school_inactive") {
            targetUrl = localizeAppPath("/subscription-expired", locale);
          } else {
            targetUrl = localizeAppPath("/access-denied", locale);
          }
        } else {
          targetUrl = defaultPath;
        }
      }

      // Show success animation then redirect
      setRedirectUrl(targetUrl);
      setLoginSuccess(true);
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 1200);
    } catch {
      setError(t("auth.loginFailed"));
      setLoading(false);
      return;
    }
  }

  // Success animation overlay
  if (loginSuccess) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--card-bg)]">
        <style>{`
          @keyframes successCircle { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
          @keyframes successCheck { 0% { stroke-dashoffset: 50; } 100% { stroke-dashoffset: 0; } }
          @keyframes successText { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
          .success-circle { animation: successCircle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .success-check { stroke-dasharray: 50; stroke-dashoffset: 50; animation: successCheck 0.4s ease 0.3s forwards; }
          .success-text { animation: successText 0.4s ease 0.6s forwards; opacity: 0; }
        `}</style>
        <div className="success-circle flex h-24 w-24 items-center justify-center rounded-full bg-[#20B96B]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path className="success-check" d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="success-text mt-6 text-xl font-black text-[var(--text-primary)]">
          {isRTL ? "تم تسجيل الدخول بنجاح" : "Login Successful"}
        </p>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="login-page-bg relative min-h-dvh overflow-hidden"
    >
      {/* Animated gradient background — full page */}
      <style>{`
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -40px); } }
        @keyframes float2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, 30px); } }
        @keyframes float3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(15px, 20px); } }
        @keyframes fadeSlideUp { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .login-page-bg { background: linear-gradient(-45deg, #062B63, #031B3F, #13AEEA, #062B63); background-size: 400% 400%; animation: gradientShift 12s ease infinite; }
        .login-hero-bg { background: transparent; }
        .blob1 { animation: float1 18s ease-in-out infinite; }
        .blob2 { animation: float2 22s ease-in-out infinite; }
        .blob3 { animation: float3 16s ease-in-out infinite; }
        .fade-up { animation: fadeSlideUp 0.6s ease forwards; opacity: 0; }
        .fade-up-1 { animation-delay: 0s; }
        .fade-up-2 { animation-delay: 0.1s; }
        .fade-up-3 { animation-delay: 0.2s; }
        .fade-up-4 { animation-delay: 0.3s; }
        .fade-up-5 { animation-delay: 0.4s; }
        .fade-up-6 { animation-delay: 0.5s; }
        /* Login form overrides for dark bg */
        .login-page-bg .shell-utility-button,
        .login-page-bg .auth-login__theme-switch { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.15) !important; color: white !important; }
        .login-page-bg .shell-utility-button:hover,
        .login-page-bg .auth-login__theme-switch:hover { background: rgba(255,255,255,0.2) !important; }
        .login-page-bg input { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.2) !important; color: white !important; }
        .login-page-bg input::placeholder { color: rgba(255,255,255,0.4) !important; }
        .login-page-bg input:focus { border-color: #13AEEA !important; box-shadow: 0 0 0 2px rgba(19,174,234,0.3) !important; }
        .login-page-bg label { color: rgba(255,255,255,0.9) !important; }
        .login-page-bg .text-\[var\(--text-tertiary\)\] { color: rgba(255,255,255,0.4) !important; }
        .login-page-bg .text-\[var\(--danger\)\] { color: #ff6b6b !important; }
      `}</style>

      {/* Page-level animated blobs */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="blob1 absolute -top-32 -start-32 h-96 w-96 rounded-full bg-white/5 blur-[100px]" />
        <div className="blob2 absolute -bottom-32 -end-32 h-80 w-80 rounded-full bg-[#13AEEA]/10 blur-[100px]" />
        <div className="blob3 absolute top-1/3 start-1/2 h-72 w-72 rounded-full bg-[#F5C84C]/5 blur-[100px]" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-[1380px] items-center gap-8 px-4 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">

        {/* Hero section - Desktop only */}
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="login-hero-bg relative max-w-[620px] space-y-8 rounded-[32px] p-10 overflow-hidden">
            {/* Animated blobs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="blob1 absolute -top-20 -start-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
              <div className="blob2 absolute -bottom-16 -end-16 h-48 w-48 rounded-full bg-[#13AEEA]/10 blur-3xl" />
              <div className="blob3 absolute top-1/2 start-1/2 h-40 w-40 rounded-full bg-[#F5C84C]/5 blur-3xl" />
            </div>

            <div className="relative z-10 space-y-8">
              {/* Badge */}
              <div className="fade-up fade-up-1 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold text-white/90 backdrop-blur-xl">
                <Sparkles size={16} className="text-[#F5C84C]" />
                {t("auth.loginPage.heroBadge")}
              </div>

              {/* Brand and heading */}
              <div className="space-y-5">
                <div className="fade-up fade-up-2 flex items-center gap-4">
                  <SchoolLogo
                    src={runtimeBranding.logoUrl || "/logo-school-iraq.png"}
                    alt={brandName}
                    label={brandName}
                    size={96}
                    className="rounded-[28px] ring-4 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
                    fallbackClassName="text-[1.1rem] font-black text-white"
                  />
                  <div className="space-y-1">
                    <div className="text-[1.8rem] font-black tracking-tight whitespace-nowrap text-white">
                      {brandName}
                    </div>
                    <div className="text-sm font-semibold text-white/70">{brandSubtitle}</div>
                  </div>
                </div>

                <div className="fade-up fade-up-3 space-y-4">
                  <h1 className="text-3xl font-black leading-tight text-white xl:text-4xl">
                    {t("auth.loginPage.heroTitle")}
                  </h1>
                  <p className="max-w-[46rem] text-base leading-8 text-white/70">
                    {t("auth.loginPage.heroDescription")}
                  </p>
                </div>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-3">
                {features.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.label}
                      className={`fade-up fade-up-${i + 4} rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition-all hover:bg-white/15`}
                    >
                      <Icon size={22} className="text-[#13AEEA] mb-2" />
                      <div className="text-sm font-black text-white">{feature.label}</div>
                      <div className="text-[11px] text-white/60 mt-1">{feature.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Testimonial */}
              <div className="fade-up fade-up-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <MessageSquare size={20} className="text-[#F5C84C] mb-2 opacity-60" />
                <p className="text-sm leading-7 text-white/80 italic">
                  &ldquo;{testimonials[testimonialIndex].text}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1 w-6 rounded-full bg-[#F5C84C]" />
                  <span className="text-xs font-bold text-white/60">{testimonials[testimonialIndex].author}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form section — Glassmorphism */}
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-6">
          <div
            className="fade-up fade-up-2 relative w-full max-w-[480px] rounded-[var(--card-radius)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.15)] sm:p-8 lg:p-10"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <div className="mb-6 flex items-center justify-end gap-2">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle variant="inline" className="auth-login__theme-switch" compact />
            </div>

            {/* Mobile brand header */}
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <SchoolLogo
                  src={runtimeBranding.logoUrl || "/logo-school-iraq.png"}
                  alt={brandName}
                  label={brandName}
                  size={52}
                  className="rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                  fallbackClassName="text-[1rem] font-black text-white"
                />
                <div className="space-y-0.5">
                  <div className="text-lg font-black text-white">
                    {brandName}
                  </div>
                  <div className="text-xs font-semibold text-white/70">{brandSubtitle}</div>
                </div>
              </div>
            </div>

            {/* Form header */}
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white/80">
                <ShieldCheck size={14} className="text-[#20B96B]" />
                {t("auth.securePlatform")}
              </div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                {t("auth.login")}
              </h2>
              <p className="text-sm leading-7 text-white/70">
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

              {/* Submit button — gradient */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!canSubmit}
                className="w-full"
                style={{
                  background: canSubmit ? "linear-gradient(135deg, #062B63, #13AEEA)" : undefined,
                }}
              >
                {loading ? t("common.loading") : t("auth.login")}
              </Button>

              {/* Forgot password link */}
              <div className="flex justify-center pt-1">
                <Link
                  href={localizeAppPath("/forgot-password", locale)}
                  className="inline-flex text-sm font-extrabold text-[#13AEEA] transition hover:text-white"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </form>

            {/* Footer section */}
            <div
              className="mt-8 rounded-[var(--radius-xl)] border border-white/10 bg-white/5 px-4 py-4 text-sm font-bold text-white/70"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#20B96B]" />
                  {t("auth.loginPage.sessionNote")}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div className="text-xs font-semibold text-white/50">
                  {t("auth.passwordRecoveryHint")}
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-white/50 sm:text-sm">
                  <span>© {currentYear}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
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
