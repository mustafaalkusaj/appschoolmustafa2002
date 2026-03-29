"use client";

import { startTransition } from "react";
import { Languages } from "@/lib/icons";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const targetLocale = nextLocale(locale);
  const barePath = stripLocaleFromPath(pathname || "/");
  const targetSearch = typeof window === "undefined" ? "" : window.location.search;
  const targetHash = typeof window === "undefined" ? "" : window.location.hash;
  const targetHref = `${localizeAppPath(barePath, targetLocale)}${targetSearch || ""}${targetHash || ""}`;

  const label = targetLocale === "ar" ? "العربية" : "English";
  const ariaLabel = targetLocale === "ar" ? "التبديل إلى العربية" : "Switch to English";

  return (
    <button
      type="button"
      className={`${className}`}
      onClick={() => {
        startTransition(() => {
          router.replace(targetHref, { scroll: false });
        });
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Languages size={16} />
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}
