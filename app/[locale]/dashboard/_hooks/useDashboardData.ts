"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
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

  const fetchAll = useCallback(async () => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    setLoading(true);
    setError(null);
    if (!schoolId) {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const searchParams = new URLSearchParams({ schoolId });
      if (branchScoped && branchId) {
        searchParams.set("branchId", branchId);
      }
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardOverviewResponse>(
        `/api/web/dashboard/overview?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل لوحة التحكم.");
      }

      setDashboardTotals({ ...EMPTY_DASHBOARD_TOTALS, ...(payload?.totals ?? {}) });
      setRecentPayments(payload?.recentPayments ?? []);
      setOverdueStudents(payload?.overdueStudents ?? []);
      setStudentCountByClass(payload?.studentCountByClass ?? {});
      setClassFees(payload?.classFees ?? []);
      setError(null);
    } catch (caughtError) {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
      setError(caughtError instanceof Error ? caughtError.message : "dashboard_overview_failed");
    } finally {
      setLoading(false);
    }
  }, [branchScoped, profile, selectedSchoolId]);

  useEffect(() => {
    if (!profile || scopeLoading) return;
    void fetchAll();
  }, [profile, scopeLoading, fetchAll]);

  return {
    dashboardTotals,
    recentPayments,
    overdueStudents,
    studentCountByClass,
    classFees,
    loading,
    error,
    refetch: fetchAll,
    setClassFees,
  };
}
