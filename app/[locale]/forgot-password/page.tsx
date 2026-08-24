"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { SchoolLogo } from "@/components/brand";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useRuntimeBranding } from "@/hooks/brand";
import { KeyRound, Mail, ShieldCheck } from "@/lib/icons";
import { SCHOOL_BRAND } from "@/lib/brand";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { supabase } from "@/lib/supabase";

type RequestPayload = {
  ok?: boolean;
  error?: {
    message?: string;
    fieldErrors?: Record<string, string | undefined>;
  };
};

type PageView = "request" | "sent" | "recovery" | "done";

function readRecoveryIntent(searchParams: URLSearchParams) {
  if (searchParams.get("mode") === "recovery") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const hash = window.location.hash;
  return hash.includes("type=recovery") || hash.includes("access_token=");
}

function ForgotPasswordFallback() {
  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[680px] items-center justify-center">
        <div className="ui-glass w-full rounded-[32px] p-6 sm:p-8">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
            <div className="space-y-4 animate-pulse">
              <div className="mx-auto h-16 w-16 rounded-[22px] bg-[var(--surface-muted)]" />
              <div className="mx-auto h-6 w-56 rounded-full bg-[var(--surface-muted)]" />
              <div className="mx-auto h-4 w-full max-w-[24rem] rounded-full bg-[var(--surface-muted)]" />
              <div className="h-12 rounded-[var(--input-radius)] bg-[var(--surface-muted)]" />
              <div className="h-12 rounded-[var(--button-radius)] bg-[var(--surface-muted)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const brandName = runtimeBranding.schoolName || SCHOOL_BRAND.nameAr;
  const isRTL = locale === "ar";

  const [view, setView] = useState<PageView>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recoveryIntent = useMemo(
    () => readRecoveryIntent(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    async function resolveRecoveryState() {
      if (!recoveryIntent) {
        if (active) {
          setView((current) => (current === "done" ? current : "request"));
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (data.session?.user) {
        setView("recovery");
        setError("");
        return;
      }

      setView("request");
      setError(t("auth.recoveryLinkInvalid"));
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!active) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || (recoveryIntent && session?.user)) {
        setView("recovery");
        setError("");
      }
    });

    void resolveRecoveryState();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [recoveryIntent, t]);

  const requestDisabled = submitting || email.trim().length === 0;
  const recoveryDisabled =
    submitting || password.trim().length < 10 || confirmPassword.trim().length < 10;

  async function handlePasswordResetRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          email,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as RequestPayload | null;
      if (!response.ok || !payload?.ok) {
        if (response.status === 429) {
          setError(t("auth.forgotPasswordRateLimited"));
        } else {
          setError(
            payload?.error?.fieldErrors?.email ||
              payload?.error?.message ||
              t("auth.forgotPasswordFailed"),
          );
        }
        return;
      }

      setView("sent");
      setMessage(t("auth.forgotPasswordEmailSentDescription"));
    } catch {
      setError(t("auth.forgotPasswordFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError(t("auth.recoveryLinkInvalid"));
      return;
    }

    if (password.trim().length < 10) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || t("auth.passwordUpdateFailed"));
        return;
      }

      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }

      setPassword("");
      setConfirmPassword("");
      setView("done");
      setMessage(t("auth.passwordUpdatedSuccess"));
    } catch {
      setError(t("auth.passwordUpdateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  function renderRequestCard() {
    return (
      <form className="space-y-5" onSubmit={handlePasswordResetRequest} noValidate>
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--primary)]/10 text-[var(--primary)]">
            <Mail size={28} />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {t("auth.forgotPasswordTitle")}
          </h1>
          <p className="mx-auto max-w-[38rem] leading-relaxed text-[var(--text-muted)]">
            {t("auth.forgotPasswordDescription")}
          </p>
        </div>

        <FormField label={t("auth.email")} htmlFor="forgot-password-email" required>
          <Input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            autoComplete="email"
            required
            aria-invalid={Boolean(error)}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={requestDisabled}
        >
          {submitting ? t("auth.forgotPasswordSubmitting") : t("auth.forgotPasswordSubmit")}
        </Button>
      </form>
    );
  }

  function renderSentCard() {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto inline-flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--success)]/10 text-[var(--success)]">
          <ShieldCheck size={28} />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {t("auth.forgotPasswordEmailSentTitle")}
          </h1>
          <p className="mx-auto max-w-[38rem] leading-relaxed text-[var(--text-muted)]">
            {message || t("auth.forgotPasswordEmailSentDescription")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setView("request");
            setMessage("");
            setError("");
          }}
        >
          {t("auth.forgotPasswordRequestAnother")}
        </Button>
      </div>
    );
  }

  function renderRecoveryCard() {
    return (
      <form className="space-y-5" onSubmit={handlePasswordUpdate} noValidate>
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--primary)]/10 text-[var(--primary)]">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {t("auth.recoveryTitle")}
          </h1>
          <p className="mx-auto max-w-[38rem] leading-relaxed text-[var(--text-muted)]">
            {t("auth.recoveryDescription")}
          </p>
        </div>

        <FormField label={t("auth.newPassword")} htmlFor="new-password" required>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("auth.newPasswordPlaceholder")}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(error)}
          />
        </FormField>

        <FormField label={t("auth.confirmNewPassword")} htmlFor="confirm-password" required>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t("auth.confirmNewPasswordPlaceholder")}
            autoComplete="new-password"
            required
            aria-invalid={Boolean(error)}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={recoveryDisabled}
        >
          {submitting ? t("auth.passwordUpdateSubmitting") : t("auth.passwordUpdateSubmit")}
        </Button>
      </form>
    );
  }

  function renderDoneCard() {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto inline-flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-[var(--success)]/10 text-[var(--success)]">
          <ShieldCheck size={28} />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {t("auth.passwordUpdatedTitle")}
          </h1>
          <p className="mx-auto max-w-[38rem] leading-relaxed text-[var(--text-muted)]">
            {message || t("auth.passwordUpdatedSuccess")}
          </p>
        </div>
        <Link
          href={localizeAppPath("/login", locale)}
          className="inline-flex h-11 w-full items-center justify-center rounded-[var(--button-radius)] bg-[var(--primary)] px-6 font-semibold text-white transition-all hover:brightness-110"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative min-h-dvh overflow-hidden px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[680px] items-center justify-center">
        <div className="ui-glass w-full rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <SchoolLogo
                src={runtimeBranding.logoUrl}
                alt={brandName}
                label={brandName}
                size={64}
                className="rounded-[24px]"
                fallbackClassName="text-[1rem] font-black text-white"
              />
              <div className="min-w-0">
                <div className="text-[1.15rem] font-black whitespace-nowrap [word-break:keep-all] text-[var(--text-primary)]">
                  {brandName}
                </div>
                <div className="text-[0.8rem] font-semibold text-[var(--text-secondary)]">
                  {t("auth.forgotPasswordTitle")}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-8">
              {view === "request" && renderRequestCard()}
              {view === "sent" && renderSentCard()}
              {view === "recovery" && renderRecoveryCard()}
              {view === "done" && renderDoneCard()}

              {error ? (
                <div
                  className="mt-5 rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-semibold text-[var(--danger)]"
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

              {view !== "done" ? (
                <div className="mt-6 flex justify-center">
                  <Link
                    href={localizeAppPath("/login", locale)}
                    className="inline-flex text-sm font-extrabold text-[var(--primary)] transition hover:text-[var(--primary-strong)]"
                  >
                    {t("auth.backToLogin")}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm font-bold text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[0.8rem] font-semibold text-[var(--text-tertiary)]">
                {t("common.subtitle")}
              </div>
              <ThemeModeToggle variant="inline" compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
