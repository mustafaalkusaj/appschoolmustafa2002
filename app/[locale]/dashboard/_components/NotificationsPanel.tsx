"use client";

import { formatDate } from "@/lib/formatting";
import { DashboardNotification } from "./types";

interface NotificationsPanelProps {
  notifications: DashboardNotification[];
  notificationsEnabled: boolean;
  notificationsLoading: boolean;
  unreadNotifications: number;
  onRefresh: () => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
}

export function NotificationsPanel({
  notifications,
  notificationsEnabled,
  notificationsLoading,
  unreadNotifications,
  onRefresh,
  onMarkAsRead,
}: NotificationsPanelProps) {
  return (
    <div style={{ background: "white", borderRadius: "14px", padding: "1rem", border: "1px solid rgba(108,74,182,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".65rem" }}>
        <div style={{ fontWeight: 900, color: "var(--p2)" }}>
          الإشعارات {notificationsEnabled ? `(${unreadNotifications} غير مقروءة)` : ""}
        </div>
        {notificationsEnabled ? (
          <button className="fee-btn-outline" style={{ fontSize: ".72rem", padding: ".35rem .65rem" }} onClick={() => void onRefresh()}>
            تحديث
          </button>
        ) : null}
      </div>
      {!notificationsEnabled ? (
        <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>
          جدول الإشعارات غير مفعّل في قاعدة البيانات الحالية.
        </div>
      ) : notificationsLoading ? (
        <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>جارٍ تحميل الإشعارات...</div>
      ) : notifications.length === 0 ? (
        <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>لا توجد إشعارات جديدة حالياً.</div>
      ) : (
        <div style={{ display: "grid", gap: ".45rem" }}>
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void onMarkAsRead(item.id)}
              style={{
                textAlign: "right",
                border: "1px solid rgba(108,74,182,0.1)",
                background: item.is_read ? "#F8FAFC" : "#EEF6FF",
                borderRadius: "10px",
                padding: ".55rem .65rem",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--dark)" }}>{item.title || "تنبيه جديد"}</div>
              <div style={{ fontSize: ".72rem", color: "var(--gray)", marginTop: ".2rem" }}>{item.message || "بدون تفاصيل إضافية"}</div>
              <div style={{ fontSize: ".66rem", color: "var(--gray)", marginTop: ".25rem" }}>
                {item.created_at ? formatDate(item.created_at) : "—"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
