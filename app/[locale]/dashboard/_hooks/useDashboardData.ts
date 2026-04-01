"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
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
}

interface DashboardOverviewResponse {
  totals?: DashboardTotals;
  recentPayments?: DashboardRecentPayment[];
  overdueStudents?: DashboardOverdueStudent[];
  classFees?: ClassFee[];
  studentCountByClass?: Record<string, number>;
  error?: { message?: string };
}

export function useDashboardData({ profile, selectedSchoolId, scopeLoading }: UseDashboardDataProps) {
  const [dashboardTotals, setDashboardTotals] = useState<DashboardTotals>(EMPTY_DASHBOARD_TOTALS);
  const [recentPayments, setRecentPayments] = useState<DashboardRecentPayment[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<DashboardOverdueStudent[]>([]);
  const [studentCountByClass, setStudentCountByClass] = useState<Record<string, number>>({});
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId });
    setLoading(true);
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
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardOverviewResponse>(
        `/api/web/dashboard/overview?schoolId=${encodeURIComponent(schoolId)}`
      );

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل لوحة التحكم.");
      }

      setDashboardTotals(payload?.totals ?? EMPTY_DASHBOARD_TOTALS);
      setRecentPayments(payload?.recentPayments ?? []);
      setOverdueStudents(payload?.overdueStudents ?? []);
      setStudentCountByClass(payload?.studentCountByClass ?? {});
      setClassFees(payload?.classFees ?? []);
    } catch {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedSchoolId]);

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
    refetch: fetchAll,
    setClassFees,
  };
}
