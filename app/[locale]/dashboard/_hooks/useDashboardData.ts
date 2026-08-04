"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { deduplicatedFetch } from "@/lib/request-cache";
import { resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import {
  DashboardTotals,
  DashboardRecentPayment,
  DashboardOverdueStudent,
  ClassFee,
  EMPTY_DASHBOARD_TOTALS,
  BranchBreakdown,
  TeacherSubjectCount,
  MonthlyDataPoint,
  AttendanceSummary,
  MonthOverMonthChange,
  EMPTY_MONTH_CHANGE,
  EMPTY_ATTENDANCE,
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
  branchBreakdown?: BranchBreakdown[];
  teachersBySubject?: TeacherSubjectCount[];
  monthlyIncome?: MonthlyDataPoint[];
  monthChange?: MonthOverMonthChange;
  attendanceSummary?: AttendanceSummary;
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
  const [branchBreakdown, setBranchBreakdown] = useState<BranchBreakdown[]>([]);
  const [teachersBySubject, setTeachersBySubject] = useState<TeacherSubjectCount[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyDataPoint[]>([]);
  const [monthChange, setMonthChange] = useState<MonthOverMonthChange>(EMPTY_MONTH_CHANGE);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>(EMPTY_ATTENDANCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
    setRecentPayments([]);
    setOverdueStudents([]);
    setStudentCountByClass({});
    setClassFees([]);
    setBranchBreakdown([]);
    setTeachersBySubject([]);
    setMonthlyIncome([]);
    setMonthChange(EMPTY_MONTH_CHANGE);
    setAttendanceSummary(EMPTY_ATTENDANCE);
  }, []);

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
      // fall through with null ids
    }

    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      const searchParams = new URLSearchParams({ schoolId });
      if (branchScoped && branchId) {
        searchParams.set("branchId", branchId);
      }

      const cacheKey = `dashboard-overview:${schoolId}:${branchScoped ? branchId : "none"}`;
      // Do NOT clearCacheFor(cacheKey) here. deduplicatedFetch caches the
      // in-flight promise for 5s to collapse bursts — it is not a data cache.
      // Clearing the key immediately before using it guaranteed that two
      // near-simultaneous callers both missed and both fetched. This hook is
      // mounted by three components, so /dashboard/overview was hit twice on
      // every load.
      const { response, payload } = await deduplicatedFetch(
        cacheKey,
        () => fetchJsonWithAuthorizedSession<DashboardOverviewResponse>(
          `/api/web/dashboard/overview?${searchParams.toString()}`
        )
      );

      if (!response.ok) {
        if (branchScoped) {
          resetAll();
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
      setBranchBreakdown(payload?.branchBreakdown ?? []);
      setTeachersBySubject(payload?.teachersBySubject ?? []);
      setMonthlyIncome(payload?.monthlyIncome ?? []);
      setMonthChange(payload?.monthChange ?? EMPTY_MONTH_CHANGE);
      setAttendanceSummary(payload?.attendanceSummary ?? EMPTY_ATTENDANCE);
      setError(null);
      setWarning(typeof payload?.warning === "string" ? payload.warning : null);
    } catch (caughtError) {
      resetAll();
      if (branchScoped) {
        setError(null);
        setWarning("degraded_dashboard_overview");
      } else {
        setError(caughtError instanceof Error ? caughtError.message : "dashboard_overview_failed");
        setWarning(null);
      }
    } finally {
      setLoading(false);
    }
  }, [branchScoped, profile, selectedSchoolId, resetAll]);

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
    branchBreakdown,
    teachersBySubject,
    monthlyIncome,
    monthChange,
    attendanceSummary,
    loading,
    error,
    warning,
    refetch: fetchAll,
  }), [dashboardTotals, recentPayments, overdueStudents, studentCountByClass, classFees, branchBreakdown, teachersBySubject, monthlyIncome, monthChange, attendanceSummary, loading, error, warning, fetchAll]);
}
