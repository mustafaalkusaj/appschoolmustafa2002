"use client";

import { useCallback } from "react";
import type { StudentWithFees, StudentStatus, ManagedUserAccountCard, StudentFormData } from "../_types";
import { STATUS_MAP, DEFAULT_STUDENT_FORM } from "../_constants";
import { formatDate } from "@/lib/formatting";
import { loadXLSX } from "@/lib/xlsx-loader";
import { supabase } from "@/lib/supabase";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import { readApiError, validateStudentImportFile } from "../_utils";

export interface UseStudentsOperationsOptions {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  canEditStudents: boolean;
  canDeleteStudents: boolean;
  canManageStudentAccounts: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  locale: "ar" | "en";
  runtimeBranding: {
    schoolName?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  };
  modals: {
    setError: (error: string) => void;
    setSuccess: (success: string) => void;
    setSaving: (saving: boolean) => void;
    setImporting: (importing: boolean) => void;
    setImportError: (error: string) => void;
    setImportPreview: (preview: Record<string, unknown>[]) => void;
    setShowModal: (show: boolean) => void;
    setShowEdit: (show: boolean) => void;
    setShowDeleteConfirm: (show: boolean) => void;
    setShowImport: (show: boolean) => void;
    setAddStep: (step: number) => void;
    setForm: (form: StudentFormData) => void;
    setEditForm: (form: StudentFormData) => void;
    setAccountCard: (card: ManagedUserAccountCard | null) => void;
    setRevealedPassword: (password: string | null) => void;
    setSelectedStudent: (student: StudentWithFees | null) => void;
    setActiveMenu: (menu: string | null) => void;
    form: StudentFormData;
    editForm: StudentFormData;
    selectedStudent: StudentWithFees | null;
    fileRef: React.RefObject<HTMLInputElement | null>;
    openEdit: (student: StudentWithFees) => void;
  };
  reload: () => void;
}

