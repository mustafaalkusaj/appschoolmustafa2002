"use client";

import { useEffect } from "react";

/**
 * Global error boundary.
 * Catches unhandled errors that escape the root layout — including errors
 * thrown inside app/layout.tsx itself. Must render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: forward to a monitoring service (e.g. Sentry) in production
    console.error("[GlobalError]", error);
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
        </div>
      </body>
    </html>
  );
}
