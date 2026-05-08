"use client";

import { useCallback, useMemo } from "react";
import type { StudentWithFees, StudentStatus, ManagedUserAccountCard, StudentFormData, ClassFee } from "../_types";
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
  classFees: ClassFee[];
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
  currentBranchId: string | null;
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
    setShowTransferConfirm: (show: boolean) => void;
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
  backgroundReload: () => Promise<void>;
  addStudentOptimistically: (student: StudentWithFees) => void;
  updateStudentOptimistically: (id: string, update: Partial<StudentWithFees>) => void;
  removeStudentOptimistically: (id: string) => void;
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
    classFees,
    canEditStudents,
    canDeleteStudents,
    canManageStudentAccounts,
    activeTab,
    setActiveTab,
    locale,
    runtimeBranding: _runtimeBranding,
    currentBranchId: activeBranchIdFromUI,
    modals,
    reload,
    backgroundReload,
    addStudentOptimistically,
    updateStudentOptimistically,
    removeStudentOptimistically,
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
    importDuplicateValidationError: isEnglish
      ? "Could not validate duplicate student names before import."
      : "تعذر فحص تكرار أسماء الطلاب قبل الاستيراد.",
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
    openCardSuccess: isEnglish
      ? "A new temporary password was issued and the credential card is ready to print."
      : "تم إصدار كلمة مرور مؤقتة جديدة وتجهيز بطاقة الدخول للطباعة.",
    resetCardError: (name: string) =>
      isEnglish ? `Could not create a credential card for ${name}.` : `تعذر إنشاء بطاقة دخول للطالب ${name}.`,
    openCardError: isEnglish ? "Could not open the credential card." : "تعذر فتح بطاقة الدخول.",
  }), [activeTab, isEnglish]);

  const classFeeByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const fee of classFees) {
      const key = String(fee.class_name || "").trim();
      if (!key) continue;
      map.set(key, Number(fee.total_fee ?? 0));
    }
    return map;
  }, [classFees]);

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

    // Resolve branch: form selection > UI context (sidebar/header) > profile fixed branch
    const resolvedBranchId = modals.form.branch_id || activeBranchIdFromUI || profile?.branch_id || null;
    if (!resolvedBranchId) {
      const errorMsg = locale === "en"
        ? "Could not determine the current branch. Please select a branch before adding a student."
        : "تعذر تحديد الفرع. يرجى اختيار الفرع قبل إضافة الطالب.";
      modals.setError(errorMsg);
      modals.setSaving(false);
      return;
    }

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
          branch_id: resolvedBranchId,
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
      const newStudentId = (payload as { user?: { student_id?: string; id?: string } } | null)?.user?.student_id
        ?? (payload as { user?: { student_id?: string; id?: string } } | null)?.user?.id
        ?? crypto.randomUUID();
      const totalFee = parseFormNumber(modals.form.total_fee);
      const paidFee = parseFormNumber(modals.form.paid_fee);
      const discountValue = parseFormNumber(modals.form.discount_value);
      addStudentOptimistically({
        id: newStudentId,
        school_id: school_id,
        branch_id: resolvedBranchId ?? undefined,
        full_name: modals.form.full_name,
        phone: modals.form.phone || null,
        class_name: modals.form.class_name,
        section: modals.form.section || null,
        address: modals.form.address || null,
        total_fee: totalFee,
        paid_fee: paidFee,
        discount_value: discountValue,
        remaining_fee: totalFee - paidFee,
        status: "active",
        auth_user_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
      } as StudentWithFees);
      void backgroundReload();
      setTimeout(() => modals.setSuccess(""), 4000);
    }
    modals.setSaving(false);
  }, [canManageStudentAccounts, copy.addSchoolBranchFirst, copy.createFailed, copy.createdSuccess, copy.noCreatePermission, getSchoolBranch, modals, backgroundReload, addStudentOptimistically, profile, locale, activeBranchIdFromUI]);

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
      const editedId = modals.selectedStudent.id;
      const totalFee = parseFormNumber(modals.editForm.total_fee);
      const paidFee = parseFormNumber(modals.editForm.paid_fee);
      const discountValue = parseFormNumber(modals.editForm.discount_value);
      updateStudentOptimistically(editedId, {
        full_name: modals.editForm.full_name,
        phone: modals.editForm.phone || null,
        class_name: modals.editForm.class_name,
        section: modals.editForm.section || null,
        address: modals.editForm.address || null,
        total_fee: totalFee,
        paid_fee: paidFee,
        discount_value: discountValue,
        remaining_fee: totalFee - paidFee,
        status: modals.editForm.status,
        updated_at: new Date().toISOString(),
      });
      setTimeout(() => modals.setSuccess(""), 3000);
    }
    modals.setSaving(false);
  }, [canEditStudents, copy, getSchoolBranch, isEnglish, modals, updateStudentOptimistically]);

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
    removeStudentOptimistically(student.id);
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canEditStudents, copy, getSchoolBranch, isEnglish, modals, removeStudentOptimistically, setActiveTab]);

  const initTransfer = useCallback((student: StudentWithFees) => {
    modals.setSelectedStudent(student);
    modals.setShowTransferConfirm(true);
  }, [modals]);

  const confirmTransfer = useCallback(async (transferType: "class" | "section" | "transferred", targetClass?: string, targetSection?: string) => {
    if (!modals.selectedStudent) return;
    modals.setSaving(true);
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeEdit);
      modals.setSaving(false);
      return;
    }

    const payload: Record<string, unknown> = { school_id, transfer_type: transferType };
    if (targetClass) payload.target_class_name = targetClass;
    if (targetSection) payload.target_section = targetSection;

    const response = await fetchWithAuthorizedSession(`/api/web/students/${modals.selectedStudent.id}`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify(payload),
    });
    const respPayload = await response.json().catch(() => null);
    modals.setSaving(false);

    if (!response.ok) {
      modals.setError(readApiError(respPayload, isEnglish ? "Failed to transfer student." : "تعذر نقل الطالب."));
      return;
    }

    modals.setShowTransferConfirm(false);
    const messages: Record<string, string> = {
      class: isEnglish ? "Student class transferred successfully." : "تم نقل الطالب إلى صف جديد ✓",
      section: isEnglish ? "Student section transferred successfully." : "تم نقل الطالب إلى شعبة جديدة ✓",
      transferred: isEnglish ? "Student moved to transferred records." : "تم نقل الطالب إلى المنقولين ✓",
    };
    modals.setSuccess(messages[transferType]);

    if (transferType === "transferred") {
      setActiveTab("transferred");
    }

    removeStudentOptimistically(modals.selectedStudent?.id ?? "");
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [modals, copy, getSchoolBranch, isEnglish, removeStudentOptimistically, setActiveTab]);

  const initSuspend = useCallback((student: StudentWithFees) => {
    modals.setSelectedStudent(student);
    // Handle only suspension here; restores/reactivation use a dedicated handler.
    let newStatus: StudentStatus;
    let nextTab: string;
    let successMsg: string;

    const currentStatus = student.status;

    if (currentStatus === "active") {
      // Suspend active student
      newStatus = "suspended";
      nextTab = "suspended";
      successMsg = isEnglish ? "Student suspended successfully." : "تم توقيف الطالب ✓";
    } else if (currentStatus === "suspended") {
      // Reactivate suspended student
      newStatus = "active";
      nextTab = "active";
      successMsg = isEnglish ? "Student reactivated successfully." : "تم تفعيل الطالب ✓";
    } else if (currentStatus === "transferred") {
      // Restore student from transferred
      newStatus = "active";
      nextTab = "active";
      successMsg = isEnglish ? "Student restored successfully." : "تم استعادة الطالب ✓";
    } else if (currentStatus === "deleted") {
      // Restore student from deleted
      newStatus = "active";
      nextTab = "active";
      successMsg = isEnglish ? "Student restored successfully." : "تم استعادة الطالب ✓";
    } else {
      // Unknown status - default to active
      newStatus = "active";
      nextTab = "active";
      successMsg = isEnglish ? "Student status updated." : "تم تحديث حالة الطالب.";
    }

    void (async () => {
      modals.setSaving(true);
      const { school_id } = await getSchoolBranch();
      if (!school_id) {
        modals.setError(copy.selectSchoolBeforeEdit);
        modals.setSaving(false);
        return;
      }
      const response = await fetchWithAuthorizedSession(`/api/web/students/${student.id}`, {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id, status: newStatus }),
      });
      const payload = await response.json().catch(() => null);
      modals.setSaving(false);

      if (!response.ok) {
        modals.setError(readApiError(payload, isEnglish ? "Could not update student status." : "تعذر تحديث حالة الطالب."));
        return;
      }

      setActiveTab(nextTab);
      modals.setSuccess(successMsg);
      removeStudentOptimistically(student.id);
      setTimeout(() => modals.setSuccess(""), 3000);
    })();
  }, [modals, copy, getSchoolBranch, isEnglish, removeStudentOptimistically, setActiveTab]);

  const initRestore = useCallback((student: StudentWithFees) => {
    modals.setSelectedStudent(student);

    void (async () => {
      modals.setSaving(true);
      modals.setError("");
      const { school_id } = await getSchoolBranch();
      if (!school_id) {
        modals.setError(copy.selectSchoolBeforeEdit);
        modals.setSaving(false);
        return;
      }

      const response = await fetchWithAuthorizedSession(`/api/web/students/${student.id}`, {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id, status: "active" satisfies StudentStatus }),
      });
      const payload = await response.json().catch(() => null);
      modals.setSaving(false);

      if (!response.ok) {
        modals.setError(readApiError(payload, isEnglish ? "Could not restore the student." : "تعذر استعادة الطالب."));
        return;
      }

      setActiveTab("active");
      modals.setSuccess(isEnglish ? "Student restored successfully." : "تم استعادة الطالب ✓");
      removeStudentOptimistically(student.id);
      setTimeout(() => modals.setSuccess(""), 3000);
    })();
  }, [copy.selectSchoolBeforeEdit, getSchoolBranch, isEnglish, modals, removeStudentOptimistically, setActiveTab]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!canDeleteStudents || !modals.selectedStudent) return;
    modals.setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      modals.setError(copy.selectSchoolBeforeEdit);
      return;
    }
    const forceDelete = modals.selectedStudent.status === "deleted";
    const response = await fetchWithAuthorizedSession(`/api/web/students/${modals.selectedStudent.id}`, {
      method: "DELETE",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id, force_delete: forceDelete }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      modals.setError(readApiError(payload, copy.genericError(isEnglish ? "Could not delete the student." : "تعذر حذف الطالب.")));
      return;
    }
    const deletedId = modals.selectedStudent.id;
    modals.setShowDeleteConfirm(false);
    modals.setSelectedStudent(null);
    setActiveTab("deleted");
    modals.setSuccess(copy.deleteSuccess);
    removeStudentOptimistically(deletedId);
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [canDeleteStudents, copy, getSchoolBranch, isEnglish, modals, removeStudentOptimistically, setActiveTab]);

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
        const className = String(getImportCell(source, IMPORT_COLUMN_ALIASES.className) || "");
        const importedTotalFee = Math.max(0, Number(getImportCell(source, IMPORT_COLUMN_ALIASES.totalFee) || 0));
        const classFee = classFeeByName.get(className.trim()) ?? 0;
        return ({
        school_id,
        branch_id,
        full_name: String(getImportCell(source, IMPORT_COLUMN_ALIASES.fullName) || ""),
        class_name: className,
        section: String(getImportCell(source, IMPORT_COLUMN_ALIASES.section) || ""),
        phone: getImportCell(source, IMPORT_COLUMN_ALIASES.phone) != null ? String(getImportCell(source, IMPORT_COLUMN_ALIASES.phone)) : null,
        address: typeof getImportCell(source, IMPORT_COLUMN_ALIASES.address) === "string" ? String(getImportCell(source, IMPORT_COLUMN_ALIASES.address)) : null,
        total_fee: importedTotalFee > 0 ? importedTotalFee : classFee,
        paid_fee: Math.max(0, Number(getImportCell(source, IMPORT_COLUMN_ALIASES.paidFee) || 0)),
        discount_value: Math.max(0, Number(getImportCell(source, IMPORT_COLUMN_ALIASES.discountValue) || 0)),
        status: "active",
      })}).filter((r) => r.full_name && r.class_name);

      if (rows.length === 0) {
        modals.setImportError(copy.emptyFile);
        return;
      }

      const duplicateCheckResponse = await fetchWithAuthorizedSession("/api/students/import-check", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ names: rows.map((row) => row.full_name) }),
      });
      const duplicateCheckPayload = await duplicateCheckResponse.json().catch(() => null);
      if (!duplicateCheckResponse.ok) {
        modals.setImportError(readApiError(duplicateCheckPayload, copy.importDuplicateValidationError));
        return;
      }

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
        const detail = failures.length === 1
          ? failures[0]
          : (isEnglish
              ? `${failures.length} students failed. First error: ${failures[0]}`
              : `تعذر استيراد ${failures.length} طالب. أول خطأ: ${failures[0]}`);
        modals.setImportError(detail);
      } else {
        modals.setSuccess(
          failures.length > 0
            ? copy.importPartialSuccess(successCount, failures.length)
            : copy.importSuccess(successCount)
        );
        modals.setShowImport(false);
        modals.setImportPreview([]);
        if (modals.fileRef.current) modals.fileRef.current.value = "";
        void backgroundReload();
        setTimeout(() => modals.setSuccess(""), 4000);
      }
    } catch {
      modals.setImportError(copy.importProcessError);
    } finally {
      modals.setImporting(false);
    }
  }, [canManageStudentAccounts, classFeeByName, copy, getSchoolBranch, modals, backgroundReload]);

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
        // Always issue a fresh temporary password when opening the card so the value is visible and printable.
        const resetResponse = await fetchWithAuthorizedSession(
          `/api/dashboard/users/${student.auth_user_id}/reset-password`,
          { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ school_id }) }
        );
        const resetPayload = await resetResponse.json().catch(() => null);
        if (!resetResponse.ok || !resetPayload?.accountCard) {
          throw new Error(readApiError(resetPayload, copy.resetCardError(student.full_name)));
        }
        modals.setAccountCard(resetPayload.accountCard);
        modals.setRevealedPassword((resetPayload?.temporary_password as string | null) ?? null);
        modals.setSuccess(copy.openCardSuccess);
      }
      void backgroundReload();
      setTimeout(() => modals.setSuccess(""), 3000);
    } catch (err) {
      modals.setError(err instanceof Error ? err.message : copy.openCardError);
    }
  }, [canManageStudentAccounts, copy, getSchoolBranch, modals, backgroundReload]);

  return useMemo(() => ({
    handleAdd,
    handleEdit,
    changeStatus,
    initTransfer,
    confirmTransfer,
    initSuspend,
    initRestore,
    handleDeleteConfirmed,
    exportExcel,
    handleFileChange,
    handleImport,
    downloadTemplate,
    openStudentCredentialsCard,
    getSchoolBranch,
  }), [handleAdd, handleEdit, changeStatus, initTransfer, confirmTransfer, initSuspend, initRestore, handleDeleteConfirmed, exportExcel, handleFileChange, handleImport, downloadTemplate, openStudentCredentialsCard, getSchoolBranch]);
}
