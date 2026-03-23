"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Monitor, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { SIDEBAR_ITEMS, isPathMatch, normalizePath } from "@/types/roles";
import { getLocaleFromPath } from "@/lib/locale-routing";

type ThemeVariant = "floating" | "inline";

interface ThemeModeToggleProps {
  variant?: ThemeVariant;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ThemeModeToggle({
  variant = "floating",
  className,
  showLabels = true,
  compact = false,
}: ThemeModeToggleProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const options =
    locale === "en"
      ? [
          { value: "system", label: "System", icon: Monitor },
          { value: "light", label: "Light", icon: SunMedium },
          { value: "dark", label: "Dark", icon: MoonStar },
        ]
      : [
          { value: "system", label: "تلقائي", icon: Monitor },
          { value: "light", label: "فاتح", icon: SunMedium },
          { value: "dark", label: "داكن", icon: MoonStar },
        ];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentPath = normalizePath(pathname || "/");
  const usesSharedSidebar = SIDEBAR_ITEMS.some((item) => isPathMatch(currentPath, item.href));
  const shouldHideFloating =
    variant === "floating" &&
    (currentPath === "/login" || usesSharedSidebar);

  if (shouldHideFloating) return null;

  const activeTheme = theme ?? "system";

  return (
    <div
      className={cx(
        "theme-mode-switch",
        variant === "floating" && "theme-mode-switch--floating",
        className,
      )}
      role="group"
      aria-label={locale === "en" ? "Theme mode" : "وضع المظهر"}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={cx("theme-mode-option", isActive && "is-active")}
            data-compact={compact ? "true" : "false"}
            aria-pressed={isActive}
            aria-label={locale === "en" ? `Enable ${option.label} mode` : `تفعيل وضع ${option.label}`}
            title={option.label}
            onClick={() => setTheme(option.value)}
          >
            <Icon size={16} aria-hidden="true" />
            {showLabels ? <span>{option.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
