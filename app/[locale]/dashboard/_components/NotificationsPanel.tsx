"use client";

import { Bell, RefreshCw, Info } from "@/lib/icons";
import { formatDate } from "@/lib/formatting";
import { DashboardNotification } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

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
    <Card className="border-none shadow-md bg-white dark:bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell size={20} />
            </div>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <CardTitle className="text-sm font-bold">
              الإشعارات
            </CardTitle>
            {unreadNotifications > 0 && (
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                {unreadNotifications} غير مقروءة
              </p>
            )}
          </div>
        </div>
        
        {notificationsEnabled && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => void onRefresh()}
            disabled={notificationsLoading}
            className="h-8 px-3 rounded-lg text-xs gap-2 font-bold"
          >
            <RefreshCw size={12} className={cn(notificationsLoading && "animate-spin")} />
            تحديث
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {!notificationsEnabled ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-100 dark:border-slate-800 text-muted-foreground gap-3">
            <Info size={24} className="opacity-50" />
            <p className="text-sm font-medium">جدول الإشعارات غير مفعّل حالياً.</p>
          </div>
        ) : notificationsLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary opacity-50" />
            <p className="text-xs font-bold text-muted-foreground">جارٍ التحميل...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-100 dark:border-slate-800 text-muted-foreground gap-3">
            <Bell size={24} className="opacity-50" />
            <p className="text-sm font-medium">لا توجد إشعارات جديدة حالياً.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 rtl:pl-1">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void onMarkAsRead(item.id)}
                className={cn(
                  "w-full text-right p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden",
                  item.is_read 
                    ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100" 
                    : "bg-primary/[0.03] dark:bg-primary/[0.05] border-primary/10 hover:bg-primary/[0.06] shadow-sm"
                )}
              >
                {!item.is_read && (
                  <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-bold",
                    !item.is_read ? "text-primary" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {item.title || "تنبيه جديد"}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground opacity-70">
                    {item.created_at ? formatDate(item.created_at) : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-medium">
                  {item.message || "بدون تفاصيل إضافية"}
                </p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
