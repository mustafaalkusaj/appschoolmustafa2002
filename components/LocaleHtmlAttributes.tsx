"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export function LocaleHtmlAttributes() {
  const params = useParams();
  const locale = (params?.locale as string) || "ar";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "en" ? "ltr" : "rtl";
  }, [locale]);

  return null;
}
