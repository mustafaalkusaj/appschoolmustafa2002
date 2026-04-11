"use client";

import { useCallback, useMemo } from "react";
import type { StudentWithFees, StudentStatus, ManagedUserAccountCard, StudentFormData } from "../_types";
import { STATUS_MAP, DEFAULT_STUDENT_FORM } from "../_constants";
import { formatDate } from "@/lib/formatting";
import { loadXLSX } from "@/lib/xlsx-loader";
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

const IMPORT_COLUMN_ALIASES = {
  fullName: ["اسم الطالب", "Student name", "Name"],
  className: ["الصف", "Class"],
  section: ["الشعبة", "Section"],
  phone: ["الهاتف", "Phone"],
  address: ["العنوان", "Address"],
  totalFee: ["إجمالي الرسوم", "Total fees"],
  paidFee: ["المدفوع", "Paid"],
  discountValue: ["التخفيض", "Discount"],
} as const;

function getImportCell(
  row: Record<string, string | number | null | undefined>,
  keys: readonly string[],
) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function parseFormNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
    locale,
    runtimeBranding: _runtimeBranding,
    modals,
    reload,
  } = options;
  const isEnglish = locale === "en";
  const copy = useMemo(() => ({
    noCreatePermission: isEnglish ? "You do not have permission to create a student app account." : "ليس لديك صلاحية إنشاء طالب مع حساب التطبيق.",
    addSchoolBranchFirst: isEnglish ? "Create a school and branch first." : "يجب إضافة مدرسة وفرع أولاً",
    createFailed: isEnglish ? "Could not create the student app account." : "تعذر إنشاء الطالب مع حساب التطبيق.",
    createdSuccess: isEnglish ? "Student added and app account created successfully." : "تم إضافة الطالب وإنشاء حساب التطبيق ✓",
    noEditPermission: isEnglish ? "You do not have permission to edit student records." : "ليس لديك صلاحية لتعديل بيانات الطلاب",
    selectSchoolBeforeEdit: isEnglish ? "Select a school before editing the student." : "يجب تحديد مدرسة قبل تعديل الطالب",
    updateSuccess: isEnglish ? "Student record updated and teacher links synced successfully." : "تم تحديث البيانات وربط الطالب تلقائياً بالأساتذة حسب الصف والشعبة ✓",
    noStatusPermission: isEnglish ? "You do not have permission to change the student status." : "ليس لديك صلاحية تعديل حالة الطالب",
    deleteSuccess: isEnglish ? "Student moved to deleted records." : "تم نقل الطالب للمحذوفين",
    genericError: (message: string) => isEnglish ? `Error: ${message}` : `خطأ: ${message}`,
    exportSheet: isEnglish ? "Students" : "الطلاب",
    exportFile: isEnglish ? `students_${activeTab}_${formatDate(new Date())}.xlsx` : `طلاب_${activeTab}_${formatDate(new Date())}.xlsx`,
    exportColumns: isEnglish
      ? {
          name: "Name",
          className: "Class",
          section: "Section",
          address: "Address",
          phone: "Phone",
          totalFees: "Total fees",
          paid: "Paid",
          remaining: "Remaining",
          status: "Status",
        }
      : {
          name: "الاسم",
          className: "الصف",
          section: "الشعبة",
          address: "العنوان",
          phone: "الهاتف",
          totalFees: "إجمالي الرسوم",
          paid: "المدفوع",
          remaining: "المتبقي",
          status: "الحالة",
        },
    statusLabels: isEnglish
      ? {
          active: "Active",
          transferred: "Transferred",
          suspended: "Suspended",
          graduated: "Graduated",
          withdrawn: "Withdrawn",
          archived: "Archived",
          deleted: "Deleted",
        }
      : {
          active: STATUS_MAP.active.label,
          transferred: STATUS_MAP.transferred.label,
          suspended: STATUS_MAP.suspended.label,
          graduated: STATUS_MAP.graduated.label,
          withdrawn: STATUS_MAP.withdrawn.label,
          archived: STATUS_MAP.archived.label,
          deleted: STATUS_MAP.deleted.label,
        },
    emptyFile: isEnglish ? "The file is empty." : "الملف فارغ",
    nameColumnRequired: isEnglish ? "The 'Student name' column is required." : "عمود 'اسم الطالب' مطلوب",
    readFileError: isEnglish ? "Could not read the file." : "خطأ في قراءة الملف",
    importNoPermission: isEnglish ? "You do not have permission to import students with app accounts." : "ليس لديك صلاحية استيراد الطلاب مع حسابات الدخول",
    importFailedStudent: (name: string) => isEnglish ? `Could not import student ${name}.` : `تعذر استيراد الطالب ${name}`,
    importPartialSuccess: (count: number, failures: number) =>
      isEnglish
        ? `${count} students imported, with ${failures} failed records.`
        : `تم استيراد ${count} طالب مع إنشاء حسابات الدخول، وتعذر استيراد ${failures} سجل.`,
    importSuccess: (count: number) =>
      isEnglish ? `${count} students imported successfully.` : `تم استيراد ${count} طالب مع إنشاء حسابات الدخول ✓`,
    importProcessError: isEnglish ? "Could not process the import file." : "تعذر معالجة ملف الاستيراد",
    templateHeaders: isEnglish
      ? ["Student name", "Class", "Address", "Phone", "Total fees", "Paid"]
      : ["اسم الطالب", "الصف", "العنوان", "الهاتف", "إجمالي الرسوم", "المدفوع"],
    templateSample: isEnglish
      ? ["Sample Student", "Grade 5 - A", "Baghdad", "07701234567", "500000", "0"]
      : ["أحمد محمد علي", "الصف الخامس - أ", "بغداد", "07701234567", "500000", "0"],
    templateFile: isEnglish ? "students_template.xlsx" : "نموذج_الطلاب.xlsx",
    adminOnlyCards: isEnglish ? "Credential cards are available to administrators only." : "إدارة بطاقات الدخول متاحة للإدارة فقط.",
    selectSchoolBeforeCard: isEnglish ? "Select a school before opening the account card." : "يجب تحديد مدرسة قبل عرض بطاقة الدخول.",
    ensureAccountError: (name: string) =>
      isEnglish ? `Could not create an app account for ${name}.` : `تعذر إنشاء حساب التطبيق للطالب ${name}.`,
    ensureAccountSuccess: isEnglish ? "Student app account created and credential card prepared." : "تم إنشاء حساب التطبيق لهذا الطالب وتجهيز بطاقة الدخول فوراً.",
    openCardSuccess: isEnglish ? "Credential card opened successfully." : "تم فتح بطاقة الدخول بنجاح.",
    resetCardError: (name: string) =>
      isEnglish ? `Could not create a credential card for ${name}.` : `تعذر إنشاء بطاقة دخول للطالب ${name}.`,
    openCardError: isEnglish ? "Could not open the credential card." : "تعذر فتح بطاقة الدخول.",
  }), [activeTab, isEnglish]);

  const getSchoolBranch = useCallback(async () => {
    return resolveSchoolBranchForProfile(profile, { selectedSchoolId });
  }, [profile, selectedSchoolId]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    if (!canManageStudentAccounts) {
      modals.setError(copy.noCreatePermission);
      return;
    }
    e.preventDefault();
    modals.setSaving(true);
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.addSchoolBranchFirst);
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
      modals.setError(payload?.error?.message || copy.createFailed);
    } else {
      modals.setSuccess(copy.createdSuccess);
      modals.setShowModal(false);
      modals.setAddStep(1);
      modals.setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
      modals.setForm(DEFAULT_STUDENT_FORM);
      reload();
      setTimeout(() => modals.setSuccess(""), 4000);
    }
    modals.setSaving(false);
  }, [canManageStudentAccounts, copy.addSchoolBranchFirst, copy.createFailed, copy.createdSuccess, copy.noCreatePermission, getSchoolBranch, modals, reload]);

  const handleEdit = useCallback(async (e: React.FormEvent) => {
    if (!canEditStudents) {
      modals.setError(copy.noEditPermission);
      return;
    }
    e.preventDefault();
    if (!modals.selectedStudent) return;
    modals.setSaving(true);
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeEdit);
      modals.setSaving(false);
      return;
    }

    const response = await fetchWithAuthorizedSession(`/api/web/students/${modals.selectedStudent.id}`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        school_id,
        full_name: modals.editForm.full_name,
        class_name: modals.editForm.class_name,
        section: modals.editForm.section || "",
        phone: modals.editForm.phone || null,
        address: modals.editForm.address || null,
        total_fee: parseFormNumber(modals.editForm.total_fee),
        paid_fee: parseFormNumber(modals.editForm.paid_fee),
        discount_value: parseFormNumber(modals.editForm.discount_value),
        status: modals.editForm.status,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      modals.setError(readApiError(payload, copy.genericError(isEnglish ? "Could not update the student." : "تعذر تحديث بيانات الطالب.")));
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
      modals.setSuccess(copy.updateSuccess);
      modals.setShowEdit(false);
      reload();
      setTimeout(() => modals.setSuccess(""), 3000);
    }
    modals.setSaving(false);
  }, [canEditStudents, copy, getSchoolBranch, isEnglish, modals, reload]);

  const changeStatus = useCallback(async (student: StudentWithFees, status: StudentStatus, msg: string) => {
    if (!canEditStudents) {
      modals.setError(copy.noStatusPermission);
      return;
    }
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeEdit);
      return;
    }
    const response = await fetchWithAuthorizedSession(`/api/web/students/${student.id}`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id, status }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      modals.setError(readApiError(payload, copy.genericError(isEnglish ? "Could not update the student status." : "تعذر تحديث حالة الطالب.")));
      return;
    }
    if (status === "active" || status === "transferred" || status === "suspended") {
      setActiveTab(status);
    }
    modals.setSuccess(msg);
    reload();
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canEditStudents, copy, getSchoolBranch, isEnglish, modals, reload, setActiveTab]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!canDeleteStudents || !modals.selectedStudent) return;
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeEdit);
      return;
    }
    const response = await fetchWithAuthorizedSession(`/api/web/students/${modals.selectedStudent.id}`, {
      method: "DELETE",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      modals.setError(readApiError(payload, copy.genericError(isEnglish ? "Could not delete the student." : "تعذر حذف الطالب.")));
      return;
    }
    modals.setShowDeleteConfirm(false);
    modals.setSelectedStudent(null);
    setActiveTab("deleted");
    modals.setSuccess(copy.deleteSuccess);
    reload();
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canDeleteStudents, copy, getSchoolBranch, isEnglish, modals, reload, setActiveTab]);

  const exportExcel = useCallback(async (data: StudentWithFees[]) => {
    const XLSX = await loadXLSX();
    const rows = data.map((s) => ({
      [copy.exportColumns.name]: s.full_name,
      [copy.exportColumns.className]: s.class_name,
      [copy.exportColumns.section]: s.section || "",
      [copy.exportColumns.address]: s.address || "",
      [copy.exportColumns.phone]: s.phone || "",
      [copy.exportColumns.totalFees]: s.total_fee,
      [copy.exportColumns.paid]: s.paid_fee,
      [copy.exportColumns.remaining]: s.remaining_fee,
      [copy.exportColumns.status]: copy.statusLabels[s.status],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, copy.exportSheet);
    await XLSX.writeFile(wb, copy.exportFile);
  }, [copy]);

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
        modals.setImportError(copy.emptyFile);
        return;
      }
      const hasNameColumn = IMPORT_COLUMN_ALIASES.fullName.some((key) => Object.keys(data[0]).includes(key));
      if (!hasNameColumn) {
        modals.setImportError(copy.nameColumnRequired);
        return;
      }
      modals.setImportPreview(data.slice(0, 5));
    } catch {
      modals.setImportError(copy.readFileError);
    }
  }, [copy.emptyFile, copy.nameColumnRequired, copy.readFileError, modals]);

  const handleImport = useCallback(async () => {
    if (!canManageStudentAccounts) {
      modals.setImportError(copy.importNoPermission);
      return;
    }
    const file = modals.fileRef.current?.files?.[0];
    if (!file) return;
    modals.setImporting(true);
    const { school_id, branch_id } = await getSchoolBranch();
    if (!school_id || !branch_id) {
      modals.setImportError(copy.addSchoolBranchFirst);
      modals.setImporting(false);
      return;
    }
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);
      const rows = data.map((row) => {
        const source = row as Record<string, string | number | null | undefined>;
        return ({
        school_id,
        branch_id,
        full_name: String(getImportCell(source, IMPORT_COLUMN_ALIASES.fullName) || ""),
        class_name: String(getImportCell(source, IMPORT_COLUMN_ALIASES.className) || ""),
        section: String(getImportCell(source, IMPORT_COLUMN_ALIASES.section) || ""),
        phone: getImportCell(source, IMPORT_COLUMN_ALIASES.phone) != null ? String(getImportCell(source, IMPORT_COLUMN_ALIASES.phone)) : null,
        address: typeof getImportCell(source, IMPORT_COLUMN_ALIASES.address) === "string" ? String(getImportCell(source, IMPORT_COLUMN_ALIASES.address)) : null,
        total_fee: parseInt(String(getImportCell(source, IMPORT_COLUMN_ALIASES.totalFee) || 0), 10) || 0,
        paid_fee: parseInt(String(getImportCell(source, IMPORT_COLUMN_ALIASES.paidFee) || 0), 10) || 0,
        discount_value: parseInt(String(getImportCell(source, IMPORT_COLUMN_ALIASES.discountValue) || 0), 10) || 0,
        status: "active",
      })}).filter((r) => r.full_name && r.class_name);

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
          failures.push(payload?.error?.message || copy.importFailedStudent(row.full_name));
        } else {
          successCount += 1;
        }
      }
      if (failures.length > 0 && successCount === 0) {
        modals.setImportError(failures[0]);
      } else {
        modals.setSuccess(
          failures.length > 0
            ? copy.importPartialSuccess(successCount, failures.length)
            : copy.importSuccess(successCount)
        );
        modals.setShowImport(false);
        modals.setImportPreview([]);
        if (modals.fileRef.current) modals.fileRef.current.value = "";
        reload();
        setTimeout(() => modals.setSuccess(""), 4000);
      }
    } catch {
      modals.setImportError(copy.importProcessError);
    } finally {
      modals.setImporting(false);
    }
  }, [canManageStudentAccounts, copy, getSchoolBranch, modals, reload]);

  const downloadTemplate = useCallback(async () => {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.aoa_to_sheet([
      copy.templateHeaders,
      copy.templateSample,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, copy.exportSheet);
    await XLSX.writeFile(wb, copy.templateFile);
  }, [copy]);

  const openStudentCredentialsCard = useCallback(async (student: StudentWithFees) => {
    if (!canManageStudentAccounts) {
      modals.setError(copy.adminOnlyCards);
      return;
    }
    modals.setError("");
    modals.setRevealedPassword(null);
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeCard);
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
          throw new Error(readApiError(ensurePayload, copy.ensureAccountError(student.full_name)));
        }
        modals.setAccountCard(ensurePayload.accountCard);
        // New accounts get a revealed password from the ensure-account endpoint
        modals.setRevealedPassword((ensurePayload?.temporary_password as string | null) ?? null);
        modals.setSuccess(copy.ensureAccountSuccess);
      } else {
        const cardResponse = await fetchWithAuthorizedSession(
          `/api/dashboard/users/${student.auth_user_id}/card?schoolId=${encodeURIComponent(school_id)}`,
          { cache: "no-store" }
        );
        const cardPayload = await cardResponse.json().catch(() => null);
        if (cardResponse.ok && cardPayload?.accountCard) {
          modals.setAccountCard(cardPayload.accountCard);
          modals.setSuccess(copy.openCardSuccess);
        } else {
          const resetResponse = await fetchWithAuthorizedSession(
            `/api/dashboard/users/${student.auth_user_id}/reset-password`,
            { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id }) }
          );
          const resetPayload = await resetResponse.json().catch(() => null);
          if (!resetResponse.ok || !resetPayload?.accountCard) {
            throw new Error(readApiError(resetPayload, copy.resetCardError(student.full_name)));
          }
          modals.setAccountCard(resetPayload.accountCard);
          // Store the revealed password from the reset response (one-time reveal)
          modals.setRevealedPassword((resetPayload?.temporary_password as string | null) ?? null);
        }
      }
      void reload();
      setTimeout(() => modals.setSuccess(""), 3000);
    } catch (err) {
      modals.setError(err instanceof Error ? err.message : copy.openCardError);
    }
  }, [canManageStudentAccounts, copy, getSchoolBranch, modals, reload]);

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
