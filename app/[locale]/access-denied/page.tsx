"use client";

import { usePathname } from "next/navigation";
import { ShieldOff, Home, ArrowLeft } from "lucide-react";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export default function AccessDeniedPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const isRTL = locale === "ar";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative flex min-h-dvh items-center justify-center bg-[var(--background)] px-4"
    >
      {/* Corner controls */}
      <div className="absolute start-4 top-4">
        <ThemeModeToggle variant="inline" showLabels={false} compact />
      </div>

      <div className="content-card w-full max-w-sm p-8 text-center">
        {/* Icon */}
        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px]"
          style={{ background: "rgba(239, 68, 68, 0.10)" }}
        >
          <ShieldOff size={36} className="text-[var(--danger)]" />
        </div>

        {/* Text */}
        <h1 className="mb-2 text-2xl font-black text-[var(--text-primary)]">
          {t("gates.accessDenied")}
        </h1>
        <p className="mb-8 text-sm leading-7 text-[var(--text-secondary)]">
          {t("gates.accessDeniedDescription")}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => window.history.back()}
            className="ui-button ui-button--secondary h-10 px-4 text-sm inline-flex items-center gap-2"
          >
            <ArrowLeft size={15} />
            {t("gates.goBack")}
          </button>
          <button
            onClick={() => { window.location.href = localizeAppPath("/dashboard", locale); }}
            className="ui-button ui-button--primary h-10 px-5 text-sm inline-flex items-center gap-2"
          >
            <Home size={15} />
            {t("gates.dashboard")}
          </button>
        </div>
      </div>
    </div>
  );
}
