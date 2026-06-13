"use client";

import { useState, useRef, useCallback } from "react";
import { PaymentModal } from "@/app/[locale]/payments/_components/PaymentModal";
import type { Student, PayFormState } from "@/app/[locale]/payments/_types";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

interface DashboardPaymentModalProps {
  show: boolean;
  schoolId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_PAY_FORM: PayFormState = {
  amount: "",
  payment_method: "cash",
  notes: "",
  receipt_date: new Date().toISOString().slice(0, 10),
  manual_receipt_number: "",
};

export function DashboardPaymentModal({ show, schoolId, onClose, onSuccess }: DashboardPaymentModalProps) {
  const [payStudent, setPayStudent] = useState<Student | null>(null);
  const [payForm, setPayForm] = useState<PayFormState>(DEFAULT_PAY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!schoolId || q.length < 2) { setStudentSearchResults([]); setShowDropdown(false); return; }
    setStudentSearchLoading(true);
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/payments/student-search?schoolId=${schoolId}&search=${encodeURIComponent(q)}`
      );
      const data = await res.json() as { students?: Student[] } | Student[];
      const list: Student[] = Array.isArray(data)
        ? data
        : ((data as { students?: Student[] }).students ?? []);
      setStudentSearchResults(list);
      setShowDropdown(true);
    } catch {
      // silent
    } finally {
      setStudentSearchLoading(false);
    }
  }, [schoolId]);

  const handleStudentSearch = (q: string) => {
    setStudentSearch(q);
    setPayStudent(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(q), 350);
  };

  const handleClose = () => {
    setPayStudent(null);
    setPayForm(DEFAULT_PAY_FORM);
    setStudentSearch("");
    setStudentSearchResults([]);
    setShowDropdown(false);
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payStudent || !schoolId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/web/payments/records", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          branch_id: null,
          student_id: payStudent.id,
          amount: Number(payForm.amount),
          payment_method: payForm.payment_method,
          notes: payForm.notes || null,
          receipt_date: payForm.receipt_date,
          receipt_number: `R${Date.now().toString().slice(-8)}`,
          manual_receipt_number: payForm.manual_receipt_number || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setError(data?.error?.message || "فشل الحفظ");
        return;
      }
      handleClose();
      onSuccess();
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaymentModal
      show={show}
      payStudent={payStudent}
      payForm={payForm}
      setPayForm={setPayForm}
      saving={saving}
      onClose={handleClose}
      onSubmit={handleSubmit}
      error={error}
      studentSearch={studentSearch}
      setStudentSearch={handleStudentSearch}
      studentSearchResults={studentSearchResults}
      studentSearchLoading={studentSearchLoading}
      showDropdown={showDropdown}
      setShowDropdown={setShowDropdown}
      searchRef={searchRef}
      onSelectStudent={(s) => { setPayStudent(s); setShowDropdown(false); setStudentSearch(s.full_name); }}
    />
  );
}
