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
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-manrope), Segoe UI, sans-serif",
        direction: "rtl",
      }}
    >
      <div style={{ textAlign: "center", padding: "2rem", maxWidth: 520 }}>
        <div style={{ fontSize: "5rem", marginBottom: "1rem", display: "flex", justifyContent: "center", color: "#f59e0b" }}>
          <AppIcon token="⏰" size={78} />
        </div>
        <h1 style={{ color: "#f59e0b", fontSize: "1.6rem", fontWeight: 900, marginBottom: ".5rem" }}>
          {t("gates.subscriptionExpired")}
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: ".7rem", fontSize: ".95rem", lineHeight: 1.7 }}>
          {t("gates.subscriptionExpiredDescription")}
        </p>
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.28)",
            borderRadius: 12,
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          <p style={{ color: "#fbbf24", fontSize: ".85rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: ".35rem" }}>
            <AppIcon token="📞" size={14} />
            {t("gates.subscriptionRenewalHint")}
          </p>
        </div>
        <button
          onClick={async () => {
            await signOutClient();
            window.location.href = localizeAppPath("/login", locale);
          }}
          style={{
            padding: ".7rem 1.5rem",
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            color: "#111827",
            border: "none",
            borderRadius: 12,
            fontFamily: "var(--font-manrope), Segoe UI, sans-serif",
            fontSize: ".92rem",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {t("gates.signOut")}
        </button>
      </div>
    </div>
  );
}
