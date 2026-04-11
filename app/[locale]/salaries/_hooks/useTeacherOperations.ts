"use client";

import { useCallback } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { Teacher, TeacherFormData, SalaryFormData, Salary, SalaryType } from "../_types";

interface UseTeacherOperationsProps {
  schoolId: string | null;
  canManageTeacher: boolean;
  ensureReferenceData: () => Promise<void>;
  fetchAll: () => Promise<void>;
  setSuccess: (_s: string) => void;
  setError: (_s: string) => void;
  setTeacherForm: React.Dispatch<React.SetStateAction<TeacherFormData>>;
  setTeacherEditId: React.Dispatch<React.SetStateAction<string | null>>;
  setTeacherModalError: React.Dispatch<React.SetStateAction<string>>;
  setShowTeacherModal: React.Dispatch<React.SetStateAction<boolean>>;
  setTeacherModalSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTeacherOperations({
  schoolId,
  canManageTeacher,
  ensureReferenceData,
  fetchAll,
  setSuccess: _setSuccess,
  setError: _setError,
  setTeacherForm,
  setTeacherEditId,
  setTeacherModalError,
  setShowTeacherModal,
  setTeacherModalSaving,
}: UseTeacherOperationsProps) {
  const resetTeacherForm = useCallback(() => {
    setTeacherForm({
      full_name: "",
      job_title: "",
      salary_type: "fixed",
      subject: "",
      phone: "",
      address: "",
      base_salary: "",
      lecture_price: "",
      weekly_hours: "",
      classes_taught: [{ grade: "", section: "" }],
      status: "active",
    });
  }, [setTeacherForm]);

  const openTeacherAdd = useCallback(async () => {
    await ensureReferenceData();
    setTeacherEditId(null);
    resetTeacherForm();
    setTeacherModalError("");
    setShowTeacherModal(true);
  }, [ensureReferenceData, resetTeacherForm, setTeacherEditId, setTeacherModalError, setShowTeacherModal]);

  const openTeacherEdit = useCallback(async (t: Teacher) => {
    await ensureReferenceData();
    setTeacherEditId(t.id);
    const ct = (t.classes_taught as { grade: string; section: string }[]) || [];
    setTeacherForm({
      full_name: String(t.full_name ?? ""),
      job_title: String(t.job_title ?? ""),
      salary_type: String(t.salary_type ?? "fixed") as SalaryType,
      subject: String(t.subject ?? ""),
      phone: String(t.phone ?? ""),
      address: String(t.address ?? ""),
      base_salary: String(t.base_salary ?? ""),
      lecture_price: String(t.lecture_price ?? ""),
      weekly_hours: String(t.weekly_hours ?? ""),
      classes_taught: ct.length ? ct : [{ grade: "", section: "" }],
      status: String(t.status ?? "active") as TeacherFormData["status"],
    });
    setTeacherModalError("");
    setShowTeacherModal(true);
  }, [ensureReferenceData, setTeacherEditId, setTeacherForm, setTeacherModalError, setShowTeacherModal]);

  const saveTeacherModal = useCallback(async (e: React.FormEvent, teacherEditId: string | null, teacherForm: TeacherFormData) => {
    e.preventDefault();
    if (!canManageTeacher || !schoolId) return;
    setTeacherModalSaving(true);
    setTeacherModalError("");
    const validClasses = teacherForm.classes_taught.filter((c) => c.grade);
    const payload = {
      school_id: schoolId,
      full_name: teacherForm.full_name.trim(),
      subject: teacherForm.subject || null,
      job_title: teacherForm.job_title || null,
      salary_type: teacherForm.salary_type,
      phone: teacherForm.phone || null,
      address: teacherForm.address || null,
      base_salary: parseInt(teacherForm.base_salary, 10) || 0,
      lecture_price: parseInt(teacherForm.lecture_price, 10) || 0,
      weekly_hours: parseInt(teacherForm.weekly_hours, 10) || 0,
      classes_taught: validClasses.length ? validClasses : [],
      status: teacherForm.status,
    };
    if (!payload.full_name) {
      setTeacherModalError("يرجى إدخال الاسم");
      setTeacherModalSaving(false);
      return;
    }
    const endpoint = teacherEditId
      ? `/api/web/salaries/teachers/${encodeURIComponent(teacherEditId)}`
      : "/api/web/salaries/teachers";
    const method = teacherEditId ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<{
      teacher?: Teacher;
      error?: { message?: string };
    }>(endpoint, {
      method,
      headers: withJsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setTeacherModalError(responsePayload?.error?.message || "تعذر حفظ بيانات الأستاذ.");
    } else {
      setShowTeacherModal(false);
      await fetchAll();
    }
    setTeacherModalSaving(false);
  }, [canManageTeacher, schoolId, fetchAll, setTeacherModalError, setTeacherModalSaving, setShowTeacherModal]);

  return {
    resetTeacherForm,
    openTeacherAdd,
    openTeacherEdit,
    saveTeacherModal,
  };
}

interface UseSalaryOperationsProps {
  schoolId: string | null;
  loadTeacherMonthLectures: (teacher: Teacher, month: string) => Promise<{ count: number; total: number }>;
  fetchAll: () => Promise<void>;
  setSuccess: (s: string) => void;
  setError: (s: string) => void;
  setSalaryForm: React.Dispatch<React.SetStateAction<SalaryFormData>>;
  setSelectedTeacher: React.Dispatch<React.SetStateAction<Teacher | null>>;
  setShowPaySalary: React.Dispatch<React.SetStateAction<boolean>>;
  setSavingSalary: React.Dispatch<React.SetStateAction<boolean>>;
  setLectureSalaryCalc: React.Dispatch<React.SetStateAction<{ count: number; total: number }>>;
}

export function useSalaryOperations({
  schoolId,
  loadTeacherMonthLectures: _loadTeacherMonthLectures,
  fetchAll,
  setSuccess,
  setError,
  setSalaryForm,
  setSelectedTeacher,
  setShowPaySalary,
  setSavingSalary,
  setLectureSalaryCalc: _setLectureSalaryCalc,
}: UseSalaryOperationsProps) {
  const handlePaySalary = useCallback(async (
    e: React.FormEvent,
    selectedTeacher: Teacher | null,
    salaryForm: SalaryFormData,
    lectureSalaryCalc: { count: number; total: number }
  ) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setSavingSalary(true);
    setError("");
    let gross = 0;
    if (selectedTeacher.salary_type === "fixed") {
      gross = Number(selectedTeacher.base_salary) || 0;
    } else if (selectedTeacher.salary_type === "hourly") {
      gross = lectureSalaryCalc.total;
    } else if (selectedTeacher.salary_type === "mixed") {
      gross = (Number(selectedTeacher.base_salary) || 0) + lectureSalaryCalc.total;
    } else {
      gross = parseInt(salaryForm.gross_salary) || Number(selectedTeacher.base_salary) || 0;
    }
    const deductions = parseInt(salaryForm.deductions) || 0;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        salary?: Salary;
        warning?: string;
        error?: { message?: string };
      }>("/api/web/salaries/pay", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: selectedTeacher.id,
          gross_salary: gross,
          deductions,
          month: salaryForm.month,
          notes: salaryForm.notes || null,
        }),
      });
      if (!response.ok) {
        setError(payload?.error?.message || "تعذر صرف الراتب.");
        return;
      }
      setSuccess(
        payload?.warning
          ? `تم دفع راتب ${selectedTeacher.full_name} مع معالجة التكرارات المتزامنة ✓`
          : `تم دفع راتب ${selectedTeacher.full_name} ✓`
      );
      setShowPaySalary(false);
      setSalaryForm({ gross_salary: "", deductions: "0", notes: "", month: new Date().toISOString().slice(0, 7) });
      setSelectedTeacher(null);
      fetchAll();
      setTimeout(() => setSuccess(""), 3000);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "تعذر صرف الراتب.");
    } finally {
      setSavingSalary(false);
    }
  }, [schoolId, fetchAll, setError, setSuccess, setSalaryForm, setSelectedTeacher, setShowPaySalary, setSavingSalary]);

  return { handlePaySalary };
}
