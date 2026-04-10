"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Avoid hydration mismatch: only render after client has mounted.
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = resolvedTheme || theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="p-2 rounded-md bg-[var(--surface-muted)] dark:bg-[var(--surface-inset)] text-[var(--text-primary)] dark:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)] transition-colors"
      aria-label="تبديل المظهر"
      title={currentTheme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
    >
      <AppIcon token={currentTheme === "dark" ? "☀️" : "🌙"} size={16} />
    </button>
  );
}
