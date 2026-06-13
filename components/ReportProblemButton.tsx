"use client";

import { useState, useRef } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

type ReportProblemButtonProps = {
  /** Optional page URL to include in the ticket. Falls back to window.location.href */
  pageUrl?: string;
  /** Optional CSS class for the trigger button */
  className?: string;
  /** Button label — defaults to Arabic "الإبلاغ عن مشكلة" */
  label?: string;
};

export function ReportProblemButton({
  pageUrl,
  className,
  label = "الإبلاغ عن مشكلة",
}: ReportProblemButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setSubmitted(false);
    setErrorMsg("");
    setMessage("");
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setOpen(false);
    setMessage("");
    setErrorMsg("");
    setSubmitted(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setErrorMsg("يرجى كتابة وصف للمشكلة.");
      return;
    }
    if (message.trim().length > 1000) {
      setErrorMsg("الرسالة طويلة جداً. الحد الأقصى 1000 حرف.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const resolvedPageUrl =
        pageUrl ??
        (typeof window !== "undefined" ? window.location.href : undefined);

      const { payload } = await fetchJsonWithAuthorizedSession(
        "/api/web/support-tickets",
        {
          method: "POST",
          body: JSON.stringify({
            message: message.trim(),
            page_url: resolvedPageUrl,
          }),
        },
      );

      const res = payload as Record<string, unknown> | null;

      if (res?.ok) {
        setSubmitted(true);
        setMessage("");
      } else {
        const errObj = res?.error;
        const errDetail =
          errObj && typeof errObj === "object" && "message" in errObj
            ? String((errObj as { message: unknown }).message)
            : "تعذر إرسال الطلب.";
        setErrorMsg(errDetail);
      }
    } catch {
      setErrorMsg("تعذر إرسال الطلب. تحقق من اتصالك بالإنترنت.");
    } finally {
      setSubmitting(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const dialogStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: 28,
    width: "100%",
    maxWidth: 460,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    direction: "rtl",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handleOpen}
        style={
          !className
            ? {
                ...btnBase,
                background: "#f3f4f6",
                color: "#374151",
              }
            : undefined
        }
      >
        {label}
      </button>

      {open && (
        <div style={overlayStyle} onClick={handleClose}>
          <div
            style={dialogStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
          >
            <h2
              id="report-dialog-title"
              style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}
            >
              الإبلاغ عن مشكلة
            </h2>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 14 }}>
              صف المشكلة التي واجهتها وسيتواصل معك الفريق في أقرب وقت.
            </p>

            {submitted ? (
              <div
                style={{
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              >
                تم إرسال طلبك بنجاح. شكراً لك.
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب وصفاً للمشكلة هنا..."
                  rows={5}
                  maxLength={1000}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontFamily: "inherit",
                    fontSize: 14,
                    resize: "vertical",
                    boxSizing: "border-box",
                    direction: "rtl",
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    textAlign: "left",
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 8,
                  }}
                >
                  {message.length}/1000
                </div>

                {errorMsg && (
                  <div
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ ...btnBase, background: "#f3f4f6", color: "#374151" }}
                onClick={handleClose}
              >
                {submitted ? "إغلاق" : "إلغاء"}
              </button>
              {!submitted && (
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    background: submitting ? "#93c5fd" : "#2563eb",
                    color: "#fff",
                    opacity: submitting ? 0.8 : 1,
                  }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "جاري الإرسال..." : "إرسال"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
