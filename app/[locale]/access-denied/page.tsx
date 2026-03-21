"use client";

import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";

export default function AccessDeniedPage() {
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
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "5rem", marginBottom: "1rem", display: "flex", justifyContent: "center", color: "#ef4444" }}>
          <AppIcon token="🚫" size={78} />
        </div>
        <h1 style={{ color: "#ef4444", fontSize: "1.6rem", fontWeight: 900, marginBottom: ".5rem" }}>
          {t("gates.accessDenied")}
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: ".95rem" }}>
          {t("gates.accessDeniedDescription")}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: ".7rem 1.5rem",
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 12,
              fontFamily: "var(--font-manrope), Segoe UI, sans-serif",
              fontSize: ".9rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("gates.goBack")}
          </button>
          <button
            onClick={() => {
              window.location.href = localizeAppPath("/dashboard", locale);
            }}
            style={{
              padding: ".7rem 1.5rem",
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontFamily: "var(--font-manrope), Segoe UI, sans-serif",
              fontSize: ".9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: ".4rem",
            }}
          >
            <AppIcon token="🏠" size={16} />
            {t("gates.dashboard")}
          </button>
        </div>
      </div>
    </div>
  );
}
