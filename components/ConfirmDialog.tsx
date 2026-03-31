"use client";

import { AppIcon } from "@/components/AppIcon";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description = "",
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = tone === "danger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.52)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 22,
          background: "var(--surface-strong)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 24px 80px rgba(15,23,42,0.26)",
          padding: "1.25rem",
          direction: "rtl",
          fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: ".75rem",
            marginBottom: ".9rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: ".7rem" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isDanger ? "rgba(239,68,68,0.12)" : "rgba(79,140,255,0.12)",
                color: isDanger ? "#B91C1C" : "#1D4ED8",
                flexShrink: 0,
              }}
            >
              <AppIcon token={isDanger ? "⚠️" : "ℹ️"} size={18} />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: ".35rem" }}>
                {title}
              </div>
              {description ? (
                <div style={{ fontSize: ".84rem", lineHeight: 1.8, color: "var(--text-secondary)" }}>{description}</div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "1px solid var(--border)",
              cursor: busy ? "not-allowed" : "pointer",
              background: "var(--surface-soft)",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AppIcon token="✕" size={13} />
          </button>
        </div>

        <div style={{ display: "flex", gap: ".65rem", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            style={{
              flex: 1,
              padding: ".78rem 1rem",
              borderRadius: 12,
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              color: "#FFFFFF",
              fontSize: ".86rem",
              fontWeight: 800,
              fontFamily: "inherit",
              background: isDanger
                ? "linear-gradient(135deg,#EF4444,#B91C1C)"
                : "linear-gradient(135deg,#2563EB,#1D4ED8)",
              opacity: busy ? 0.72 : 1,
            }}
          >
            {busy ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1,
              padding: ".78rem 1rem",
              borderRadius: 12,
              border: "1px solid var(--border)",
              cursor: busy ? "not-allowed" : "pointer",
              color: "var(--text-secondary)",
              fontSize: ".86rem",
              fontWeight: 700,
              fontFamily: "inherit",
              background: "var(--surface-soft)",
              opacity: busy ? 0.72 : 1,
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
