"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, GraduationCap, KeyRound, Mail, ShieldCheck, Sparkles, CheckCircle2 } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getAccessDecision,
  getDefaultRouteForProfile,
  type UserProfile,
} from "@/lib/auth";
import { SCHOOL_BRAND } from "@/lib/brand";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath, localizeAppPath, sanitizeNextPath } from "@/lib/locale-routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  ContactSection,
  FeaturesSection,
  LandingFooter,
  MarqueeSection,
  PlatformSection,
  ShowcaseSection,
  StepsSection,
  TestimonialsSection,
} from "@/components/landing/LandingSections";
import {
  ComparisonSection,
  FaqSection,
  GallerySection,
  IntegrationsSection,
  NewsSection,
  TrustSection,
} from "@/components/landing/LandingExtra";
import {
  ApiStatusPill,
  BeforeAfterSection,
  ChatBubble,
  HeroSideExtras,
  LastSignupBadge,
  LearningSection,
  LiveSystemSection,
  ParentsTestimonialsSection,
  RolesSection,
  SchoolsStripSection,
  SecurityBadgeSection,
  TimelineSection,
  WallSection,
} from "@/components/landing/LandingMega";
import { Reveal } from "@/components/landing/Reveal";
import {
  Counter,
  FloatingChip,
  IntroOverlay,
  ScrollProgress,
  SectionDots,
} from "@/components/landing/motion-primitives";
import {
  Constellation,
  FloatingCTA,
  MagicCursor,
  MouseParallax3D,
  SmoothLerpAnchors,
} from "@/components/landing/motion-extras";
import { getLandingContent } from "@/lib/landing-content";

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
  const logoUrl = runtimeBranding.logoUrl || "/logo-school-iraq.webp";
  const content = getLandingContent(locale);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => null)) as LoginResponse | null;
      const profile = payload?.profile ?? null;
      if (!response.ok || !payload?.ok || !profile) {
        if (response.status >= 500 || !payload) setError(t("auth.loginFailed"));
        else if (payload?.reason === "server_config") setError(t("auth.serverConfigError"));
        else if (payload?.reason === "inactive_account") setError(t("auth.inactiveAccount"));
        else if (payload?.reason === "profile_missing") setError(t("auth.profileLoadError"));
        else setError(t("auth.invalidCredentials"));
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
        if (nextDecision.allowed) targetUrl = localizedNext;
      }
      if (!targetUrl) {
        targetUrl = localizeAppPath(getDefaultRouteForProfile(profile), locale);
      }
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

  if (loginSuccess) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)]">
        <div className="success-circle flex h-24 w-24 items-center justify-center rounded-full bg-[var(--success)]">
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

  const chips = content.hero.chips;
  const dotSections = [
    { id: "top", label: locale === "en" ? "Home" : "الرئيسية" },
    { id: "features", label: content.features.eyebrow },
    { id: "roles", label: content.roles.eyebrow },
    { id: "testimonials", label: content.testimonials.eyebrow },
    { id: "faq", label: content.faq.eyebrow },
    { id: "contact", label: content.contact.eyebrow },
  ];

  const words = content.hero.typographicWords;
  const wordsPos: React.CSSProperties[] = [
    { top: "8%", left: "4%", opacity: 0.6, transform: "rotate(-6deg)" },
    { top: "30%", left: "65%", opacity: 0.4 },
    { top: "60%", left: "10%", opacity: 0.5 },
    { top: "75%", left: "55%", opacity: 0.5, transform: "rotate(4deg)" },
    { top: "15%", left: "40%", opacity: 0.3 },
    { top: "50%", left: "80%", opacity: 0.4, transform: "rotate(-3deg)" },
  ];

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="relative min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <IntroOverlay brandName={brandName} logoUrl={logoUrl} />
      <ScrollProgress rtl={isRTL} />
      <SectionDots sections={dotSections} />
      <SmoothLerpAnchors />
      <MagicCursor />
      <LandingNav brandName={brandName} brandSubtitle={brandSubtitle} logoUrl={logoUrl} nav={content.nav} />

      <main>
        {/* ── Hero + login form ── */}
        <section id="top" className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,var(--primary-soft),transparent)]" />
            <div className="landing-dotgrid absolute inset-0 opacity-60" />
            <div className="landing-blob landing-blob-1 absolute -start-24 top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] blur-[100px]" />
            <div className="landing-blob landing-blob-2 absolute -end-24 top-40 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--secondary)_22%,transparent)] blur-[100px]" />
            <div className="landing-blob landing-blob-3 absolute start-1/3 top-1/2 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] blur-[100px]" />
            <Constellation className="absolute inset-0 h-full w-full" density={50} />
            <div className="landing-words" aria-hidden="true">
              {words.map((w, i) => (
                <span key={w} style={wordsPos[i % wordsPos.length]}>{w}</span>
              ))}
            </div>
            <div className="landing-grain absolute inset-0" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <MouseParallax3D strength={6} className="text-center lg:text-start">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-extrabold text-[var(--primary-strong)] shadow-[var(--shadow-xs)]">
                  <Sparkles size={16} className="text-[var(--secondary)]" />
                  {content.hero.badge}
                </span>
              </Reveal>
              <Reveal index={1}>
                <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-5xl xl:text-6xl">
                  {content.hero.title}{" "}
                  <span className="landing-shimmer bg-[linear-gradient(120deg,var(--primary),var(--secondary),var(--primary))] bg-clip-text text-transparent">
                    {content.hero.titleAccent}
                  </span>
                </h1>
              </Reveal>
              <Reveal index={2}>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[var(--text-secondary)] lg:mx-0">
                  {content.hero.description}
                </p>
              </Reveal>
              <Reveal index={3}>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
                  <a
                    href="#login"
                    data-cursor="cta"
                    className="inline-flex w-full items-center justify-center rounded-full bg-[var(--primary)] px-7 py-3.5 text-base font-extrabold text-white shadow-[var(--shadow-primary)] transition-all hover:brightness-110 hover:shadow-[var(--shadow-lg)] sm:w-auto"
                  >
                    {content.hero.ctaPrimary}
                  </a>
                  <a
                    href="#features"
                    className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-strong)] px-7 py-3.5 text-base font-extrabold text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] sm:w-auto"
                  >
                    {content.hero.ctaSecondary}
                  </a>
                </div>
              </Reveal>
              <Reveal index={4}>
                <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-tertiary)] lg:justify-start">
                  <CheckCircle2 size={16} className="text-[var(--success)]" />
                  {content.hero.proof}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <LastSignupBadge content={content.lastSignup} />
                  <ApiStatusPill content={content.apiStatus} />
                </div>
              </Reveal>
              <Reveal index={5}>
                <dl className="mt-8 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--border)] pt-6 lg:mx-0">
                  {content.hero.stats.map((stat) => (
                    <div key={stat.label} className="text-center lg:text-start">
                      <dt dir="ltr" className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
                        <Counter to={stat.to} decimals={stat.decimals} prefix={stat.prefix} suffix={stat.suffix} />
                      </dt>
                      <dd className="mt-1 text-xs font-semibold text-[var(--text-tertiary)]">{stat.label}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
              <Reveal index={6}>
                <HeroSideExtras activity={content.hero.activity} ringLabel={isRTL ? "حضور" : "Attend."} />
              </Reveal>
            </MouseParallax3D>

            <Reveal direction="left">
              <div className="relative mx-auto w-full max-w-[460px]">
                {chips[0] ? (
                  <FloatingChip
                    delay={0.4}
                    className="absolute -top-6 -start-6 z-20 hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 shadow-[var(--shadow-lg)] lg:inline-flex"
                  >
                    {(() => {
                      const Icon = chips[0].icon;
                      return (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]">
                          <Icon size={16} />
                        </span>
                      );
                    })()}
                    <span className="leading-tight">
                      <span className="block text-[0.7rem] font-semibold text-[var(--text-tertiary)]">{chips[0].title}</span>
                      <span className="block text-sm font-black text-[var(--text-primary)]">{chips[0].value}</span>
                    </span>
                  </FloatingChip>
                ) : null}
                {chips[1] ? (
                  <FloatingChip
                    delay={0.7}
                    amplitude={8}
                    className="absolute -bottom-6 -end-5 z-20 hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 shadow-[var(--shadow-lg)] lg:inline-flex"
                  >
                    {(() => {
                      const Icon = chips[1].icon;
                      return (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                          <Icon size={16} />
                        </span>
                      );
                    })()}
                    <span className="leading-tight">
                      <span className="block text-[0.7rem] font-semibold text-[var(--text-tertiary)]">{chips[1].title}</span>
                      <span className="block text-sm font-black text-[var(--text-primary)]">{chips[1].value}</span>
                    </span>
                  </FloatingChip>
                ) : null}

                <div
                  id="login"
                  className="relative scroll-mt-24 rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-xl)] sm:p-8"
                >
                  <div className="mb-6 space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--primary-strong)]">
                      <ShieldCheck size={14} className="text-[var(--success)]" />
                      {t("auth.securePlatform")}
                    </span>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">{t("auth.login")}</h2>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">{t("auth.loginPage.formDescription")}</p>
                  </div>

                  <form className="space-y-5" onSubmit={handleLogin} noValidate>
                    <FormField label={t("auth.email")} htmlFor="email" required>
                      <div className="relative">
                        <Mail size={18} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ insetInlineStart: "1rem" }} />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("auth.emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          error={Boolean(error)}
                          aria-invalid={Boolean(error)}
                          className="ps-11 landing-focus-glow"
                        />
                      </div>
                    </FormField>

                    <FormField label={t("auth.password")} htmlFor="password" required>
                      <div className="relative">
                        <KeyRound size={18} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" style={{ insetInlineStart: "1rem" }} />
                        <Input
                          id="password"
                          type={showPass ? "text" : "password"}
                          placeholder={t("auth.passwordPlaceholder")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          error={Boolean(error)}
                          aria-invalid={Boolean(error)}
                          className="ps-11 pe-12 landing-focus-glow"
                        />
                        <button
                          type="button"
                          className="absolute top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                          style={{ insetInlineEnd: "0.25rem" }}
                          onClick={() => setShowPass((c) => !c)}
                          aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                          title={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                        >
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormField>

                    {error ? (
                      <div
                        className="rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-semibold text-[var(--danger)]"
                        style={{
                          borderColor: "color-mix(in srgb, var(--danger) 18%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)",
                        }}
                        role="alert"
                        aria-live="polite"
                      >
                        {error}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      disabled={!canSubmit}
                      data-cursor="cta"
                      className="landing-button-shimmer w-full"
                      style={{
                        background: canSubmit ? "linear-gradient(135deg, var(--primary), var(--secondary))" : undefined,
                      }}
                    >
                      {loading ? t("common.loading") : t("auth.login")}
                    </Button>

                    <div className="flex flex-col items-center gap-2 pt-1">
                      <Link
                        href={localizeAppPath("/forgot-password", locale)}
                        className="inline-flex text-sm font-extrabold text-[var(--primary)] transition hover:text-[var(--primary-strong)]"
                      >
                        {t("auth.forgotPassword")}
                      </Link>
                      <Link
                        href={localizeAppPath("/student-login", locale)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--primary)]"
                      >
                        <GraduationCap size={16} />
                        {isRTL
                          ? "تسجيل دخول الطالب"
                          : "Student Login"}
                      </Link>
                    </div>
                  </form>

                  <div className="mt-6 flex items-center justify-center gap-2 border-t border-[var(--border)] pt-5 text-xs font-semibold text-[var(--text-tertiary)]">
                    <ShieldCheck size={14} className="text-[var(--success)]" />
                    {t("auth.loginPage.sessionNote")}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <MarqueeSection content={content.marquee} />
        <SchoolsStripSection content={content.schoolsStrip} />
        <LiveSystemSection content={content.liveSystem} />
        <PlatformSection content={content.platform} />
        {content.showcases.map((showcase, i) => (
          <ShowcaseSection key={showcase.id} content={showcase} index={i} />
        ))}
        <GallerySection content={content.gallery} />
        <TimelineSection content={content.timeline} />
        <RolesSection content={content.roles} />
        <FeaturesSection content={content.features} />
        <IntegrationsSection content={content.integrations} />
        <ComparisonSection content={content.comparison} />
        <TestimonialsSection content={content.testimonials} />
        <ParentsTestimonialsSection content={content.parentsTestimonials} />
        <WallSection content={content.wall} />
        <BeforeAfterSection content={content.beforeAfter} />
        <TrustSection content={content.trust} />
        <SecurityBadgeSection content={content.securityBadge} />
        <StepsSection content={content.steps} />
        <LearningSection content={content.learning} />
        <NewsSection content={content.news} />
        <FaqSection content={content.faq} />
        <ContactSection content={content.contact} />
      </main>

      <LandingFooter
        brandName={brandName}
        brandSubtitle={brandSubtitle}
        logoUrl={logoUrl}
        nav={content.nav}
        footer={content.footer}
        year={currentYear}
      />

      <FloatingCTA text={content.floatingCta.text} button={content.floatingCta.button} href="#login" />
      <ChatBubble content={content.chat} email={content.contact.email} />
    </div>
  );
}
