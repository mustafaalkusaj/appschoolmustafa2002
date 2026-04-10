"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck } from "@/lib/icons";
import { SchoolLogo } from "@/components/brand";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { useRuntimeBranding } from "@/hooks/brand";
import { SCHOOL_BRAND } from "@/lib/brand";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const brandName = runtimeBranding.schoolName || SCHOOL_BRAND.nameAr;
  const isRTL = locale === "ar";

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

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
              <div className="w-[68px] h-[68px] mx-auto mb-4 rounded-[22px] inline-flex items-center justify-center bg-[var(--primary)]/10 text-[var(--primary)]">
                <KeyRound size={28} />
              </div>
              <h1 className="mb-3 text-2xl font-black text-[var(--text-primary)]">{t("auth.forgotPasswordTitle")}</h1>
              <p className="text-[var(--text-muted)] mx-auto max-w-[38rem] leading-relaxed">
                {t("auth.forgotPasswordDescription")}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href={localizeAppPath("/login", locale)}
                  className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[var(--button-radius)] bg-[var(--primary)] text-white font-semibold transition-all hover:brightness-110"
                >
                  <ShieldCheck size={18} />
                  {t("auth.backToLogin")}
                </Link>
              </div>
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
