"use client";

import { usePathname } from "next/navigation";
import { Clock, LogOut, Phone } from "lucide-react";
import { signOutClient } from "@/lib/auth";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export default function SubscriptionExpiredPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const isRTL = locale === "ar";

  async function handleSignOut() {
    await signOutClient();
    window.location.href = localizeAppPath("/login", locale);
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative flex min-h-dvh items-center justify-center bg-[var(--background)] px-4"
    >
      <div className="absolute start-4 top-4">
        <ThemeModeToggle variant="inline" showLabels={false} compact />
      </div>

      <div className="content-card w-full max-w-sm p-8 text-center">
        <div
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[20px]"
          style={{ background: "rgba(245, 158, 11, 0.10)" }}
        >
          <Clock size={36} className="text-[var(--warning)]" />
        </div>

        <h1 className="mb-2 text-2xl font-black text-[var(--warning)]">
          {t("gates.subscriptionExpired")}
        </h1>
        <p className="mb-5 text-sm leading-7 text-[var(--text-secondary)]">
          {t("gates.subscriptionExpiredDescription")}
        </p>

        <div
          className="mb-6 rounded-[var(--radius-md)] border px-4 py-3 text-start flex items-center gap-2"
          style={{ borderColor: "rgba(245, 158, 11, 0.24)", background: "rgba(245, 158, 11, 0.08)" }}
        >
          <Phone size={14} className="shrink-0 text-[var(--warning)]" />
          <p className="text-xs font-semibold text-[var(--text-secondary)] leading-6">
            {t("gates.subscriptionRenewalHint")}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="ui-button ui-button--danger h-10 px-6 text-sm w-full inline-flex items-center justify-center gap-2"
        >
          <LogOut size={15} />
          {t("gates.signOut")}
        </button>
      </div>
    </div>
  );
}
