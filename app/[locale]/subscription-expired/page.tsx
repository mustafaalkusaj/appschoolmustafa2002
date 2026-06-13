"use client";

import { usePathname } from "next/navigation";
import { signOutClient } from "@/lib/auth";
import { AppIcon } from "@/components/AppIcon";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";

export default function SubscriptionExpiredPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-[var(--surface-muted)] flex items-center justify-center" style={{ direction: "rtl" }}>
      <div className="text-center p-8 max-w-[520px]">
        <div className="text-[5rem] mb-4 flex justify-center text-[var(--warning)]">
          <AppIcon token="⏰" size={78} />
        </div>
        <h1 className="text-[var(--warning)] text-[1.6rem] font-black mb-2">
          {t("gates.subscriptionExpired")}
        </h1>
        <p className="text-[var(--text-muted)] mb-3 text-[0.95rem] leading-relaxed">
          {t("gates.subscriptionExpiredDescription")}
        </p>
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-4 mb-8">
          <p className="text-[var(--warning)] text-[0.85rem] font-semibold flex items-center justify-center gap-1">
            <AppIcon token="📞" size={14} />
            {t("gates.subscriptionRenewalHint")}
          </p>
        </div>
        <button
          onClick={async () => {
            await signOutClient();
            window.location.href = localizeAppPath("/login", locale);
          }}
          className="px-6 py-3 rounded-xl bg-[var(--warning)] text-[var(--text-primary)] font-extrabold text-[0.92rem] transition-all hover:brightness-110"
        >
          {t("gates.signOut")}
        </button>
      </div>
    </div>
  );
}
