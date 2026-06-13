"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch, clearCacheFor } from "@/lib/request-cache";
import { resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import {
  DashboardTotals,
  DashboardRecentPayment,
  DashboardOverdueStudent,
  ClassFee,
  EMPTY_DASHBOARD_TOTALS,
} from "../_components/types";

interface UseDashboardDataProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  scopeLoading: boolean;
  branchScoped?: boolean;
}

interface DashboardOverviewResponse {
  totals?: DashboardTotals;
  recentPayments?: DashboardRecentPayment[];
  overdueStudents?: DashboardOverdueStudent[];
  classFees?: ClassFee[];
  studentCountByClass?: Record<string, number>;
  warning?: string;
  error?: { message?: string };
}

export function useDashboardData({
  profile,
  selectedSchoolId,
  scopeLoading,
  branchScoped = false,
}: UseDashboardDataProps) {
  const [dashboardTotals, setDashboardTotals] = useState<DashboardTotals>(EMPTY_DASHBOARD_TOTALS);
  const [recentPayments, setRecentPayments] = useState<DashboardRecentPayment[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<DashboardOverdueStudent[]>([]);
  const [studentCountByClass, setStudentCountByClass] = useState<Record<string, number>>({});
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    let schoolId: string | null = null;
    let branchId: string | null = null;
    try {
      const resolved = await resolveSchoolBranchForProfile(profile, { selectedSchoolId });
      schoolId = resolved.school_id;
      branchId = resolved.branch_id;
    } catch {
      // fall through with null ids — API will handle auth
    }

    if (!schoolId) {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
      setLoading(false);
      return;
    }

    try {
      const searchParams = new URLSearchParams({ schoolId });
      if (branchScoped && branchId) {
        searchParams.set("branchId", branchId);
      }

      const cacheKey = `dashboard-overview:${schoolId}:${branchScoped ? branchId : "none"}`;
      // Clear stale cache so refetch after mutations gets fresh data
      clearCacheFor(cacheKey);
      const { response, payload } = await deduplicatedFetch(
        cacheKey,
        () => fetchJsonWithAuthorizedSession<DashboardOverviewResponse>(
          `/api/web/dashboard/overview?${searchParams.toString()}`
        )
      );

      if (!response.ok) {
        if (branchScoped) {
          // In branch-scoped mode, treat API failures as degraded — show zeros rather than an error block.
          setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
          setRecentPayments([]);
          setOverdueStudents([]);
          setStudentCountByClass({});
          setClassFees([]);
          setError(null);
          setWarning("degraded_dashboard_overview");
          return;
        }
        throw new Error(payload?.error?.message || "تعذر تحميل لوحة التحكم.");
      }

      setDashboardTotals({ ...EMPTY_DASHBOARD_TOTALS, ...(payload?.totals ?? {}) });
      setRecentPayments(payload?.recentPayments ?? []);
      setOverdueStudents(payload?.overdueStudents ?? []);
      setStudentCountByClass(payload?.studentCountByClass ?? {});
      setClassFees(payload?.classFees ?? []);
      setError(null);
      setWarning(typeof payload?.warning === "string" ? payload.warning : null);
    } catch (caughtError) {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
      if (branchScoped) {
        // In branch-scoped mode, network/parse errors also show as degraded rather than blocking.
        setError(null);
        setWarning("degraded_dashboard_overview");
      } else {
        setError(caughtError instanceof Error ? caughtError.message : "dashboard_overview_failed");
        setWarning(null);
      }
    } finally {
      setLoading(false);
    }
  }, [branchScoped, profile, selectedSchoolId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchAll();
  }, [profile, scopeLoading, fetchAll]);

  return useMemo(() => ({
    dashboardTotals,
    recentPayments,
    overdueStudents,
    studentCountByClass,
    classFees,
    loading,
    error,
    warning,
    refetch: fetchAll,
  }), [dashboardTotals, recentPayments, overdueStudents, studentCountByClass, classFees, loading, error, warning, fetchAll]);
}
