"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school-context";
import type { UserProfile } from "@/lib/auth";

export interface ActivityItem {
  id: string;
  type: "message" | "homework" | "alert";
  title: string;
  teacherName?: string;
  createdAt: string;
  status?: string;
}

interface UseRecentActivityProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
}

interface ActivityApiItem {
  id: string;
  title: string;
  teacherName?: string;
  createdAt: string;
  status?: string;
  createdByName?: string;
}

export function useRecentActivity({ profile, selectedSchoolId, scopeLoading }: UseRecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    if (!schoolId) {
      setActivities([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const requests = await Promise.allSettled([
        fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(`/api/web/teacher-activity/messages?schoolId=${schoolId}&pageSize=3`),
        fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(`/api/web/teacher-activity/homework?schoolId=${schoolId}&pageSize=3`),
        fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(`/api/web/fee-notifications?schoolId=${schoolId}&pageSize=3`),
      ]);

      const combined: ActivityItem[] = [];
      let failedSources = 0;

      const [messagesRes, homeworkRes, alertsRes] = requests;

      if (messagesRes.status === "fulfilled" && messagesRes.value.response.ok && messagesRes.value.payload?.items) {
        messagesRes.value.payload.items.forEach((item) => {
          combined.push({
            id: item.id,
            type: "message",
            title: item.title,
            teacherName: item.teacherName,
            createdAt: item.createdAt,
            status: item.status,
          });
        });
      } else {
        failedSources += 1;
      }

      if (homeworkRes.status === "fulfilled" && homeworkRes.value.response.ok && homeworkRes.value.payload?.items) {
        homeworkRes.value.payload.items.forEach((item) => {
          combined.push({
            id: item.id,
            type: "homework",
            title: item.title,
            teacherName: item.teacherName,
            createdAt: item.createdAt,
            status: item.status,
          });
        });
      } else {
        failedSources += 1;
      }

      if (alertsRes.status === "fulfilled" && alertsRes.value.response.ok && alertsRes.value.payload?.items) {
        alertsRes.value.payload.items.forEach((item) => {
          combined.push({
            id: item.id,
            type: "alert",
            title: item.title,
            teacherName: item.createdByName || undefined,
            createdAt: item.createdAt,
            status: "active",
          });
        });
      } else {
        failedSources += 1;
      }

      setActivities(combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6));
      setError(failedSources === requests.length && combined.length === 0 ? "dashboard_activity_failed" : null);
    } catch (err) {
      console.error("Failed to fetch recent activities", err);
      setActivities([]);
      setError(err instanceof Error ? err.message : "dashboard_activity_failed");
    } finally {
      setLoading(false);
    }
  }, [profile, selectedSchoolId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchActivities();
  }, [profile, scopeLoading, fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh: fetchActivities,
  };
}
