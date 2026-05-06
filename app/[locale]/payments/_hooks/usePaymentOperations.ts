"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Student, Payment, PayFormState, SEARCH_DEBOUNCE_MS } from "../_types";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { resolveBranchIdForSchool } from "@/lib/school/context";

export function buildReceiptNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().split("-")[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `REC-${stamp}-${randomPart}`;
}

const initialPayForm: PayFormState = {
  amount: "",
  payment_method: "cash",
  notes: "",
  receipt_date: new Date().toISOString().split("T")[0],
  manual_receipt_number: "",
};

export function usePaymentOperations(
  resolvedSchoolId: string | null,
  canAddPayments: boolean,
  canDeletePayments: boolean,
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
  onPaymentCreated?: (payment: Payment, student: Student) => void,
  currentBranchId?: string | null
) {
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<string, Payment[]>>({});
  const [paymentsLoadingStudentId, setPaymentsLoadingStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Student search state
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<Map<string, Student[]>>(new Map());
  const searchAbortRef = useRef<AbortController | null>(null);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payStudent, setPayStudent] = useState<Student | null>(null);
  const [payForm, setPayForm] = useState<PayFormState>(initialPayForm);

  // Delete confirmation
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Load payments when student selected for payment
  useEffect(() => {
    if (!payStudent || !resolvedSchoolId) return;
    if (paymentsByStudent[payStudent.id]) return; // Already loaded

    setPaymentsLoadingStudentId(payStudent.id);
    void (async () => {
      try {
        const params = new URLSearchParams({
          schoolId: resolvedSchoolId,
        });
        if (currentBranchId) {
          params.set("branchId", currentBranchId);
        }

        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          payments?: Payment[];
          error?: { message?: string };
        }>(`/api/web/payments/students/${payStudent.id}?${params.toString()}`);

        if (!response.ok) {
          onError?.(payload?.error?.message || "تعذر تحميل سجل دفعات الطالب.");
          return;
        }

        const nextPayments = payload?.payments ?? [];
        setPaymentsByStudent((current) => ({ ...current, [payStudent.id]: nextPayments }));
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "تعذر تحميل سجل دفعات الطالب.");
      } finally {
        setPaymentsLoadingStudentId(null);
      }
    })();
  }, [payStudent?.id, resolvedSchoolId, onError, currentBranchId]);

  // Student search effect
  useEffect(() => {
    if (!showPayModal || !resolvedSchoolId || payStudent || !studentSearch.trim()) {
      setStudentSearchResults([]);
      setStudentSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      const query = studentSearch.trim().toLowerCase();
      const cacheKey = `${resolvedSchoolId}::${query}`;
      const cached = searchCacheRef.current.get(cacheKey);
      if (cached) {
        setStudentSearchResults(cached);
        setStudentSearchLoading(false);
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setStudentSearchLoading(true);
      void (async () => {
        try {
          const params = new URLSearchParams({
            schoolId: resolvedSchoolId,
            q: studentSearch.trim(),
            limit: "8",
          });
          if (currentBranchId) {
            params.set("branchId", currentBranchId);
          }
          const { response, payload } = await fetchJsonWithAuthorizedSession<{
            students?: Student[];
            error?: { message?: string };
          }>(`/api/web/payments/student-search?${params.toString()}`);

          if (cancelled) return;
          if (controller.signal.aborted) return;
          if (!response.ok) {
            throw new Error(payload?.error?.message || "تعذر تحميل نتائج البحث.");
          }

          const nextResults = payload?.students ?? [];
          searchCacheRef.current.set(cacheKey, nextResults);
          setStudentSearchResults(nextResults);
        } catch (searchError) {
          if (cancelled) return;
          if (controller.signal.aborted) return;
          setStudentSearchResults([]);
          onError?.(searchError instanceof Error ? searchError.message : "تعذر تحميل نتائج البحث.");
        } finally {
          if (!cancelled && !controller.signal.aborted) {
            setStudentSearchLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      searchAbortRef.current?.abort();
    };
  }, [payStudent, resolvedSchoolId, showPayModal, studentSearch, onError, currentBranchId]);

  const loadStudentPayments = useCallback(
    async (studentId: string, options?: { force?: boolean }) => {
      if (!resolvedSchoolId) return [];
      if (!options?.force && paymentsByStudent[studentId]) {
        return paymentsByStudent[studentId];
      }

      setPaymentsLoadingStudentId(studentId);
      try {
        const params = new URLSearchParams({
          schoolId: resolvedSchoolId,
        });
        if (currentBranchId) {
          params.set("branchId", currentBranchId);
        }

        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          payments?: Payment[];
          error?: { message?: string };
        }>(`/api/web/payments/students/${studentId}?${params.toString()}`);

        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تحميل سجل دفعات الطالب.");
        }

        const nextPayments = payload?.payments ?? [];
        setPaymentsByStudent((current) => ({ ...current, [studentId]: nextPayments }));
        return nextPayments;
      } catch (loadError) {
        onError?.(loadError instanceof Error ? loadError.message : "تعذر تحميل سجل دفعات الطالب.");
        return [];
      } finally {
        setPaymentsLoadingStudentId((current) => (current === studentId ? null : current));
      }
    },
    [paymentsByStudent, resolvedSchoolId, onError, currentBranchId]
  );

  // Calculate actual paid amount by summing student's payments
  const calculateActualPaidFee = (studentId: string): number => {
    const payments = paymentsByStudent[studentId] ?? [];
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  const handlePayment = useCallback(
    async (
      e: React.FormEvent,
      student: Student,
      form: PayFormState,
      onUpdate: (studentId: string, update: { paid_fee: number; remaining_fee: number }) => void,
      onMetaRefresh: () => void,
      onIncrementCount: () => void,
      onAddYear: (year: number) => void
    ) => {
      e.preventDefault();
      if (!canAddPayments) {
        onError?.("ليس لديك صلاحية إضافة دفعات جديدة.");
        return;
      }
      if (!student) return;
      setSaving(true);

      const amount = parseInt(form.amount);
      if (!amount || amount <= 0) {
        onError?.("المبلغ يجب أن يكون أكبر من صفر");
        setSaving(false);
        return;
      }

      const targetSchoolId = student.school_id || resolvedSchoolId;
      if (!targetSchoolId) {
        onError?.("لا يمكن تحديد المدرسة الخاصة بهذا المستخدم");
        setSaving(false);
        return;
      }

      // Use the student's own branch_id to avoid mismatched branch scope errors.
      // Falling back to a school-level query could return a different branch than the student's.
      const branchId = student.branch_id ?? await resolveBranchIdForSchool(targetSchoolId);
      const electronicReceiptNum = buildReceiptNumber();
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          payment?: Payment;
          studentUpdate?: { id: string; paid_fee: number; remaining_fee: number } | null;
          error?: { message?: string };
        }>("/api/web/payments/records", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: targetSchoolId,
            branch_id: branchId,
            student_id: student.id,
            amount,
            payment_method: form.payment_method,
            notes: form.notes || null,
            receipt_date: form.receipt_date,
            receipt_number: electronicReceiptNum,
            manual_receipt_number: form.manual_receipt_number || null,
          }),
        });

        if (!response.ok) {
          onError?.(payload?.error?.message || "تعذر تسجيل الدفعة.");
          return;
        }

        // Force reload student payments to ensure we have fresh state
        const freshPayments = await loadStudentPayments(student.id, { force: true });

        // Update student financials from response
        if (payload?.studentUpdate) {
          onUpdate(student.id, payload.studentUpdate);
        }

        // Add the new payment and log payment year
        if (payload?.payment) {
          const newPayment = payload.payment;
          onIncrementCount();
          const createdYear = payload.payment.created_at ? new Date(payload.payment.created_at).getFullYear() : null;
          if (typeof createdYear === "number" && Number.isFinite(createdYear)) {
            onAddYear(createdYear);
          }
          onPaymentCreated?.(newPayment, student);
        }

        onSuccess?.("تم تسجيل الدفعة بنجاح ✓");
        setShowPayModal(false);
        setPayForm(initialPayForm);
        setPayStudent(null);
        setStudentSearch("");
        setStudentSearchResults([]);
      } catch (payError) {
        onError?.(payError instanceof Error ? payError.message : "تعذر تسجيل الدفعة.");
      } finally {
        setSaving(false);
      }
    },
    [canAddPayments, resolvedSchoolId, onError, onPaymentCreated, onSuccess, currentBranchId]
  );

  const deletePayment = useCallback(
    async (
      paymentId: string,
      studentId: string,
      onUpdate: (studentId: string, update: { paid_fee: number; remaining_fee: number }) => void,
      onMetaRefresh: () => void,
      onDecrementCount: () => void
    ) => {
      if (!canDeletePayments) {
        const msg = "ليس لديك صلاحية حذف الدفعات.";
        onError?.(msg);
        return;
      }
      if (!resolvedSchoolId) {
        const msg = "تعذر تحديد سياق المدرسة لهذه العملية.";
        onError?.(msg);
        return;
      }

      try {
        const deleteBody: Record<string, any> = { school_id: resolvedSchoolId };
        if (currentBranchId) {
          deleteBody.branch_id = currentBranchId;
        }

        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          deletedPaymentId?: string;
          studentUpdate?: { id: string; paid_fee: number; remaining_fee: number } | null;
          warning?: string;
          error?: { message?: string };
        }>(`/api/web/payments/records/${paymentId}`, {
          method: "DELETE",
          headers: withJsonHeaders(),
          body: JSON.stringify(deleteBody),
        });

        if (!response.ok) {
          const errMsg = payload?.error?.message || "تعذر حذف الدفعة.";
          onError?.(errMsg);
          return;
        }

        // Update student financials from response
        if (payload?.studentUpdate) {
          onUpdate(studentId, payload.studentUpdate);
        }

        // Remove payment from local state
        setPaymentsByStudent((current) => ({
          ...current,
          [studentId]: (current[studentId] ?? []).filter((payment) => payment.id !== paymentId),
        }));

        // Force reload fresh payments to ensure consistency
        await loadStudentPayments(studentId, { force: true });

        onDecrementCount();

        if (payload?.warning) {
          onError?.(`تم حذف الدفعة لكن تعذر مزامنة رصيد الطالب بالكامل: ${payload.warning}`);
        } else {
          onError?.("تم حذف الدفعة بنجاح ✓");
        }

        onMetaRefresh();
      } catch (deleteError) {
        const errMsg = deleteError instanceof Error ? deleteError.message : "تعذر حذف الدفعة.";
        onError?.(errMsg);
      }
    },
    [canDeletePayments, resolvedSchoolId, onError, loadStudentPayments]
  );

  const openPaymentModal = useCallback(
    (student?: Student) => {
      if (student) {
        setPayStudent(student);
        setStudentSearch(student.full_name);
        setStudentSearchResults([]);
      } else {
        setPayStudent(null);
        setStudentSearch("");
        setStudentSearchResults([]);
      }
      setShowPayModal(true);
    },
    []
  );

  const closePaymentModal = useCallback(() => {
    setShowPayModal(false);
    setPayStudent(null);
    setStudentSearch("");
    setStudentSearchResults([]);
    setPayForm(initialPayForm);
  }, []);

  const selectStudentForPayment = useCallback((student: Student) => {
    setPayStudent(student);
    setStudentSearch(student.full_name);
    setStudentSearchResults([]);
    setShowDropdown(false);
  }, []);

  return useMemo(() => ({
    // Payment modal
    showPayModal,
    payStudent,
    payForm,
    setPayForm,
    saving,
    openPaymentModal,
    closePaymentModal,
    handlePayment,
    selectStudentForPayment,

    // Student search
    studentSearch,
    setStudentSearch,
    studentSearchResults,
    studentSearchLoading,
    showDropdown,
    setShowDropdown,
    searchRef,

    // Payments by student
    paymentsByStudent,
    paymentsLoadingStudentId,
    loadStudentPayments,

    // Delete
    pendingDeletePaymentId,
    setPendingDeletePaymentId,
    deletePayment,
  }), [showPayModal, payStudent, payForm, setPayForm, saving, openPaymentModal, closePaymentModal, handlePayment, selectStudentForPayment, studentSearch, setStudentSearch, studentSearchResults, studentSearchLoading, showDropdown, setShowDropdown, searchRef, paymentsByStudent, paymentsLoadingStudentId, loadStudentPayments, pendingDeletePaymentId, setPendingDeletePaymentId, deletePayment]);
}
