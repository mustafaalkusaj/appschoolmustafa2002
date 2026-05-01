"use client";

// Teachers page data fetching and state management hook

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { supabase } from "@/lib/supabase";
import { loadXLSX } from "@/lib/xlsx-loader";
import {
  type ManagedUserAccountCard,
  type ManagedUserRecord,
  type ManagedUserRole,
  validateCreateManagedUserInput,
  validateUpdateManagedUserInput,
} from "@/lib/managed-users";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type {
  ClassOption,
  FieldErrors,
  ImportPayload,
  RawClassOption,
  RawSectionOption,
  SectionOption,
  SubjectOption,
  TeacherAssignmentFormState,
  TeacherStatsItem,
  UserFormState,
} from "../_types";
import {
  buildClassNamesByRecordId,
  buildPayload,
  buildPrintableCardHtml,
  createEmptyForm,
  createEmptyTeacherAssignment,
  formatDateLabel,
  mapUserToForm,
  parseImportActive,
  parseImportRole,
  processClassOptions,
  processSectionOptions,
  processSubjectOptions,
  readApiError,
  readExcelColumn,
  validateTeacherImportFile,
  getSectionOptionsByClass,
} from "../_utils";
import { printHtmlDocument } from "@/lib/print/branding";

const SEARCH_DEBOUNCE_MS = 350;
const PAGE_SIZE = 25;

type UseTeachersDataResult = {
  // State
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  users: ManagedUserRecord[];
  loading: boolean;
  saving: boolean;
  togglingId: string | null;
  cardLoadingId: string | null;
  searchInput: string;
  query: string;
  statusFilter: "all" | "active" | "inactive";
  classFilter: string;
  sectionFilter: string;
  subjectFilter: string;
  page: number;
  totalCount: number;
  success: string;
  error: string;
  fieldErrors: FieldErrors;
  showCreateModal: boolean;
  editingUser: ManagedUserRecord | null;
  accountCard: ManagedUserAccountCard | null;
  revealedPassword: string | null;
  showImportModal: boolean;
  importing: boolean;
  importPreview: Array<Record<string, unknown>>;
  importPayloads: ImportPayload[];
  importErrors: string[];
  form: UserFormState;
  // Computed
  filteredUsers: ManagedUserRecord[];
  teachersOnlyUsers: ManagedUserRecord[];
  stats: TeacherStatsItem[];
  availableStudentSections: SectionOption[];
  availableTeacherSections: SectionOption[];
  sectionOptionsByClass: Map<string, SectionOption[]>;
  showingModal: boolean;
  teacherAssignment: TeacherAssignmentFormState;
  teacherSections: SectionOption[];
  // Actions
  setSearchInput: (value: string) => void;
  setStatusFilter: (value: "all" | "active" | "inactive") => void;
  setClassFilter: (value: string) => void;
  setSectionFilter: (value: string) => void;
  setSubjectFilter: (value: string) => void;
  setPage: (value: number) => void;
  setSuccess: (value: string) => void;
  setError: (value: string) => void;
  setShowCreateModal: (value: boolean) => void;
  setShowImportModal: (value: boolean) => void;
  openCreateModal: (role?: ManagedUserRole) => void;
  openEditModal: (user: ManagedUserRecord) => void;
  closeModal: () => void;
  closeAccountCard: () => void;
  closeImportModal: () => void;
  updateTeacherAssignment: (key: keyof TeacherAssignmentFormState, value: string) => void;
  updateFormField: <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => void;
  updateStudentField: <K extends keyof UserFormState['student']>(field: K, value: UserFormState['student'][K]) => void;
  resetTableFilters: () => void;
  openAccountCardForUser: (user: ManagedUserRecord) => Promise<void>;
  handleResetTemporaryPassword: (user: ManagedUserRecord) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleToggle: (user: ManagedUserRecord) => Promise<void>;
  handleDelete: (user: ManagedUserRecord) => Promise<void>;
  handleExportUsers: () => Promise<void>;
  handleImportFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportUsers: () => Promise<void>;
  downloadUsersTemplate: () => Promise<void>;
  openPrintableWindow: (card: ManagedUserAccountCard, autoPrint?: boolean) => void;
  handleCopyCredentials: () => Promise<void>;
  fetchUsers: () => Promise<void>;
};

