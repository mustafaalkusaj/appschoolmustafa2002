"use client";

import { useState, useCallback, useEffect } from "react";
import { Student, PaymentsPageState, PAGE_SIZE } from "../_types";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

const paymentsPageCache = new Map<string, PaymentsPageState>();

export function useStudentsPage(
  resolvedSchoolId: string | null,
  quickFilter: string,
  filterClass: string,
  filterSort: string,
  filterDir: string,
  search: string
) {
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentCountsByStudent, setPaymentCountsByStudent] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const buildStudentsQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      schoolId: resolvedSchoolId ?? "",
      page: String(page),
      pageSize: String(PAGE_SIZE),
      quickFilter,
      sort: filterSort,
      dir: filterDir,
    });

    if (search) {
      params.set("search", search);
    }

    if (filterClass) {
      params.set("className", filterClass);
    }

    return params;
  }, [filterClass, filterDir, filterSort, page, quickFilter, resolvedSchoolId, search]);

  const fetchStudentsPage = useCallback(async () => {
    if (!resolvedSchoolId) return;

    const params = buildStudentsQueryParams();
    const cacheKey = params.toString();
    const cached = paymentsPageCache.get(cacheKey);

    if (cached) {
      setStudents(cached.students);
      setPaymentCountsByStudent(cached.paymentCountsByStudent);
      setTotalCount(cached.totalCount);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: Student[];
        paymentCountsByStudent?: Record<string, number>;
        totalCount?: number;
        error?: { message?: string };
      }>(`/api/web/payments/students?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل قائمة المدفوعات.");
      }

      const nextPage = {
        students: payload?.students ?? [],
        paymentCountsByStudent: payload?.paymentCountsByStudent ?? {},
        totalCount: typeof payload?.totalCount === "number" ? payload.totalCount : 0,
      } satisfies PaymentsPageState;

      paymentsPageCache.set(cacheKey, nextPage);
      setStudents(nextPage.students);
      setPaymentCountsByStudent(nextPage.paymentCountsByStudent);
      setTotalCount(nextPage.totalCount);
    } catch {
      if (!cached) {
        setStudents([]);
        setPaymentCountsByStudent({});
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildStudentsQueryParams, resolvedSchoolId]);

  useEffect(() => {
    if (!resolvedSchoolId) return;
    void fetchStudentsPage();
  }, [fetchStudentsPage, resolvedSchoolId]);

  useEffect(() => {
    setPage(1);
  }, [resolvedSchoolId, search, quickFilter, filterClass, filterSort, filterDir]);

  const updateStudentFinancials = useCallback((studentId: string, update: { paid_fee: number; remaining_fee: number }) => {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? { ...student, paid_fee: update.paid_fee, remaining_fee: update.remaining_fee }
          : student
      )
    );
  }, []);

  const updatePaymentCount = useCallback((studentId: string, delta: number) => {
    setPaymentCountsByStudent((current) => ({
      ...current,
      [studentId]: Math.max(0, (current[studentId] ?? 0) + delta),
    }));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    students,
    paymentCountsByStudent,
    totalCount,
    totalPages,
    loading,
    page,
    setPage,
    fetchStudentsPage,
    updateStudentFinancials,
    updatePaymentCount,
  };
}
