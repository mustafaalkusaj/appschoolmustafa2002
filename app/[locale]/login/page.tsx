"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, Sparkles } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  getAccessDecision,
  getDefaultRouteForRole,
  getUserProfileById,
  refreshRBACSessionCookie,
  signOutClient,
} from "@/lib/auth";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { UltrathinkLogo } from "@/components/brand";
import { SCHOOL_BRAND } from "@/lib/brand";
import { getLocaleFromPath, localizeAppPath, sanitizeNextPath } from "@/lib/locale-routing";

export default function LoginPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isRTL = locale === "ar";

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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.error("[Login] Sign in error:", signInError);
      const message = (signInError.message || "").toLowerCase();
      if (message.includes("invalid api key") || message.includes("apikey") || message.includes("api key")) {
        setError(t("auth.supabaseConfigError"));
      } else {
        setError(t("auth.invalidCredentials"));
      }
      setLoading(false);
      return;
    }

    if (!data?.user?.id) {
      setError(t("auth.loginFailed"));
      setLoading(false);
      return;
    }

    const profile = await getUserProfileById(data.user.id);
    if (!profile) {
      setError(t("auth.profileLoadError"));
      setLoading(false);
      return;
    }

    if (!profile.is_active) {
      await signOutClient();
      setError(t("auth.inactiveAccount"));
      setLoading(false);
      return;
    }

    try {
      await refreshRBACSessionCookie(profile, {
        strict: true,
        accessToken: data.session?.access_token ?? null,
      });
    } catch {
      await supabase.auth.signOut();
      setError(t("auth.serverConfigError"));
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
        <section className="hidden lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="inline-flex">
              <ThemeModeToggle variant="inline" />
            </div>

            <div className="max-w-[620px] space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-extrabold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] backdrop-blur-xl">
                <Sparkles size={16} className="text-[var(--primary)]" />
                تجربة عربية هادئة ومصقولة لإدارة المدرسة
              </div>

              <div className="space-y-5">
                <UltrathinkLogo
                  size={72}
                  title={SCHOOL_BRAND.nameAr}
                  subtitle={SCHOOL_BRAND.nameEn}
                  titleClassName="text-[1.6rem] font-black tracking-tight"
                  subtitleClassName="text-sm font-semibold text-[var(--text-secondary)]"
                />

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

          <div className="grid max-w-[720px] gap-4 md:grid-cols-3">
            {[
              {
                title: "حماية موثوقة",
                text: "الحفاظ على تدفق المصادقة الحالي مع حالات خطأ واضحة وسريعة الفهم.",
              },
              {
                title: "جاهزية مؤسسية",
                text: "سطوح مريحة للعين ومساحات مدروسة لواجهة مدرسة حديثة وقابلة للتوسع.",
              },
              {
                title: "دعم كامل للعربية",
                text: "محاذاة RTL سليمة، هرمية نصية قوية، وحضور بصري هادئ على كل المقاسات.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="ui-glass rounded-[28px] border border-[var(--border)] p-5 text-right"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="mb-2 text-base font-black text-[var(--text-primary)]">{item.title}</h2>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center">
          <div className="ui-glass relative w-full max-w-[560px] rounded-[32px] p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)]" />

            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="lg:hidden">
                  <UltrathinkLogo
                    size={58}
                    title={SCHOOL_BRAND.nameAr}
                    subtitle={SCHOOL_BRAND.nameEn}
                    titleClassName="text-[1.08rem] font-black"
                    subtitleClassName="text-xs font-semibold text-[var(--text-secondary)]"
                  />
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

              <div className="lg:hidden">
                <ThemeModeToggle variant="inline" showLabels={false} compact />
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
                    placeholder="••••••••"
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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--success)]" />
                جلسة آمنة مع تهيئة ثيم متوافقة مع الجهاز
              </div>
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm">
                <span>© {currentYear}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--text-tertiary)]" />
                <span>{t("common.allRightsReserved")}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
              {[
                "دعم RTL كامل",
                "حالات تركيز واضحة",
                "تجربة متزنة على الهاتف",
              ].map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-xs font-extrabold text-[var(--text-secondary)]"
                >
                  <Sparkles size={13} className="text-[var(--secondary)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
