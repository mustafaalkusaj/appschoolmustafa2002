"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  DEFAULT_LANGUAGE,
  getDirection,
  getTranslations,
  LANGUAGE_STORAGE_KEY,
  type TranslationDictionary,
} from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface LanguageContextValue {
  language: Language;
  dir: "rtl" | "ltr";
  t: TranslationDictionary;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "en" || saved === "ar" ? saved : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = getDirection(language);
    root.dataset.language = language;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.title = getTranslations(language).metadata.title;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    document.body.classList.add("language-switching");
    const timer = window.setTimeout(() => {
      document.body.classList.remove("language-switching");
    }, 220);

    return () => window.clearTimeout(timer);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      dir: getDirection(language),
      t: getTranslations(language),
      setLanguage,
      toggleLanguage: () => setLanguage((current) => (current === "ar" ? "en" : "ar")),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within LanguageProvider");
  }

  return context;
}
