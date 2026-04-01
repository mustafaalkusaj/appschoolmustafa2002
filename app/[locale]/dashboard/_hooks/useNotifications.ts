"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/auth";
import { DashboardNotification } from "../_components/types";

interface UseNotificationsProps {
  profile: UserProfile | null;
  scopeLoading: boolean;
}

export function useNotifications({ profile, scopeLoading }: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchDashboardNotifications = useCallback(async () => {
    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      const relationMissing = error.message.includes('relation "notifications" does not exist');
      setNotificationsEnabled(!relationMissing);
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsEnabled(true);
    setNotifications((data || []) as DashboardNotification[]);
    setNotificationsLoading(false);
  }, [profile]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (!id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }, []);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchDashboardNotifications();
  }, [profile, scopeLoading, fetchDashboardNotifications]);

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  return {
    notifications,
    notificationsEnabled,
    notificationsLoading,
    unreadNotifications,
    fetchDashboardNotifications,
    markNotificationAsRead,
  };
}
