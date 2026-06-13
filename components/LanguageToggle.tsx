"use client";

import { useTranslations } from "next-intl";
import { Languages } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { getLocaleFromPath, localizeAppPath, stripLocaleFromPath, type AppLocale } from "@/lib/locale-routing";

function nextLocale(current: AppLocale): AppLocale {
  return current === "ar" ? "en" : "ar";
}

export function LanguageToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("common.language");
  const locale = getLocaleFromPath(pathname);
  const targetLocale = nextLocale(locale);
  const barePath = stripLocaleFromPath(pathname || "/");
  const targetSearch = typeof window === "undefined" ? "" : window.location.search;
  const targetHash = typeof window === "undefined" ? "" : window.location.hash;
  const targetHref = `${localizeAppPath(barePath, targetLocale)}${targetSearch || ""}${targetHash || ""}`;

  const label = targetLocale === "ar" ? t("arabic") : t("english");
  const ariaLabel = targetLocale === "ar" ? t("switchToArabic") : t("switchToEnglish");

  return (
    <button
      type="button"
      className={`${className}`}
      data-compact={compact ? "true" : "false"}
      onClick={() => {
        window.location.replace(targetHref);
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Languages size={16} />
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}
