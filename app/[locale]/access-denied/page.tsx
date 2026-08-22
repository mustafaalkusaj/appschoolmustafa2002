"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";

export default function AccessDeniedPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const reason = searchParams.get("reason");

  return (
    <div
      className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center"
      style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
    >
      <div className="text-center p-8">
        <div className="text-[5rem] mb-4 flex justify-center text-[var(--danger)]">
          <AppIcon token="🚫" size={78} />
        </div>
        <h1 className="text-[var(--danger)] text-[1.6rem] font-black mb-2">
          {t("gates.accessDenied")}
        </h1>
        <p className="text-[var(--text-muted)] mb-8 text-[0.95rem]">
          {reason === "inactive"
            ? t("gates.accountInactive")
            : t("gates.accessDeniedDescription")}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 font-bold text-sm transition-all hover:bg-[var(--danger)]/20"
          >
            {t("gates.goBack")}
          </button>
          <button
            onClick={() => {
              window.location.href = localizeAppPath("/login", locale);
            }}
            className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm transition-all hover:brightness-110 inline-flex items-center gap-1"
          >
            <AppIcon token="🔑" size={16} />
            {t("gates.login")}
          </button>
        </div>
      </div>
    </div>
  );
}
