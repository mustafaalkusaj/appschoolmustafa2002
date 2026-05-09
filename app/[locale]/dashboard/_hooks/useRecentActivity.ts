"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache";
import { resolveSchoolBranchForProfile } from "@/lib/school-context";
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
  branchScoped?: boolean;
}

interface ActivityApiItem {
  id: string;
  title: string;
  teacherName?: string;
  createdAt: string;
  status?: string;
  createdByName?: string;
}

export function useRecentActivity({
  profile,
  selectedSchoolId,
  scopeLoading,
  branchScoped = false,
}: UseRecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    if (!schoolId) {
      setActivities([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const scopedSuffix =
        branchScoped && branchId ? `&branchId=${encodeURIComponent(branchId)}` : "";
      const cacheKeySuffix = branchScoped ? branchId : "none";
      const requests = await Promise.allSettled([
        deduplicatedFetch(
          `dashboard-activity:messages:${schoolId}:${cacheKeySuffix}`,
          () => fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(
            `/api/web/teacher-activity/messages?schoolId=${encodeURIComponent(schoolId)}&pageSize=3${scopedSuffix}`,
          )
        ),
        deduplicatedFetch(
          `dashboard-activity:homework:${schoolId}:${cacheKeySuffix}`,
          () => fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(
            `/api/web/teacher-activity/homework?schoolId=${encodeURIComponent(schoolId)}&pageSize=3${scopedSuffix}`,
          )
        ),
        deduplicatedFetch(
          `dashboard-activity:alerts:${schoolId}:${cacheKeySuffix}`,
          () => fetchJsonWithAuthorizedSession<{ items: ActivityApiItem[] }>(
            `/api/web/fee-notifications?schoolId=${encodeURIComponent(schoolId)}&pageSize=3${scopedSuffix}`,
          )
        ),
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

      const sortedActivities = combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
      setActivities(sortedActivities);
      // Show error only when we have nothing to display — partial failures with loaded items show what we have
      setError(combined.length === 0 && failedSources > 0 ? "dashboard_activity_failed" : null);
    } catch (err) {
      console.error("Failed to fetch recent activities", err);
      setActivities([]);
      setError(err instanceof Error ? err.message : "dashboard_activity_failed");
    } finally {
      setLoading(false);
    }
  }, [branchScoped, profile, selectedSchoolId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchActivities();
  }, [profile, scopeLoading, fetchActivities]);

  return useMemo(() => ({
    activities,
    loading,
    error,
    refresh: fetchActivities,
  }), [activities, loading, error, fetchActivities]);
}
