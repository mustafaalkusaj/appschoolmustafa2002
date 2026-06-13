"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

interface Props {
  teacherId: string;
  schoolId: string | null;
  teacherName: string;
  canManage: boolean;
  locale: "ar" | "en";
}

const TYPE_COLORS: Record<string, string> = {
  general: "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
  reminder: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20",
  warning: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  urgent: "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general: { ar: "عام", en: "General" },
  reminder: { ar: "تذكير", en: "Reminder" },
  warning: { ar: "تحذير", en: "Warning" },
  urgent: { ar: "عاجل", en: "Urgent" },
};

function formatDate(dateStr: string, locale: "ar" | "en"): string {
  try {
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function NotificationsTab({ teacherId, schoolId, canManage, locale }: Props) {
  const isEn = locale === "en";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formType, setFormType] = useState("general");
  const [formError, setFormError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/web/teachers/${teacherId}/notifications${schoolId ? `?schoolId=${schoolId}` : ""}`;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        notifications: Notification[];
      }>(url);
      if (!response.ok || !payload?.ok) {
        setError(isEn ? "Failed to load notifications." : "تعذر تحميل الإشعارات.");
      } else {
        setNotifications(payload.notifications ?? []);
      }
    } catch {
      setError(isEn ? "Failed to load notifications." : "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }, [teacherId, schoolId, isEn]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(isEn ? "Title is required." : "العنوان مطلوب.");
      return;
    }
    if (!formMessage.trim()) {
      setFormError(isEn ? "Message is required." : "النص مطلوب.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean }>(
        `/api/web/teachers/${teacherId}/notifications`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            title: formTitle.trim(),
            message: formMessage.trim(),
            type: formType,
          }),
        },
      );
      if (!response.ok || !payload?.ok) {
        setFormError(isEn ? "Failed to send notification." : "تعذر إرسال الإشعار.");
      } else {
        setFormTitle("");
        setFormMessage("");
        setFormType("general");
        setShowForm(false);
        await loadNotifications();
      }
    } catch {
      setFormError(isEn ? "Failed to send notification." : "تعذر إرسال الإشعار.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {isEn ? "Notifications" : "الإشعارات"}
        </h3>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowForm((v) => !v);
              setFormError(null);
            }}
          >
            {showForm
              ? isEn ? "Cancel" : "إلغاء"
              : isEn ? "Send Notification" : "إرسال إشعار"}
          </Button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {isEn ? "Title" : "العنوان"}
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
              placeholder={isEn ? "Notification title..." : "عنوان الإشعار..."}
              dir="auto"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {isEn ? "Message" : "النص"}
            </label>
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              rows={3}
              className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
              placeholder={isEn ? "Notification message..." : "نص الإشعار..."}
              dir="auto"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {isEn ? "Type" : "النوع"}
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            >
              {Object.entries(TYPE_LABELS).map(([key, labels]) => (
                <option key={key} value={key}>
                  {isEn ? labels.en : labels.ar}
                </option>
              ))}
            </select>
          </div>
          {formError && (
            <p className="text-xs text-[var(--danger)]">{formError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting
                ? isEn ? "Sending..." : "جاري الإرسال..."
                : isEn ? "Send" : "إرسال"}
            </Button>
          </div>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 h-20"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
          <p className="text-[var(--danger)] text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="text-xs text-[var(--primary)] underline"
          >
            {isEn ? "Retry" : "إعادة المحاولة"}
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-12 flex flex-col items-center gap-2">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--text-muted)]"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-sm text-[var(--text-muted)]">
            {isEn ? "No notifications" : "لا توجد إشعارات"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => {
            const typeColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.general;
            const typeLabel = TYPE_LABELS[n.type] ?? TYPE_LABELS.general;
            return (
              <div
                key={n.id}
                className={[
                  "bg-[var(--card-bg)] border rounded-2xl p-4 flex flex-col gap-2 transition-opacity",
                  n.is_read ? "opacity-70 border-[var(--card-border)]" : "border-[var(--card-border)] shadow-sm",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1" />
                    )}
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColor}`}
                    >
                      {isEn ? typeLabel.en : typeLabel.ar}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                    {formatDate(n.created_at, locale)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{n.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