export function useStudentsOperations(options: UseStudentsOperationsOptions) {
  const {
    profile,
    selectedSchoolId,
    canEditStudents,
    canDeleteStudents,
    canManageStudentAccounts,
    activeTab,
    setActiveTab,
    locale: _locale,
    runtimeBranding: _runtimeBranding,
    modals,
    reload,
  } = options;

  const getSchoolBranch = useCallback(async () => {
    return resolveSchoolBranchForProfile(profile, { selectedSchoolId });
  }, [profile, selectedSchoolId]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    if (!canManageStudentAccounts) {
      modals.setError("ليس لديك صلاحية إنشاء طالب مع حساب التطبيق.");
      return;
    }
    e.preventDefault();
    modals.setSaving(true);
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError("يجب إضافة مدرسة وفرع أولاً");
      modals.setSaving(false);
      return;
    }
    const response = await fetchWithAuthorizedSession("/api/dashboard/users", {
      method: "POST",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        school_id,
        role: "student",
        full_name: modals.form.full_name,
        email: "",
        password: "",
        phone: modals.form.phone,
        is_active: true,
        student: {
          class_name: modals.form.class_name,
          section: modals.form.section,
          address: modals.form.address,
          total_fee: modals.form.total_fee,
          paid_fee: modals.form.paid_fee,
          discount_value: modals.form.discount_value,
        },
        teacher: null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      modals.setError(payload?.error?.message || "تعذر إنشاء الطالب مع حساب التطبيق.");
    } else {
      modals.setSuccess("تم إضافة الطالب وإنشاء حساب التطبيق ✓");
      modals.setShowModal(false);
      modals.setAddStep(1);
      modals.setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
      modals.setForm(DEFAULT_STUDENT_FORM);
      reload();
      setTimeout(() => modals.setSuccess(""), 4000);
    }
    modals.setSaving(false);
  }, [canManageStudentAccounts, getSchoolBranch, modals, reload]);

  const handleEdit = useCallback(async (e: React.FormEvent) => {
    if (!canEditStudents) {
      modals.setError("ليس لديك صلاحية لتعديل بيانات الطلاب");
      return;
    }
    e.preventDefault();
    if (!modals.selectedStudent) return;
    modals.setSaving(true);
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError("يجب تحديد مدرسة قبل تعديل الطالب");
      modals.setSaving(false);
      return;
    }
    const { error } = await supabase.from("students").update({
      full_name: modals.editForm.full_name,
      class_name: modals.editForm.class_name,
      section: modals.editForm.section || "",
      phone: modals.editForm.phone || null,
      address: modals.editForm.address || null,
      total_fee: parseInt(modals.editForm.total_fee) || 0,
      paid_fee: parseInt(modals.editForm.paid_fee) || 0,
      discount_value: parseInt(modals.editForm.discount_value) || 0,
      status: modals.editForm.status,
    }).eq("id", modals.selectedStudent.id);
    if (error) {
      modals.setError("خطأ: " + error.message);
    } else {
      try {
        await fetchWithAuthorizedSession(
          `/api/dashboard/students/${modals.selectedStudent.id}/sync-teachers`,
          {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              school_id,
              class_name: modals.editForm.class_name,
              section: modals.editForm.section || "",
            }),
          }
        );
      } catch { /* keep update successful even if sync fails */ }
      modals.setSuccess("تم تحديث البيانات وربط الطالب تلقائياً بالأساتذة حسب الصف والشعبة ✓");
      modals.setShowEdit(false);
      reload();
      setTimeout(() => modals.setSuccess(""), 3000);
    }
    modals.setSaving(false);
  }, [canEditStudents, getSchoolBranch, modals, reload]);

  const changeStatus = useCallback(async (student: StudentWithFees, status: StudentStatus, msg: string) => {
    if (!canEditStudents) {
      modals.setError("ليس لديك صلاحية تعديل حالة الطالب");
      return;
    }
    modals.setError("");
    const { error } = await supabase.from("students").update({ status }).eq("id", student.id);
    if (error) {
      modals.setError("خطأ: " + error.message);
      return;
    }
    if (status === "active" || status === "transferred" || status === "suspended") {
      setActiveTab(status);
    }
    modals.setSuccess(msg);
    reload();
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canEditStudents, modals, reload, setActiveTab]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!canDeleteStudents || !modals.selectedStudent) return;
    modals.setError("");
    const { error } = await supabase.from("students").update({ status: "deleted" }).eq("id", modals.selectedStudent.id);
    if (error) {
      modals.setError("خطأ: " + error.message);
      return;
    }
    modals.setShowDeleteConfirm(false);
    modals.setSelectedStudent(null);
    setActiveTab("deleted");
    modals.setSuccess("تم نقل الطالب للمحذوفين");
    reload();
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canDeleteStudents, modals, reload, setActiveTab]);

  const exportExcel = useCallback(async (data: StudentWithFees[]) => {
    const XLSX = await loadXLSX();
    const rows = data.map((s) => ({
      "الاسم": s.full_name,
      "الصف": s.class_name,
      "الشعبة": s.section || "",
      "العنوان": s.address || "",
      "الهاتف": s.phone || "",
      "إجمالي الرسوم": s.total_fee,
      "المدفوع": s.paid_fee,
      "المتبقي": s.remaining_fee,
      "الحالة": STATUS_MAP[s.status]?.label || s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    await XLSX.writeFile(wb, `طلاب_${activeTab}_${formatDate(new Date())}.xlsx`);
  }, [activeTab]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    modals.setImportError("");
    modals.setImportPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;
    const fileValidationError = validateStudentImportFile(file);
    if (fileValidationError) {
      modals.setImportError(fileValidationError);
      e.target.value = "";
      return;
    }
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
      if (!data.length) {
        modals.setImportError("الملف فارغ");
        return;
      }
      if (!Object.keys(data[0]).includes("اسم الطالب")) {
        modals.setImportError("عمود 'اسم الطالب' مطلوب");
        return;
      }
      modals.setImportPreview(data.slice(0, 5));
    } catch {
      modals.setImportError("خطأ في قراءة الملف");
    }
  }, [modals]);

  const handleImport = useCallback(async () => {
    if (!canManageStudentAccounts) {
      modals.setImportError("ليس لديك صلاحية استيراد الطلاب مع حسابات الدخول");
      return;
    }
    const file = modals.fileRef.current?.files?.[0];
    if (!file) return;
    modals.setImporting(true);
    const { school_id, branch_id } = await getSchoolBranch();
    if (!school_id || !branch_id) {
      modals.setImportError("يجب إضافة مدرسة وفرع أولاً");
      modals.setImporting(false);
      return;
    }
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
      const rows = data.map((r: any) => ({
        school_id,
        branch_id,
        full_name: r["اسم الطالب"] || "",
        class_name: r["الصف"] || "",
        section: r["الشعبة"] || "",
        phone: r["الهاتف"]?.toString() || null,
        address: r["العنوان"] || null,
        total_fee: parseInt(r["إجمالي الرسوم"]) || 0,
        paid_fee: parseInt(r["المدفوع"]) || 0,
        discount_value: parseInt(r["التخفيض"]) || 0,
        status: "active",
      })).filter((r) => r.full_name && r.class_name);

      let successCount = 0;
      const failures: string[] = [];
      for (const row of rows) {
        const response = await fetchWithAuthorizedSession("/api/dashboard/users", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id,
            role: "student",
            full_name: row.full_name,
            email: "",
            password: "",
            phone: row.phone,
            is_active: true,
            student: {
              class_name: row.class_name,
              section: row.section,
              address: row.address,
              total_fee: row.total_fee,
              paid_fee: row.paid_fee,
              discount_value: row.discount_value,
            },
            teacher: null,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          failures.push(payload?.error?.message || `تعذر استيراد الطالب ${row.full_name}`);
        } else {
          successCount += 1;
        }
      }
      if (failures.length > 0 && successCount === 0) {
        modals.setImportError(failures[0]);
      } else {
        modals.setSuccess(
          failures.length > 0
            ? `تم استيراد ${successCount} طالب مع إنشاء حسابات الدخول، وتعذر استيراد ${failures.length} سجل.`
            : `تم استيراد ${successCount} طالب مع إنشاء حسابات الدخول ✓`
        );
        modals.setShowImport(false);
        modals.setImportPreview([]);
        if (modals.fileRef.current) modals.fileRef.current.value = "";
        reload();
        setTimeout(() => modals.setSuccess(""), 4000);
      }
    } catch {
      modals.setImportError("تعذر معالجة ملف الاستيراد");
    } finally {
      modals.setImporting(false);
    }
  }, [canManageStudentAccounts, getSchoolBranch, modals, reload]);

  const downloadTemplate = useCallback(async () => {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.aoa_to_sheet([
      ["اسم الطالب", "الصف", "العنوان", "الهاتف", "إجمالي الرسوم", "المدفوع"],
      ["أحمد محمد علي", "الصف الخامس - أ", "بغداد", "07701234567", "500000", "0"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    await XLSX.writeFile(wb, "نموذج_الطلاب.xlsx");
  }, []);

  const openStudentCredentialsCard = useCallback(async (student: StudentWithFees) => {
    if (!canManageStudentAccounts) {
      modals.setError("إدارة بطاقات الدخول متاحة للإدارة فقط.");
      return;
    }
    modals.setError("");
    modals.setRevealedPassword(null);
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError("يجب تحديد مدرسة قبل عرض بطاقة الدخول.");
      return;
    }
    try {
      if (!student.auth_user_id) {
        const ensureResponse = await fetchWithAuthorizedSession(
          `/api/dashboard/students/${student.id}/ensure-account`,
          { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id }) }
        );
        const ensurePayload = await ensureResponse.json().catch(() => null);
        if (!ensureResponse.ok || !ensurePayload?.accountCard) {
          throw new Error(readApiError(ensurePayload, `تعذر إنشاء حساب التطبيق للطالب ${student.full_name}.`));
        }
        modals.setAccountCard(ensurePayload.accountCard);
        // New accounts get a revealed password from the ensure-account endpoint
        modals.setRevealedPassword((ensurePayload?.temporary_password as string | null) ?? null);
        modals.setSuccess("تم إنشاء حساب التطبيق لهذا الطالب وتجهيز بطاقة الدخول فوراً.");
      } else {
        const cardResponse = await fetchWithAuthorizedSession(
          `/api/dashboard/users/${student.auth_user_id}/card?schoolId=${encodeURIComponent(school_id)}`,
          { cache: "no-store" }
        );
        const cardPayload = await cardResponse.json().catch(() => null);
        if (cardResponse.ok && cardPayload?.accountCard) {
          modals.setAccountCard(cardPayload.accountCard);
          modals.setSuccess("تم فتح بطاقة الدخول بنجاح.");
        } else {
          const resetResponse = await fetchWithAuthorizedSession(
            `/api/dashboard/users/${student.auth_user_id}/reset-password`,
            { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id }) }
          );
          const resetPayload = await resetResponse.json().catch(() => null);
          if (!resetResponse.ok || !resetPayload?.accountCard) {
            throw new Error(readApiError(resetPayload, `تعذر إنشاء بطاقة دخول للطالب ${student.full_name}.`));
          }
          modals.setAccountCard(resetPayload.accountCard);
          // Store the revealed password from the reset response (one-time reveal)
          modals.setRevealedPassword((resetPayload?.temporary_password as string | null) ?? null);
        }
      }
      void reload();
      setTimeout(() => modals.setSuccess(""), 3000);
    } catch (err) {
      modals.setError(err instanceof Error ? err.message : "تعذر فتح بطاقة الدخول.");
    }
  }, [canManageStudentAccounts, getSchoolBranch, modals, reload]);

  return {
    handleAdd,
    handleEdit,
    changeStatus,
    handleDeleteConfirmed,
    exportExcel,
    handleFileChange,
    handleImport,
    downloadTemplate,
    openStudentCredentialsCard,
    getSchoolBranch,
  };
}
