"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Monitor, MoonStar, SunMedium } from "@/lib/icons";
import { useTheme } from "next-themes";
import { SIDEBAR_ITEMS, isPathMatch, normalizePath } from "@/types/roles";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ThemeVariant = "floating" | "inline";

interface ThemeModeToggleProps {
  variant?: ThemeVariant;
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export function ThemeModeToggle({
  variant = "floating",
  className,
  showLabels = true,
  compact = false,
}: ThemeModeToggleProps) {
  const pathname = usePathname();
  const t = useTranslations("common.theme");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const options = [
    { value: "system", label: t("system"), icon: Monitor },
    { value: "light", label: t("light"), icon: SunMedium },
    { value: "dark", label: t("dark"), icon: MoonStar },
  ] as const;

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
      aria-label={t("label")}
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
            aria-label={t("enable", { theme: option.label })}
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
