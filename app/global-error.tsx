"use client";

import { useEffect } from "react";


export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Critical error:", error?.message || error);
    console.error("[GlobalError] Stack:", error?.stack);
    void error;
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f9fafb",
          color: "#111827",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "1.5rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
            aria-hidden="true"
          >
            ⚠
          </div>

          <div style={{ maxWidth: "24rem" }}>
            <h1
              style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 600 }}
            >
              حدث خطأ حرج في التطبيق
            </h1>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
              يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً.
            </p>
            {error.digest && (
              <p
                style={{
                  marginTop: "0.5rem",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                }}
              >
                رمز الخطأ: {error.digest}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              حاول مجدداً
            </button>
            <button
              type="button"
              onClick={() => {
                const seg = window.location.pathname.split("/").filter(Boolean)[0];
                const locale = seg === "en" ? "en" : "ar";
                window.location.href = `/${locale}`;
              }}
              style={{
                background: "transparent",
                color: "#7c3aed",
                border: "1px solid #7c3aed",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
