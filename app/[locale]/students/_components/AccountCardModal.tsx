"use client";

import type { ManagedUserAccountCard } from "../_types";

interface AccountCardModalProps {
  accountCard: ManagedUserAccountCard | null;
  /** The plaintext password from a reset action (one-time reveal). If not provided, shows a placeholder message. */
  revealedPassword?: string | null;
  onPrint: (card: ManagedUserAccountCard, autoPrint: boolean) => void;
  onCopy: () => void;
  onClose: () => void;
}

export function AccountCardModal({ accountCard, revealedPassword, onPrint, onCopy, onClose }: AccountCardModalProps) {
  if (!accountCard) return null;

  const isPasswordRevealed = revealedPassword && revealedPassword !== "••••••••";

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mh">
          <div className="mt">بطاقة حساب التطبيق جاهزة</div>
          <button className="mc" onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              background: "#F8FBFF",
              border: "1px solid rgba(15,91,141,0.12)",
              borderRadius: 18,
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: ".75rem", fontWeight: 800, color: "var(--gray)" }}>الاسم الكامل</div>
            <div style={{ marginTop: ".4rem", fontSize: "1.05rem", fontWeight: 900, color: "var(--p2)" }}>
              {accountCard.full_name}
            </div>
          </div>
          <div
            style={{
              background: "#F8FBFF",
              border: "1px solid rgba(15,91,141,0.12)",
              borderRadius: 18,
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: ".75rem", fontWeight: 800, color: "var(--gray)" }}>الصف والشعبة</div>
            <div style={{ marginTop: ".4rem", fontSize: "1.05rem", fontWeight: 900, color: "var(--p2)" }}>
              {[accountCard.class_name, accountCard.section ? `الشعبة ${accountCard.section}` : null]
                .filter(Boolean)
                .join(" • ") || "—"}
            </div>
          </div>
          <div
            style={{
              background: "#F8FBFF",
              border: "1px solid rgba(15,91,141,0.12)",
              borderRadius: 18,
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: ".75rem", fontWeight: 800, color: "var(--gray)" }}>معرّف الدخول</div>
            <div
              style={{
                marginTop: ".4rem",
                fontSize: "1rem",
                fontWeight: 900,
                color: "var(--p2)",
                direction: "ltr",
                textAlign: "left",
              }}
            >
              {accountCard.login_identifier}
            </div>
          </div>
          <div
            style={{
              background: "#F8FBFF",
              border: "1px solid rgba(15,91,141,0.12)",
              borderRadius: 18,
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: ".75rem", fontWeight: 800, color: "var(--gray)" }}>كلمة المرور المؤقتة</div>
            <div
              style={{
                marginTop: ".4rem",
                fontSize: "1rem",
                fontWeight: 900,
                color: isPasswordRevealed ? "var(--p2)" : "#888",
                direction: "ltr",
                textAlign: "left",
              }}
            >
              {isPasswordRevealed ? revealedPassword : "••••••••"}
            </div>
            {!isPasswordRevealed && (
              <div style={{ fontSize: ".7rem", color: "#888", marginTop: ".3rem" }}>
                كلمة المرور تم تعيينها — لا يمكن استرجاعها. استخدم "إعادة ضبط المرور" لإنشاء كلمة مرور جديدة.
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            background: "#F8FBFF",
            border: "1px solid rgba(15,91,141,0.12)",
            borderRadius: 18,
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: ".82rem", fontWeight: 900, color: "var(--p2)", marginBottom: ".5rem" }}>
            تعليمات الدخول
          </div>
          <ol style={{ margin: 0, paddingRight: "1.2rem", fontSize: ".8rem", color: "var(--gray)", lineHeight: 1.9 }}>
            {accountCard.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
        <div className="fa">
          <button className="bc" onClick={() => onCopy()}>
            نسخ البيانات
          </button>
          <button className="bc" onClick={() => onPrint(accountCard, true)}>
            طباعة
          </button>
          <button className="bs" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
