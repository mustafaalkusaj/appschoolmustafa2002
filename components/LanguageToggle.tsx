"use client";

import { Languages } from "lucide-react";
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
  const locale = getLocaleFromPath(pathname);
  const targetLocale = nextLocale(locale);
  const barePath = stripLocaleFromPath(pathname || "/");
  const targetSearch = typeof window === "undefined" ? "" : window.location.search;
  const targetHref = `${localizeAppPath(barePath, targetLocale)}${targetSearch || ""}`;

  const label = targetLocale === "ar" ? "العربية" : "English";
  const ariaLabel = targetLocale === "ar" ? "التبديل إلى العربية" : "Switch to English";

  return (
    <button
      type="button"
      className={`${className}`}
      onClick={() => {
        window.location.href = targetHref;
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Languages size={16} />
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}
