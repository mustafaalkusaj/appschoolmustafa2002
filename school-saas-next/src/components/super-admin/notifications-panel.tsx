"use client";

import { BellRing, CheckCircle2 } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { getNotificationContent } from "@/lib/i18n";
import type { SystemNotification } from "@/lib/types";

interface NotificationsPanelProps {
  notifications: SystemNotification[];
  onRead: (notificationId: string) => void;
}

export function NotificationsPanel({ notifications, onRead }: NotificationsPanelProps) {
  const { language, t } = useLanguage();

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.notifications.title}</h2>
      </div>

      <div className="space-y-3">
        {notifications.slice(0, 6).map((notification) => {
          const content = getNotificationContent(notification, language);

          return (
            <div
              key={notification.id}
              className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{content.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{content.message}</p>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => onRead(notification.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t.common.read}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
