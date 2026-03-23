"use client";

import { Languages } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();
  const nextLanguageLabel = language === "ar" ? t.languageToggle.switchToEnglish : t.languageToggle.switchToArabic;
  const currentLanguageLabel = language === "ar" ? t.common.arabic : t.common.english;

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={nextLanguageLabel}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:text-emerald-300"
    >
      <Languages className="h-4 w-4" />
      <span>{t.languageToggle.label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {currentLanguageLabel}
      </span>
    </button>
  );
}
