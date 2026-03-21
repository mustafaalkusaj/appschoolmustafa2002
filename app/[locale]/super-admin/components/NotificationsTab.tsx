"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Bell, 
  CheckCircle2, 
  Circle, 
  RefreshCw, 
  AlertTriangle,
  Info,
  ExternalLink,
  MailCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionCard, EmptyState, formatDate, cx } from "./UI";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userData.user.id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title="تنبيهات النظام"
        description="ابق على اطلاع بكل ما يحدث في المنصة من تحذيرات وتحديثات."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="ui-button ui-button--secondary inline-flex items-center gap-2"
              >
                <MailCheck size={16} />
                تحديد الكل كمقروء
              </button>
            )}
            <button
              onClick={() => void fetchNotifications()}
              className="ui-button ui-button--secondary h-9 w-9 p-0"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState 
            icon={Bell}
            title="لا توجد تنبيهات"
            description="كل شيء يبدو جيداً، لا توجد تنبيهات جديدة حالياً."
          />
        ) : (
          <div className="grid gap-3">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={cx(
                  "ui-surface flex items-start gap-4 rounded-[24px] p-4 transition border",
                  !n.is_read ? "border-[var(--primary)] bg-[rgba(79,140,255,0.05)]" : "border-transparent"
                )}
              >
                <div className={cx(
                  "mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]",
                  n.type === "subscription_expiring" ? "bg-[rgba(242,169,59,0.14)] text-[var(--warning)]" :
                  n.type === "system_alert" ? "bg-[rgba(240,90,90,0.14)] text-[var(--danger)]" :
                  "bg-[rgba(79,140,255,0.14)] text-[var(--primary)]"
                )}>
                  {n.type === "subscription_expiring" ? <AlertTriangle size={20} /> :
                   n.type === "system_alert" ? <AlertTriangle size={20} /> :
                   <Info size={20} />}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-[var(--text-primary)]">{n.title}</h4>
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)]">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-[var(--text-secondary)]">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center gap-3 pt-2">
                    {!n.is_read && (
                      <button 
                        onClick={() => markAsRead(n.id)}
                        className="text-[11px] font-black text-[var(--primary)] hover:underline"
                      >
                        تحديد كمقروء
                      </button>
                    )}
                    {n.link && (
                      <a 
                        href={n.link}
                        className="flex items-center gap-1 text-[11px] font-black text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        <ExternalLink size={12} />
                        عرض التفاصيل
                      </a>
                    )}
                  </div>
                </div>

                {!n.is_read && (
                  <div className="h-2 w-2 rounded-full bg-[var(--primary)] mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