export function useTeachersData(
  currentSchoolId: string | null,
  profile: { role: string; school_id?: string | null } | null,
  schoolScopeLoading: boolean,
): UseTeachersDataResult {
  // State
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cardLoadingId, setCardLoadingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(null);
  const [accountCard, setAccountCard] = useState<ManagedUserAccountCard | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<Record<string, unknown>>>([]);
  const [importPayloads, setImportPayloads] = useState<ImportPayload[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [form, setForm] = useState<UserFormState>(() => createEmptyForm("teacher"));

  // Refs
  const importFileRef = useRef<HTMLInputElement>(null);
  const usersQueryScopeRef = useRef<string | null>(null);

  // Computed values
  const deferredQuery = query.trim().toLowerCase();
  const normalizedClassFilter = classFilter.trim();
  const normalizedSectionFilter = sectionFilter.trim();
  const normalizedSubjectFilter = subjectFilter.trim();

  const usersQueryScopeKey = [
    currentSchoolId || "none",
    deferredQuery,
    normalizedClassFilter,
    normalizedSectionFilter,
    normalizedSubjectFilter,
    statusFilter,
  ].join("::");

  // Page reset on scope change is handled by useEffect below, so just use page directly
  const effectivePage = page;

  const teachersOnlyUsers = useMemo(() => users.filter((user) => user.role === "teacher"), [users]);

  const stats = useMemo<TeacherStatsItem[]>(() => {
    const activeCount = teachersOnlyUsers.filter((user) => user.is_active).length;
    const displayedCount = teachersOnlyUsers.length;
    const totalLabelCount = totalCount || displayedCount;
    return [
      {
        label: "إجمالي حسابات الأساتذة",
        value: totalLabelCount,
        hint: "إجمالي النتائج ضمن الفلاتر الحالية",
      },
      {
        label: "النشطون (في الصفحة)",
        value: activeCount,
        hint: `${Math.max(displayedCount - activeCount, 0)} أستاذ غير نشط في الصفحة الحالية`,
      },
      {
        label: "المعروض حالياً",
        value: displayedCount,
        hint: "عدد السجلات داخل الصفحة الحالية",
      },
      {
        label: "أساتذة مع تكليفات",
        value: teachersOnlyUsers.filter((user) => (user.teacher?.assignments.length ?? 0) > 0).length,
        hint: "مربوطون بمواد وصفوف وشعب",
      },
    ];
  }, [teachersOnlyUsers, totalCount]);

  const filteredUsers = useMemo(() => {
    return teachersOnlyUsers.filter((user) => user.role === "teacher");
  }, [teachersOnlyUsers]);

  const sectionOptionsByClass = useMemo(() => {
    return getSectionOptionsByClass(sections);
  }, [sections]);

  const availableStudentSections = useMemo(() => {
    const currentClass = classes.find((item) => item.name === form.student.class_name);
    return currentClass ? sectionOptionsByClass.get(currentClass.id) ?? [] : [];
  }, [classes, form.student.class_name, sectionOptionsByClass]);

  const availableTeacherSections = useMemo(() => {
    if (!normalizedClassFilter) {
      return sections;
    }

    const classRow = classes.find((item) => item.name === normalizedClassFilter);
    return classRow ? sectionOptionsByClass.get(classRow.id) ?? [] : [];
  }, [classes, normalizedClassFilter, sectionOptionsByClass, sections]);

  const showingModal = showCreateModal || Boolean(editingUser);
  const teacherAssignment = form.teacher.assignments[0] ?? createEmptyTeacherAssignment();

  const teacherSections = useMemo(() => {
    const classRow = classes.find((item) => item.name === teacherAssignment.class_name);
    return classRow ? sectionOptionsByClass.get(classRow.id) ?? [] : [];
  }, [classes, teacherAssignment.class_name, sectionOptionsByClass]);

  // Query params builder
  const buildUsersQueryParams = useCallback(
    (options?: { page?: number; pageSize?: number }) => {
      const params = new URLSearchParams({
        schoolId: currentSchoolId ?? "",
        role: "teacher",
      });

      if (typeof options?.page === "number" && typeof options?.pageSize === "number") {
        params.set("page", String(options.page));
        params.set("pageSize", String(options.pageSize));
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (deferredQuery) {
        params.set("search", deferredQuery);
      }
      if (normalizedClassFilter) {
        params.set("className", normalizedClassFilter);
      }
      if (normalizedSectionFilter) {
        params.set("section", normalizedSectionFilter);
      }
      if (normalizedSubjectFilter) {
        params.set("subject", normalizedSubjectFilter);
      }

      return params;
    },
    [currentSchoolId, deferredQuery, normalizedClassFilter, normalizedSectionFilter, normalizedSubjectFilter, statusFilter],
  );

  // Data fetching
  const fetchOptions = useCallback(async () => {
    if (!currentSchoolId) {
      setClasses([]);
      setSections([]);
      setSubjects([]);
      return;
    }

    const compat = await detectAppSchemaCompat();
    const classQuery = supabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("school_id", currentSchoolId)
      .order("created_at", { ascending: true });
    let sectionQuery = supabase
      .from("sections")
      .select("id, name, class_id, section")
      .order("created_at", { ascending: true });
    if (compat.sectionsSchoolScope) {
      sectionQuery = sectionQuery.eq("school_id", currentSchoolId);
    }

    const [classesResult, sectionsResult, subjectsResult] = await Promise.all([
      classQuery,
      sectionQuery,
      supabase.from("subjects").select("id, name").eq("school_id", currentSchoolId).order("name", { ascending: true }),
    ]);

    if (!classesResult.error) {
      const rawClasses = (classesResult.data ?? []) as RawClassOption[];
      const classNamesByRecordId = buildClassNamesByRecordId(rawClasses);

      setClasses(processClassOptions(rawClasses));
      setSections(processSectionOptions((sectionsResult.data ?? []) as RawSectionOption[], rawClasses, classNamesByRecordId));
    }

    if (!subjectsResult.error) {
      setSubjects(processSubjectOptions((subjectsResult.data ?? []) as SubjectOption[]));
    }
  }, [currentSchoolId]);

  const fetchUsers = useCallback(async () => {
    if (!profile) return;

    if (!currentSchoolId) {
      setUsers([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = buildUsersQueryParams({ page: effectivePage, pageSize: PAGE_SIZE });

      const response = await fetchWithAuthorizedSession(`/api/dashboard/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر تحميل الحسابات."));
      }

      setUsers(Array.isArray(payload?.users) ? (payload.users as ManagedUserRecord[]) : []);
      setTotalCount(
        typeof payload?.totalCount === "number"
          ? payload.totalCount
          : Array.isArray(payload?.users)
            ? payload.users.length
            : 0,
      );
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل الحسابات.");
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [buildUsersQueryParams, currentSchoolId, effectivePage, profile]);

  // Effects
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!profile || schoolScopeLoading) return;
    void fetchOptions();
  }, [fetchOptions, profile, schoolScopeLoading]);

  useEffect(() => {
    if (!profile || schoolScopeLoading) return;
    void fetchUsers();
  }, [fetchUsers, profile, schoolScopeLoading]);

  useEffect(() => {
    if (usersQueryScopeRef.current === usersQueryScopeKey) return;
    usersQueryScopeRef.current = usersQueryScopeKey;
    if (page !== 1) {
      setPage(1);
    }
  }, [page, usersQueryScopeKey]);

  // Helper functions
  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const resetTableFilters = useCallback(() => {
    setSearchInput("");
    setQuery("");
    setStatusFilter("all");
    setClassFilter("");
    setSectionFilter("");
    setSubjectFilter("");
    setPage(1);
  }, []);

  const resetForm = useCallback((nextRole: ManagedUserRole = "teacher") => {
    setFieldErrors({});
    setForm(createEmptyForm(nextRole));
  }, []);

  const openCreateModal = useCallback((role: ManagedUserRole = "teacher") => {
    clearMessages();
    setEditingUser(null);
    resetForm(role);
    setShowCreateModal(true);
  }, [clearMessages, resetForm]);

  const openEditModal = useCallback((user: ManagedUserRecord) => {
    clearMessages();
    setFieldErrors({});
    setEditingUser(user);
    setForm(mapUserToForm(user));
  }, [clearMessages]);

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingUser(null);
    setFieldErrors({});
  }, []);

  const closeAccountCard = useCallback(() => {
    setAccountCard(null);
    setRevealedPassword(null);
  }, []);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportErrors([]);
    setImportPreview([]);
    setImportPayloads([]);
    if (importFileRef.current) {
      importFileRef.current.value = "";
    }
  }, []);

  const updateTeacherAssignment = useCallback((key: keyof TeacherAssignmentFormState, value: string) => {
    setForm((current) => ({
      ...current,
      teacher: {
        ...current.teacher,
        assignments: [
          {
            ...(current.teacher.assignments[0] ?? createEmptyTeacherAssignment()),
            [key]: value,
            ...(key === "class_name" ? { section: "" } : {}),
          },
        ],
      },
    }));
  }, []);

  const updateFormField = useCallback(<K extends keyof UserFormState>(field: K, value: UserFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const updateStudentField = useCallback(<K extends keyof UserFormState['student']>(field: K, value: UserFormState['student'][K]) => {
    setForm((current) => ({
      ...current,
      student: { ...current.student, [field]: value },
    }));
  }, []);

  const openPrintableWindow = useCallback((card: ManagedUserAccountCard, autoPrint = true) => {
    // Use the revealed password if available
    const passwordToShow = revealedPassword && revealedPassword !== "••••••••"
      ? revealedPassword
      : card.temporary_password;
    const cardWithPassword = { ...card, temporary_password: passwordToShow };
    printHtmlDocument(buildPrintableCardHtml(cardWithPassword, autoPrint));
  }, [revealedPassword]);

  const handleCopyCredentials = useCallback(async () => {
    if (!accountCard) return;

    const passwordText =
      (revealedPassword && revealedPassword !== "••••••••"
        ? revealedPassword
        : accountCard.temporary_password && accountCard.temporary_password !== "••••••••"
          ? accountCard.temporary_password
          : null) ?? "تم التعيين (غير متوفر للنسخ)";

    try {
      await navigator.clipboard.writeText(
        `معرّف الدخول: ${accountCard.login_identifier}\nكلمة المرور المؤقتة: ${passwordText}`,
      );
      setSuccess("تم نسخ بيانات الدخول المؤقتة.");
      setError("");
    } catch {
      setError("تعذر نسخ البيانات تلقائياً من المتصفح الحالي. استخدم نافذة الطباعة أو انسخها يدوياً.");
    }
  }, [accountCard, revealedPassword]);

  const downloadUsersTemplate = useCallback(async () => {
    const XLSX = await loadXLSX();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["الدور", "الاسم الكامل", "الهاتف", "معرّف الدخول", "الصف", "الشعبة", "المادة", "الحالة"],
      ["مدرس", "محمد علي", "07711111111", "teacher1@school.app", "الأول", "أ", "رياضيات", "نشط"],
      ["مدرس", "سارة أحمد", "07800000000", "", "الثاني", "ب", "فيزياء", "غير نشط"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "teachers");
    await XLSX.writeFile(workbook, "نموذج_استيراد_الاساتذة.xlsx");
  }, []);

  const handleImportFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportPreview([]);
    setImportPayloads([]);

    const fileValidationError = validateTeacherImportFile(file);
    if (fileValidationError) {
      setImportErrors([fileValidationError]);
      event.target.value = "";
      return;
    }

    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = await XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (!rows.length) {
        setImportErrors(["ملف الإكسل فارغ."]);
        return;
      }

      const collectedErrors: string[] = [];
      const payloads: ImportPayload[] = [];

      rows.forEach((row, index) => {
        const line = index + 2;
        const role = parseImportRole(
          readExcelColumn(row, ["الدور", "role", "type"]),
        );
        const fullName = readExcelColumn(row, ["الاسم الكامل", "الاسم", "full_name", "name"]);
        const email = readExcelColumn(row, ["معرّف الدخول", "معرف الدخول", "البريد الإلكتروني", "email", "login"]);
        const phone = readExcelColumn(row, ["الهاتف", "رقم الهاتف", "phone"]);
        const className = readExcelColumn(row, ["الصف", "class", "class_name"]);
        const section = readExcelColumn(row, ["الشعبة", "section"]);
        const subject = readExcelColumn(row, ["المادة", "subject", "subject_name"]);
        const activeValue = readExcelColumn(row, ["الحالة", "status", "active", "is_active"]);

        if (!role) {
          collectedErrors.push(`السطر ${line}: عمود الدور غير صالح (مدرس فقط).`);
          return;
        }

        if (role !== "teacher") {
          collectedErrors.push(`السطر ${line}: هذه الصفحة تدعم استيراد حسابات الأساتذة فقط.`);
          return;
        }

        if (!fullName) {
          collectedErrors.push(`السطر ${line}: الاسم الكامل مطلوب.`);
          return;
        }

        if (!className) {
          collectedErrors.push(`السطر ${line}: الصف مطلوب.`);
          return;
        }

        if (role === "teacher" && !subject) {
          collectedErrors.push(`السطر ${line}: المادة مطلوبة لحساب المدرّس.`);
          return;
        }

        const payload = {
          school_id: currentSchoolId,
          role,
          full_name: fullName,
          email,
          phone,
          is_active: parseImportActive(activeValue),
          password: "",
          student: null,
          teacher:
            role === "teacher"
              ? {
                  specialization: null,
                  notes: null,
                  assignments: [{ subject_name: subject, class_name: className, section: section || null }],
                }
              : null,
        };

        const validation = validateCreateManagedUserInput(payload);
        if (!validation.ok) {
          const fieldErrors = "fieldErrors" in validation ? validation.fieldErrors : {};
          const fallbackMessage = "message" in validation ? validation.message : "البيانات غير صالحة.";
          const firstFieldError = Object.values(fieldErrors)[0] ?? fallbackMessage;
          collectedErrors.push(`السطر ${line}: ${firstFieldError}`);
          return;
        }

        payloads.push({ line, payload: validation.value });
      });

      setImportPreview(rows.slice(0, 6));
      setImportPayloads(payloads);
      setImportErrors(collectedErrors);
    } catch {
      setImportErrors(["تعذر قراءة ملف الإكسل. تأكد من صيغة الملف وأنه غير تالف."]);
    }
  }, [currentSchoolId]);

  const handleImportUsers = useCallback(async () => {
    if (!currentSchoolId) {
      setImportErrors(["يجب تحديد مدرسة قبل الاستيراد."]);
      return;
    }

    if (!importPayloads.length) {
      setImportErrors(["لا توجد صفوف صالحة للاستيراد."]);
      return;
    }

    setImporting(true);
    const runtimeErrors: string[] = [];
    let createdCount = 0;

    for (const row of importPayloads) {
      try {
        const response = await fetchWithAuthorizedSession("/api/dashboard/users", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify(row.payload),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          runtimeErrors.push(`السطر ${row.line}: ${readApiError(result, "تعذر إنشاء الحساب.")}`);
          continue;
        }
        createdCount += 1;
      } catch {
        runtimeErrors.push(`السطر ${row.line}: خطأ اتصال أثناء إنشاء الحساب.`);
      }
    }

    if (runtimeErrors.length) {
      setImportErrors((current) => [...current, ...runtimeErrors]);
    }

    if (createdCount > 0) {
      setSuccess(
        runtimeErrors.length > 0
          ? `تم استيراد ${createdCount} حساب بنجاح، مع وجود ${runtimeErrors.length} سجل يحتاج مراجعة.`
          : `تم استيراد ${createdCount} حساب بنجاح.`,
      );
      await fetchUsers();
      await fetchOptions();
      if (runtimeErrors.length === 0) {
        closeImportModal();
      }
    }

    setImporting(false);
  }, [closeImportModal, currentSchoolId, fetchOptions, fetchUsers, importPayloads]);

  const handleExportUsers = useCallback(async () => {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل التصدير.");
      return;
    }

    try {
      const XLSX = await loadXLSX();
      const response = await fetchWithAuthorizedSession(`/api/dashboard/users?${buildUsersQueryParams().toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(readApiError(payload, "تعذر تحميل البيانات للتصدير."));
        return;
      }

      const exportUsers = Array.isArray(payload?.users) ? (payload.users as ManagedUserRecord[]) : filteredUsers;
      const rows = exportUsers.map((user) => ({
        "الاسم الكامل": user.full_name,
        الدور: "مدرس",
        الهاتف: user.phone || "",
        "معرّف الدخول": user.app_account?.login_identifier || user.email,
        البريد: user.email,
        الصف: user.teacher?.assignments[0]?.class_name || "",
        الشعبة: user.teacher?.assignments[0]?.section_name || "",
        المادة: user.teacher?.assignments[0]?.subject_name || "",
        الحالة: user.is_active ? "نشط" : "غير نشط",
        "تاريخ الإنشاء": formatDateLabel(user.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "teachers");
      await XLSX.writeFile(workbook, `حسابات_الاساتذة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setError("تعذر تجهيز ملف التصدير حالياً.");
    }
  }, [buildUsersQueryParams, currentSchoolId, filteredUsers]);

  const openAccountCardForUser = useCallback(async (user: ManagedUserRecord) => {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل عرض بطاقة الحساب.");
      return;
    }

    clearMessages();
    setCardLoadingId(user.auth_user_id);

    try {
      // Always issue a fresh temporary password when opening the card so the value is visible and printable.
      const resetResponse = await fetchWithAuthorizedSession(`/api/dashboard/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: currentSchoolId }),
      });
      const resetPayload = await resetResponse.json().catch(() => null);
      if (!resetResponse.ok || !resetPayload?.accountCard) {
        throw new Error(readApiError(resetPayload, "تعذر تحميل بطاقة الحساب."));
      }

      setAccountCard(resetPayload.accountCard as ManagedUserAccountCard);
      setRevealedPassword((resetPayload?.temporary_password as string | null) ?? null);
      setSuccess("تم إصدار كلمة مرور مؤقتة جديدة وفتح بطاقة الحساب مباشرة.");
      await fetchUsers();
    } catch (cardError) {
      setError(cardError instanceof Error ? cardError.message : "تعذر تحميل بطاقة الحساب.");
    } finally {
      setCardLoadingId(null);
    }
  }, [clearMessages, currentSchoolId, fetchUsers]);

  const handleResetTemporaryPassword = useCallback(async (user: ManagedUserRecord) => {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل إعادة تعيين كلمة المرور.");
      return;
    }

    clearMessages();
    setCardLoadingId(user.auth_user_id);

    try {
      const response = await fetchWithAuthorizedSession(`/api/dashboard/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: currentSchoolId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر إعادة تعيين كلمة المرور المؤقتة."));
      }

      setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
      // Store the revealed password from the reset response (one-time reveal)
      setRevealedPassword((payload?.temporary_password as string | null) ?? null);
      setSuccess("تم إنشاء كلمة مرور مؤقتة جديدة وفتح بطاقة الحساب.");
      await fetchUsers();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "تعذر إعادة تعيين كلمة المرور المؤقتة.");
    } finally {
      setCardLoadingId(null);
    }
  }, [clearMessages, currentSchoolId, fetchUsers]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setFieldErrors({});

    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل إدارة الحسابات.");
      return;
    }

    const payload = buildPayload(form, currentSchoolId);
    const localValidation = editingUser
      ? validateUpdateManagedUserInput(payload)
      : validateCreateManagedUserInput(payload);

    if (!localValidation.ok) {
      setFieldErrors("fieldErrors" in localValidation ? localValidation.fieldErrors : {});
      setError("message" in localValidation ? localValidation.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetchWithAuthorizedSession(
        editingUser ? `/api/dashboard/users/${editingUser.auth_user_id}` : "/api/dashboard/users",
        {
          method: editingUser ? "PATCH" : "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const nextFieldErrors =
          result && typeof result === "object" && result.error && typeof result.error === "object"
            ? ((result.error as { fieldErrors?: FieldErrors }).fieldErrors ?? {})
            : {};
        setFieldErrors(nextFieldErrors);
        throw new Error(readApiError(result, "تعذر حفظ الحساب."));
      }

      const createdTeacher = !editingUser && payload.role === "teacher";
      setSuccess(
        editingUser
          ? "تم تحديث الحساب بنجاح."
          : createdTeacher
            ? "تم إنشاء حساب الأستاذ بنجاح وفتح بطاقة الدخول مباشرة."
            : "تم إنشاء الحساب بنجاح.",
      );
      if (createdTeacher && result?.accountCard) {
        setAccountCard(result.accountCard as ManagedUserAccountCard);
      }
      closeModal();
      resetForm();
      await fetchUsers();
      await fetchOptions();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر حفظ الحساب.");
    } finally {
      setSaving(false);
    }
  }, [clearMessages, closeModal, currentSchoolId, editingUser, fetchOptions, fetchUsers, form, resetForm]);

  const handleToggle = useCallback(async (user: ManagedUserRecord) => {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل تعديل حالة الحساب.");
      return;
    }

    clearMessages();
    setTogglingId(user.auth_user_id);

    try {
      const response = await fetchWithAuthorizedSession(`/api/dashboard/users/${user.auth_user_id}`, {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: currentSchoolId,
          is_active: !user.is_active,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر تحديث حالة الحساب."));
      }

      setSuccess(user.is_active ? "تم تعطيل الحساب." : "تم تفعيل الحساب.");
      await fetchUsers();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "تعذر تحديث حالة الحساب.");
    } finally {
      setTogglingId(null);
    }
  }, [clearMessages, currentSchoolId, fetchUsers]);

  const handleDelete = useCallback(async (user: ManagedUserRecord) => {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل حذف الحساب.");
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف حساب الأستاذ "${user.full_name}" نهائياً؟`);
    if (!confirmed) return;

    clearMessages();
    setTogglingId(user.auth_user_id);

    try {
      const response = await fetchWithAuthorizedSession(`/api/dashboard/users/${user.auth_user_id}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: currentSchoolId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر حذف الحساب."));
      }

      setSuccess("تم حذف حساب الأستاذ بنجاح.");
      await fetchUsers();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف الحساب.");
    } finally {
      setTogglingId(null);
    }
  }, [clearMessages, currentSchoolId, fetchUsers]);

  return {
    // State
    classes,
    sections,
    subjects,
    users,
    loading,
    saving,
    togglingId,
    cardLoadingId,
    searchInput,
    query,
    statusFilter,
    classFilter,
    sectionFilter,
    subjectFilter,
    page,
    totalCount,
    success,
    error,
    fieldErrors,
    showCreateModal,
    editingUser,
    accountCard,
    revealedPassword,
    showImportModal,
    importing,
    importPreview,
    importPayloads,
    importErrors,
    form,
    // Computed
    filteredUsers,
    teachersOnlyUsers,
    stats,
    availableStudentSections,
    availableTeacherSections,
    sectionOptionsByClass,
    showingModal,
    teacherAssignment,
    teacherSections,
    // Actions
    setSearchInput,
    setStatusFilter,
    setClassFilter,
    setSectionFilter,
    setSubjectFilter,
    setPage,
    setSuccess,
    setError,
    setShowCreateModal,
    setShowImportModal,
    openCreateModal,
    openEditModal,
    closeModal,
    closeAccountCard,
    closeImportModal,
    updateTeacherAssignment,
    updateFormField,
    updateStudentField,
    resetTableFilters,
    openAccountCardForUser,
    handleResetTemporaryPassword,
    handleSubmit,
    handleToggle,
    handleDelete,
    handleExportUsers,
    handleImportFileChange,
    handleImportUsers,
    downloadUsersTemplate,
    openPrintableWindow,
    handleCopyCredentials,
    fetchUsers,
  };
}
