"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleOff,
  Copy,
  Download,
  Filter,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  PencilLine,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "@/lib/icons";

import { AppSidebar } from "@/components/AppSidebar";
import { SchoolLogo } from "@/components/brand";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { ListPagination } from "@/components/school/ListPagination";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { supabase } from "@/lib/supabase";
import { loadXLSX } from "@/lib/xlsx-loader";
import {
  type ManagedTeacherAssignmentInput,
  MANAGED_USER_ROLE_LABELS,
  validateCreateManagedUserInput,
  validateUpdateManagedUserInput,
  type ManagedUserAccountCard,
  type ManagedUserRecord,
  type ManagedUserRole,
} from "@/lib/managed-users";
import { escapeHtml, wrapPrintDocument } from "@/lib/print/branding";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

type FieldErrors = Record<string, string>;
type ClassOption = { id: string; name: string };
type SectionOption = { id: string; name: string; class_id: string };
type SubjectOption = { id: string; name: string };
type TeacherAssignmentFormState = ManagedTeacherAssignmentInput;
type RawClassOption = { id: string; name?: string | null; grade?: string | null; section?: string | null };
type RawSectionOption = { id: string; name?: string | null; class_id?: string | null; section?: string | null };

type UserFormState = {
  role: ManagedUserRole;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  is_active: boolean;
  student: {
    class_name: string;
    section: string;
  };
  teacher: {
    assignments: TeacherAssignmentFormState[];
  };
};

const TEACHER_IMPORT_ALLOWED_EXTENSIONS = [".xlsx"] as const;
const TEACHER_IMPORT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function validateTeacherImportFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  if (!normalizedName) {
    return "اسم الملف غير صالح.";
  }

  const hasAllowedExtension = TEACHER_IMPORT_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
  if (!hasAllowedExtension) {
    return "صيغة الملف غير مدعومة. استخدم ملف xlsx فقط.";
  }

  if (file.size <= 0) {
    return "ملف الإكسل فارغ.";
  }

  if (file.size > TEACHER_IMPORT_MAX_FILE_SIZE_BYTES) {
    return "حجم ملف الاستيراد كبير جداً. الحد الأقصى 2 ميغابايت.";
  }

  return null;
}

function createEmptyTeacherAssignment(): TeacherAssignmentFormState {
  return {
    subject_name: "",
    class_name: "",
    section: "",
  };
}

function createEmptyForm(role: ManagedUserRole = "teacher"): UserFormState {
  return {
    role,
    full_name: "",
    email: "",
    password: "",
    phone: "",
    is_active: true,
    student: {
      class_name: "",
      section: "",
    },
    teacher: {
      assignments: [createEmptyTeacherAssignment()],
    },
  };
}

function mapUserToForm(user: ManagedUserRecord): UserFormState {
  return {
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    password: "",
    phone: user.phone ?? "",
    is_active: user.is_active,
    student: {
      class_name: user.student?.class_name ?? "",
      section: user.student?.section ?? "",
    },
    teacher: {
      assignments:
        user.teacher?.assignments.length
          ? user.teacher.assignments.map((assignment) => ({
              subject_name: assignment.subject_name,
              class_name: assignment.class_name,
              section: assignment.section_name ?? "",
            }))
          : [createEmptyTeacherAssignment()],
    },
  };
}

function buildPayload(form: UserFormState, schoolId: string) {
  return {
    school_id: schoolId,
    role: form.role,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    is_active: form.is_active,
    password: form.password,
    student:
      form.role === "student"
        ? {
            class_name: form.student.class_name,
            section: form.student.section,
          }
        : null,
    teacher:
      form.role === "teacher"
        ? {
            assignments: form.teacher.assignments,
          }
        : null,
  };
}

function normalizeOptionText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getClassOptionName(option: RawClassOption) {
  return normalizeOptionText(option.name) || normalizeOptionText(option.grade);
}

function getSectionOptionName(option: RawSectionOption | RawClassOption) {
  return normalizeOptionText(option.name) || normalizeOptionText(option.section) || null;
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

function normalizeExcelCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function readExcelColumn(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeExcelCell(row[key]);
    if (value) return value;
  }
  return "";
}

function parseImportRole(value: string): ManagedUserRole | null {
  const normalized = value.toLowerCase();
  if (!normalized) return null;
  if (["student", "طالب", "طلاب"].some((token) => normalized.includes(token))) return "student";
  if (["teacher", "مدرس", "معلم", "مدرسة"].some((token) => normalized.includes(token))) return "teacher";
  return null;
}

function parseImportActive(value: string) {
  const normalized = value.toLowerCase();
  if (!normalized) return true;
  if (["inactive", "disabled", "غير نشط", "موقوف", "0", "no", "false"].includes(normalized)) return false;
  return true;
}

function inputClass(hasError = false) {
  return `ui-input ${hasError ? "!border-[rgba(240,90,90,0.48)] !bg-[rgba(240,90,90,0.04)]" : ""}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-bold text-[var(--danger)]">{message}</p>;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`ui-pill ${active ? "ui-pill--success" : "ui-pill--danger"}`}>
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

function RolePill({ role }: { role: ManagedUserRole }) {
  const toneClass =
    role === "student"
      ? "bg-[var(--surface-soft)] text-[var(--text-primary)]"
      : "ui-pill--warning";

  return <span className={`ui-pill ${toneClass}`}>{MANAGED_USER_ROLE_LABELS[role]}</span>;
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildPrintableCardHtml(card: ManagedUserAccountCard, autoPrint = true) {
  const instructions = card.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("");
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const roleLabel = card.role === "student" ? "الطالب" : "المدرس";
  return wrapPrintDocument({
    title: "بطاقة حساب التطبيق",
    subtitle: `بطاقة بيانات دخول ${roleLabel}`,
    branding: {
      schoolName: card.school_name,
      logoUrl: card.school_logo_url,
      locale: "ar",
    },
    autoPrint,
    extraStyles: `
      .teacher-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}
      .teacher-card-note{margin-top:16px;font-size:12px;color:var(--print-muted)}
      @media (max-width:700px){.teacher-card-grid{grid-template-columns:1fr}}
    `,
    bodyHtml: `
      <div class="teacher-card-grid">
        <div class="print-panel">
          <span class="print-label">الاسم الكامل</span>
          <div class="print-value">${escapeHtml(card.full_name)}</div>
          <div style="margin-top:8px;color:var(--print-muted);font-size:13px">${card.role === "student" ? "حساب طالب" : "حساب مدرس"}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">الصف والشعبة</span>
          <div class="print-value">${escapeHtml(classLine || "—")}</div>
          <div style="margin-top:8px;color:var(--print-muted);font-size:13px">${card.role === "student" ? "يظهر للطلاب فقط" : "حسب التكليفات المسندة"}</div>
        </div>
      </div>
      <div class="teacher-card-grid">
        <div class="print-panel">
          <span class="print-label">معرّف الدخول</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.login_identifier)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">كلمة المرور المؤقتة</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.temporary_password)}</div>
        </div>
      </div>
      <div class="print-panel">
        <span class="print-label">إرشادات الدخول</span>
        <ol class="print-list">${instructions}</ol>
      </div>
      <div class="teacher-card-note">تم التوليد: ${escapeHtml(formatDateLabel(card.generated_at))}</div>
    `,
  });
}

export default function TeachersManagementPage() {
  const SEARCH_DEBOUNCE_MS = 350;
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const currentSchoolId = profile?.role === "super_admin" ? schoolScope.selectedSchoolId : profile?.school_id ?? null;

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
  const [roleFilter] = useState<ManagedUserRole>("teacher");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [totalCount, setTotalCount] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(null);
  const [accountCard, setAccountCard] = useState<ManagedUserAccountCard | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<Record<string, unknown>>>([]);
  const [importPayloads, setImportPayloads] = useState<Array<{ line: number; payload: unknown }>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UserFormState>(() => createEmptyForm("teacher"));

  const deferredQuery = query.trim().toLowerCase();
  const normalizedClassFilter = classFilter.trim();
  const normalizedSectionFilter = sectionFilter.trim();
  const normalizedSubjectFilter = subjectFilter.trim();
  const usersQueryScopeRef = useRef<string | null>(null);
  const usersQueryScopeKey = [
    currentSchoolId || "none",
    deferredQuery,
    normalizedClassFilter,
    normalizedSectionFilter,
    normalizedSubjectFilter,
    statusFilter,
  ].join("::");
  const effectivePage =
    usersQueryScopeRef.current !== null && usersQueryScopeRef.current !== usersQueryScopeKey && page !== 1 ? 1 : page;

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
    [
      currentSchoolId,
      deferredQuery,
      normalizedClassFilter,
      normalizedSectionFilter,
      normalizedSubjectFilter,
      statusFilter,
    ],
  );

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
      .select("*")
      .eq("school_id", currentSchoolId)
      .order("created_at", { ascending: true });
    let sectionQuery = supabase.from("sections").select("*").order("created_at", { ascending: true });
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
      const classNamesByRecordId = new Map<string, string>();
      const normalizedClasses = new Map<string, ClassOption>();

      rawClasses.forEach((item) => {
        const name = getClassOptionName(item);
        if (!name) return;
        classNamesByRecordId.set(item.id, name);
        normalizedClasses.set(name, { id: name, name });
      });

      setClasses(Array.from(normalizedClasses.values()));

      const normalizedSections = new Map<string, SectionOption>();
      if (!sectionsResult.error) {
        ((sectionsResult.data ?? []) as RawSectionOption[]).forEach((item) => {
          const name = getSectionOptionName(item);
          const className = item.class_id ? classNamesByRecordId.get(item.class_id) ?? null : null;
          if (!name || !className) return;
          normalizedSections.set(`${className}::${name}`, {
            id: `${className}::${name}`,
            name,
            class_id: className,
          });
        });
      }

      rawClasses.forEach((item) => {
        const className = getClassOptionName(item);
        const sectionName = getSectionOptionName(item);
        if (!className || !sectionName) return;
        normalizedSections.set(`${className}::${sectionName}`, {
          id: `${className}::${sectionName}`,
          name: sectionName,
          class_id: className,
        });
      });

      setSections(Array.from(normalizedSections.values()));
    }

    if (!subjectsResult.error) {
      setSubjects(((subjectsResult.data ?? []) as SubjectOption[]).map((item) => ({ id: item.id, name: item.name })));
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
      const params = buildUsersQueryParams({ page: effectivePage, pageSize });

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
  }, [buildUsersQueryParams, currentSchoolId, effectivePage, pageSize, profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(searchInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchOptions();
  }, [fetchOptions, profile, schoolScope.scopeLoading]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchUsers();
  }, [fetchUsers, profile, schoolScope.scopeLoading]);

  useEffect(() => {
    if (usersQueryScopeRef.current === usersQueryScopeKey) return;
    usersQueryScopeRef.current = usersQueryScopeKey;
    if (page !== 1) {
      setPage(1);
    }
  }, [page, usersQueryScopeKey]);

  const teachersOnlyUsers = useMemo(() => users.filter((user) => user.role === "teacher"), [users]);

  const stats = useMemo(() => {
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
    return teachersOnlyUsers.filter((user) => user.role === roleFilter);
  }, [roleFilter, teachersOnlyUsers]);

  const sectionOptionsByClass = useMemo(() => {
    const map = new Map<string, SectionOption[]>();

    sections.forEach((section) => {
      const current = map.get(section.class_id) ?? [];
      current.push(section);
      map.set(section.class_id, current);
    });

    return map;
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

  function getSectionsForClass(className: string) {
    const classRow = classes.find((item) => item.name === className);
    return classRow ? sectionOptionsByClass.get(classRow.id) ?? [] : [];
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetTableFilters() {
    setSearchInput("");
    setQuery("");
    setStatusFilter("all");
    setClassFilter("");
    setSectionFilter("");
    setSubjectFilter("");
    setPage(1);
  }

  function resetForm(nextRole: ManagedUserRole = "teacher") {
    setFieldErrors({});
    setForm(createEmptyForm(nextRole));
  }

  function openCreateModal(role: ManagedUserRole = "teacher") {
    clearMessages();
    setEditingUser(null);
    resetForm(role);
    setShowCreateModal(true);
  }

  function openEditModal(user: ManagedUserRecord) {
    clearMessages();
    setFieldErrors({});
    setEditingUser(user);
    setForm(mapUserToForm(user));
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingUser(null);
    setFieldErrors({});
  }

  function closeAccountCard() {
    setAccountCard(null);
  }

  function updateTeacherAssignment(key: keyof TeacherAssignmentFormState, value: string) {
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
  }

  function openPrintableWindow(card: ManagedUserAccountCard, autoPrint = true) {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=920,height=820");
    if (!popup) {
      throw new Error("يرجى السماح بالنوافذ المنبثقة لعرض بطاقة الحساب.");
    }

    popup.document.open();
    popup.document.write(buildPrintableCardHtml(card, autoPrint));
    popup.document.close();
  }

  async function handleCopyCredentials() {
    if (!accountCard) return;

    try {
      await navigator.clipboard.writeText(
        `معرّف الدخول: ${accountCard.login_identifier}\nكلمة المرور المؤقتة: ${accountCard.temporary_password}`,
      );
      setSuccess("تم نسخ بيانات الدخول المؤقتة.");
      setError("");
    } catch {
      setError("تعذر نسخ البيانات تلقائياً من المتصفح الحالي. استخدم نافذة الطباعة أو انسخها يدوياً.");
    }
  }

  function closeImportModal() {
    setShowImportModal(false);
    setImportErrors([]);
    setImportPreview([]);
    setImportPayloads([]);
    if (importFileRef.current) {
      importFileRef.current.value = "";
    }
  }

  async function downloadUsersTemplate() {
    const XLSX = await loadXLSX();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["الدور", "الاسم الكامل", "الهاتف", "معرّف الدخول", "الصف", "الشعبة", "المادة", "الحالة"],
      ["مدرس", "محمد علي", "07711111111", "teacher1@school.app", "الأول", "أ", "رياضيات", "نشط"],
      ["مدرس", "سارة أحمد", "07800000000", "", "الثاني", "ب", "فيزياء", "غير نشط"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "teachers");
    await XLSX.writeFile(workbook, "نموذج_استيراد_الاساتذة.xlsx");
  }

  async function handleImportFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
      const payloads: Array<{ line: number; payload: unknown }> = [];

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
  }

  async function handleImportUsers() {
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
  }

  async function handleExportUsers() {
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
  }

  async function openAccountCardForUser(user: ManagedUserRecord) {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل عرض بطاقة الحساب.");
      return;
    }

    clearMessages();
    setCardLoadingId(user.auth_user_id);

    try {
      const response = await fetchWithAuthorizedSession(
        `/api/dashboard/users/${user.auth_user_id}/card?schoolId=${encodeURIComponent(currentSchoolId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.accountCard) {
        setAccountCard(payload.accountCard as ManagedUserAccountCard);
        return;
      }

      const resetResponse = await fetchWithAuthorizedSession(`/api/dashboard/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: currentSchoolId }),
      });
      const resetPayload = await resetResponse.json().catch(() => null);
      if (!resetResponse.ok || !resetPayload?.accountCard) {
        throw new Error(readApiError(resetPayload ?? payload, "تعذر تحميل بطاقة الحساب."));
      }

      setAccountCard(resetPayload.accountCard as ManagedUserAccountCard);
      setSuccess("تم إصدار كلمة مرور مؤقتة جديدة وفتح بطاقة الحساب مباشرة.");
      await fetchUsers();
    } catch (cardError) {
      setError(cardError instanceof Error ? cardError.message : "تعذر تحميل بطاقة الحساب.");
    } finally {
      setCardLoadingId(null);
    }
  }

  async function handleResetTemporaryPassword(user: ManagedUserRecord) {
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
      setSuccess("تم إنشاء كلمة مرور مؤقتة جديدة وفتح بطاقة الحساب.");
      await fetchUsers();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "تعذر إعادة تعيين كلمة المرور المؤقتة.");
    } finally {
      setCardLoadingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
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
  }

  async function handleToggle(user: ManagedUserRecord) {
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
  }

  async function handleDelete(user: ManagedUserRecord) {
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
  }

  const showingModal = showCreateModal || Boolean(editingUser);
  const isStudentForm = false;
  const teacherAssignment = form.teacher.assignments[0] ?? createEmptyTeacherAssignment();
  const teacherSections = getSectionsForClass(teacherAssignment.class_name);
  const modalTitle = editingUser
    ? "تعديل حساب الأستاذ"
    : "إضافة أستاذ";
  const modalDescription = editingUser
    ? "يتم تعديل بيانات الدخول وربط الحساب الحالي دون المساس بتدفق الطباعة أو التكامل الخلفي."
    : "هذا النموذج يركز على بيانات حساب الأستاذ وتكليفاته الأساسية فقط.";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="layout">
        <AppSidebar currentPath="/teachers" showFloatingToggle />

        <div className="main">
          <div className="content app-shell-content space-y-5">
            {success ? (
              <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(47,182,122,0.18)] bg-[rgba(47,182,122,0.1)] px-4 py-3 text-[var(--success)]">
                <CheckCircle2 size={18} className="mt-1 shrink-0" />
                <p className="text-sm font-bold leading-7">{success}</p>
              </div>
            ) : null}

            {error ? (
              <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.1)] px-4 py-3 text-[var(--danger)]">
                <CircleOff size={18} className="mt-1 shrink-0" />
                <p className="text-sm font-bold leading-7">{error}</p>
              </div>
            ) : null}

            <SchoolScopeBanner scope={schoolScope} showSelector={false} />

            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState
                scope={schoolScope}
                title="إدارة حسابات الأساتذة"
                description="يجب اختيار مدرسة صريحة أولاً قبل إنشاء أو تعديل حسابات الأساتذة."
              />
            ) : (
              <>
                <section className="ui-surface rounded-[30px] p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                        <Sparkles size={15} />
                        إجراءات حسابات الأساتذة
                      </div>
                      <h2 className="text-xl font-black text-[var(--text-primary)]">أنشئ حساب الأستاذ الصحيح من البداية</h2>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">
                        هذه الصفحة مخصصة لبيانات دخول الأساتذة فقط، مع ربط المادة والصف والشعبة، حتى تبقى الإدارة واضحة وسريعة.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 xl:max-w-[740px] xl:grid-cols-1">
                      <button
                        type="button"
                        className="ui-button ui-button--primary inline-flex min-h-[78px] items-center justify-between gap-3 px-5 text-right"
                        onClick={() => openCreateModal("teacher")}
                      >
                        <span className="space-y-1">
                          <span className="block text-base font-black">إضافة أستاذ</span>
                          <span className="block text-xs font-semibold text-white/85">
                            الاسم والهاتف ومعرّف الدخول مع المادة والصف والشعبة
                          </span>
                        </span>
                        <BookOpen size={18} className="shrink-0" />
                      </button>

                      <div className="grid gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-3 xl:col-span-2 sm:grid-cols-3">
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
                          onClick={() => setShowImportModal(true)}
                        >
                          <Upload size={15} />
                          استيراد إكسل
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
                          onClick={() => void handleExportUsers()}
                        >
                          <Download size={15} />
                          تصدير إكسل
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-4 text-sm"
                          onClick={() => void downloadUsersTemplate()}
                        >
                          <FileSpreadsheet size={15} />
                          نموذج إكسل
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-3 xl:grid-cols-4">
                  {stats.map((item) => (
                    <article key={item.label} className="ui-soft-surface rounded-[24px] p-4">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
                        <BookOpen size={18} />
                      </div>
                      <p className="text-xs font-black text-[var(--text-secondary)]">{item.label}</p>
                      <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{item.value}</div>
                      <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{item.hint}</p>
                    </article>
                  ))}
                </section>

                <section className="ui-surface rounded-[30px] p-5">
                  <div className="mb-5 flex flex-col gap-4 border-b border-[var(--border)] pb-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]">
                        <Users size={14} />
                        يعرض {filteredUsers.length} في هذه الصفحة من أصل {totalCount || filteredUsers.length} أستاذ مطابق
                      </div>
                      <h2 className="text-xl font-black text-[var(--text-primary)]">حسابات الأساتذة الحالية</h2>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                        راجع حسابات الأساتذة الحالية وابحث بسرعة ثم نفّذ الإجراء المناسب من نفس الجدول.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-[var(--surface-muted)] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-black text-[var(--text-primary)]">البحث والتصفية</div>
                        <p className="text-xs leading-6 text-[var(--text-secondary)]">
                          ابحث بالاسم أو معرّف الدخول أو الهاتف أو المادة، ثم صفِّ النتائج حسب الصف والشعبة والحالة.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                          onClick={() => void handleExportUsers()}
                        >
                          <Download size={16} />
                          تصدير إكسل
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                          onClick={() => setShowImportModal(true)}
                        >
                          <Upload size={16} />
                          استيراد إكسل
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                          onClick={() => void fetchUsers()}
                        >
                          <Loader2 size={16} className={loading ? "animate-spin" : ""} />
                          تحديث
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                          onClick={resetTableFilters}
                          disabled={
                            !query &&
                            !normalizedClassFilter &&
                            !normalizedSectionFilter &&
                            !normalizedSubjectFilter &&
                            statusFilter === "all"
                          }
                        >
                          <CircleOff size={16} />
                          مسح الفلاتر
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,220px))]">
                      <label className="relative block space-y-2">
                        <span className="text-sm font-black text-[var(--text-secondary)]">بحث سريع</span>
                        <Search
                          size={18}
                          className="pointer-events-none absolute text-[var(--text-tertiary)]"
                          style={{ insetInlineStart: "1rem", top: "calc(50% + 0.95rem)", transform: "translateY(-50%)" }}
                        />
                        <input
                          type="search"
                          className="ui-input"
                          style={{ paddingInlineStart: "3rem" }}
                          placeholder="ابحث بالاسم أو المعرّف أو الهاتف أو المادة أو الصف"
                          value={searchInput}
                          onChange={(event) => setSearchInput(event.target.value)}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
                          <Filter size={16} />
                          المادة
                        </span>
                        <select
                          className="ui-input"
                          value={subjectFilter}
                          onChange={(event) => setSubjectFilter(event.target.value)}
                        >
                          <option value="">كل المواد</option>
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
                          <BookOpen size={16} />
                          الصف
                        </span>
                        <select
                          className="ui-input"
                          value={classFilter}
                          onChange={(event) => {
                            setClassFilter(event.target.value);
                            setSectionFilter("");
                          }}
                        >
                          <option value="">كل الصفوف</option>
                          {classes.map((classOption) => (
                            <option key={classOption.id} value={classOption.name}>
                              {classOption.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
                          <Users size={16} />
                          الشعبة
                        </span>
                        <select
                          className="ui-input"
                          value={sectionFilter}
                          onChange={(event) => setSectionFilter(event.target.value)}
                        >
                          <option value="">كل الشعب</option>
                          {availableTeacherSections.map((sectionOption) => (
                            <option key={sectionOption.id} value={sectionOption.name}>
                              {sectionOption.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
                          <ShieldCheck size={16} />
                          الحالة
                        </span>
                        <select
                          className="ui-input"
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                        >
                          <option value="all">كل الحالات</option>
                          <option value="active">نشط</option>
                          <option value="inactive">غير نشط</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-[26px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xs)]">
                    <table className="ui-table min-w-[1260px]">
                      <thead className="bg-[var(--surface-muted)]">
                        <tr>
                          <th>المستخدم</th>
                          <th>الدور</th>
                          <th>التفاصيل المرتبطة</th>
                          <th>بيانات التطبيق</th>
                          <th>الحالة</th>
                          <th>تاريخ الإنشاء</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center">
                              <div className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
                                <Loader2 size={16} className="animate-spin" />
                                جارٍ تحميل الحسابات...
                              </div>
                            </td>
                          </tr>
                        ) : filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center">
                              <div className="mx-auto max-w-md space-y-3">
                                <p className="text-lg font-black text-[var(--text-primary)]">لا توجد حسابات مطابقة</p>
                                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                                  أنشئ أول حساب أستاذ، أو عدّل الفلاتر الحالية لعرض نتائج أكثر.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user, index) => (
                            <tr key={user.auth_user_id} className={index % 2 === 0 ? "bg-transparent" : "bg-[var(--surface-soft)]/45"}>
                              <td>
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${
                                      user.role === "student"
                                        ? "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]"
                                        : "border border-[rgba(242,169,59,0.18)] bg-[rgba(242,169,59,0.12)] text-[var(--warning)]"
                                    }`}
                                  >
                                    {user.role === "student" ? <Users size={18} /> : <BookOpen size={18} />}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="font-black text-[var(--text-primary)]">{user.full_name}</div>
                                    <div className="inline-flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                                      <span dir="ltr">{user.email}</span>
                                      <span className="text-[var(--text-tertiary)]">•</span>
                                      <span>{user.phone || "بدون رقم هاتف"}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <RolePill role={user.role} />
                              </td>
                              <td>
                                {user.role === "student" ? (
                                  <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    <div>الصف: {user.student?.class_name || "غير محدد"}</div>
                                    <div>الشعبة: {user.student?.section || "غير محددة"}</div>
                                  </div>
                                ) : (
                                  <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    <div>عدد التكليفات: {user.teacher?.assignments.length ?? 0}</div>
                                    {user.teacher?.assignments.length ? (
                                      user.teacher.assignments.slice(0, 2).map((assignment) => (
                                        <div key={assignment.id || `${assignment.subject_name}-${assignment.class_name}-${assignment.section_name ?? "*"}`}>
                                          {assignment.subject_name} • {assignment.class_name}
                                          {assignment.section_name ? ` • ${assignment.section_name}` : " • كل الشعب"}
                                        </div>
                                      ))
                                    ) : (
                                      <div>لم تُسند أي تكليفات حتى الآن</div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-black text-[var(--text-tertiary)]">معرّف الدخول</div>
                                    <div dir="ltr" className="font-bold text-[var(--text-primary)]">
                                      {user.app_account?.login_identifier || user.email}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-black text-[var(--text-tertiary)]">كلمة المرور المؤقتة</div>
                                    <div>{user.app_account?.has_temporary_password ? "جاهزة للطباعة" : "تحتاج إعادة تعيين"}</div>
                                  </div>
                                  <div>آخر تحديث: {formatDateLabel(user.app_account?.password_last_reset_at)}</div>
                                </div>
                              </td>
                              <td>
                                <StatusPill active={user.is_active} />
                              </td>
                              <td className="text-sm text-[var(--text-secondary)]">
                                {formatDateLabel(user.created_at)}
                              </td>
                              <td>
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex min-h-[42px] min-w-[102px] items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <PencilLine size={15} />
                                    تعديل
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--primary inline-flex min-h-[42px] min-w-[124px] items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={() => void openAccountCardForUser(user)}
                                    disabled={cardLoadingId === user.auth_user_id}
                                  >
                                    {cardLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                                    بطاقة الدخول
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex min-h-[42px] min-w-[124px] items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={() => void handleResetTemporaryPassword(user)}
                                    disabled={cardLoadingId === user.auth_user_id}
                                  >
                                    {cardLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                                    إعادة ضبط المرور
                                  </button>
                                  <button
                                    type="button"
                                    className={`ui-button inline-flex min-h-[42px] min-w-[94px] items-center justify-center gap-2 px-3 py-2 text-sm ${
                                      user.is_active ? "ui-button--danger" : "ui-button--primary"
                                    }`}
                                    onClick={() => void handleToggle(user)}
                                    disabled={togglingId === user.auth_user_id}
                                  >
                                    {togglingId === user.auth_user_id ? (
                                      <Loader2 size={15} className="animate-spin" />
                                    ) : user.is_active ? (
                                      <CircleOff size={15} />
                                    ) : (
                                      <CheckCircle2 size={15} />
                                    )}
                                    {user.is_active ? "تعطيل" : "تفعيل"}
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--danger inline-flex min-h-[42px] min-w-[94px] items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={() => void handleDelete(user)}
                                    disabled={togglingId === user.auth_user_id}
                                  >
                                    {togglingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                    حذف
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <ListPagination
                      page={page}
                      pageSize={pageSize}
                      totalCount={totalCount}
                      onPageChange={setPage}
                      disabled={loading}
                    />
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {showingModal ? (
          <div
            className="ui-backdrop flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div className={`ui-dialog w-full overflow-hidden ${isStudentForm ? "max-w-[760px]" : "max-w-[920px]"}`}>
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                    <BookOpen size={15} />
                    مسار حساب الأستاذ
                  </div>
                  <h2 className="text-xl font-black text-[var(--text-primary)]">{modalTitle}</h2>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">{modalDescription}</p>
                </div>

                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  onClick={closeModal}
                  aria-label="إغلاق"
                >
                  <CircleOff size={18} />
                </button>
              </div>

              <form className="max-h-[calc(100dvh-10rem)] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6" onSubmit={handleSubmit} noValidate>
                <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات الحساب الأساسية</h3>
                    <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                      الاسم وبيانات الدخول والحالة وربط الحساب الجاهز للاستخدام.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">الحالة</span>
                    <select
                      className={inputClass()}
                      value={form.is_active ? "active" : "inactive"}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          is_active: event.target.value === "active",
                        }))
                      }
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">الاسم الكامل</span>
                    <input
                      className={inputClass(Boolean(fieldErrors.full_name))}
                      value={form.full_name}
                      onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    />
                    <FieldError message={fieldErrors.full_name} />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">رقم الهاتف</span>
                    <input
                      className={inputClass(Boolean(fieldErrors.phone))}
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                    <FieldError message={fieldErrors.phone} />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">
                      معرّف الدخول / البريد الإلكتروني
                    </span>
                    <input
                      type="email"
                      dir="ltr"
                      className={inputClass(Boolean(fieldErrors.email))}
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="اختياري: إذا تُرك فارغاً سيُولد تلقائياً"
                    />
                    <FieldError message={fieldErrors.email} />
                  </label>

                  {!editingUser ? (
                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)] md:col-span-2">
                      <div className="mb-1 flex items-center gap-2 font-black text-[var(--text-primary)]">
                        <Sparkles size={16} />
                        توليد تلقائي لبيانات التطبيق
                      </div>
                      سيتم إنشاء مستخدم Supabase Auth حقيقي ومعرّف دخول وكلمة مرور مؤقتة آمنة تلقائياً، ثم عرض بطاقة حساب قابلة للطباعة فور الحفظ.
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)] md:col-span-2">
                      تغيير الدور أو كلمة المرور غير مشمول هنا. استخدم زر "إعادة ضبط المؤقتة" من الجدول لإصدار كلمة مرور جديدة وفتح بطاقة الحساب مباشرة.
                    </div>
                  )}
                  </div>
                </section>

                {form.role === "student" ? (
                  <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div>
                      <h3 className="text-lg font-black text-[var(--text-primary)]">ربط الطالب</h3>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                        اختر الصف والشعبة فقط. تفاصيل العنوان والرسوم تُدار من شاشة الطلاب خارج هذا المودال.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">الصف</span>
                        <select
                          className={inputClass(Boolean(fieldErrors["student.class_name"]))}
                          value={form.student.class_name}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, class_name: event.target.value, section: "" },
                            }))
                          }
                        >
                          <option value="">اختر الصف</option>
                          {classes.map((classOption) => (
                            <option key={classOption.id} value={classOption.name}>
                              {classOption.name}
                            </option>
                          ))}
                        </select>
                        <FieldError message={fieldErrors["student.class_name"]} />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">الشعبة</span>
                        <select
                          className={inputClass(Boolean(fieldErrors["student.section"]))}
                          value={form.student.section}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, section: event.target.value },
                            }))
                          }
                        >
                          <option value="">كل الشعب / غير محددة</option>
                          {availableStudentSections.map((sectionOption) => (
                            <option key={sectionOption.id} value={sectionOption.name}>
                              {sectionOption.name}
                            </option>
                          ))}
                        </select>
                        <FieldError message={fieldErrors["student.section"]} />
                      </label>
                    </div>
                  </section>
                ) : (
                  <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <div>
                      <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات المدرس الأكاديمية</h3>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                        أدخل مادة واحدة مع الصف والشعبة المرتبطين بالحساب.
                      </p>
                    </div>
                    <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <FieldError message={fieldErrors["teacher.assignments"]} />
                      <div className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-3">
                        <label className="space-y-2">
                          <span className="text-sm font-black text-[var(--text-primary)]">المادة</span>
                          <input
                            list="subjects-list"
                            className={inputClass(Boolean(fieldErrors["teacher.assignments.0.subject_name"]))}
                            value={teacherAssignment.subject_name}
                            onChange={(event) => updateTeacherAssignment("subject_name", event.target.value)}
                          />
                          <FieldError message={fieldErrors["teacher.assignments.0.subject_name"]} />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-black text-[var(--text-primary)]">الصف</span>
                          <select
                            className={inputClass(Boolean(fieldErrors["teacher.assignments.0.class_name"]))}
                            value={teacherAssignment.class_name}
                            onChange={(event) => updateTeacherAssignment("class_name", event.target.value)}
                          >
                            <option value="">اختر الصف</option>
                            {classes.map((classOption) => (
                              <option key={classOption.id} value={classOption.name}>
                                {classOption.name}
                              </option>
                            ))}
                          </select>
                          <FieldError message={fieldErrors["teacher.assignments.0.class_name"]} />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-black text-[var(--text-primary)]">الشعبة</span>
                          <select
                            className={inputClass()}
                            value={teacherAssignment.section ?? ""}
                            onChange={(event) => updateTeacherAssignment("section", event.target.value)}
                          >
                            <option value="">كل الشعب</option>
                            {teacherSections.map((sectionOption) => (
                              <option key={sectionOption.id} value={sectionOption.name}>
                                {sectionOption.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <datalist id="subjects-list">
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.name} />
                        ))}
                      </datalist>
                    </div>
                  </section>
                )}

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="ui-button ui-button--secondary"
                    onClick={closeModal}
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="ui-button ui-button--primary inline-flex items-center gap-2" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {editingUser ? "حفظ التعديلات" : "إنشاء الحساب"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showImportModal ? (
          <div
            className="ui-backdrop flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeImportModal();
              }
            }}
          >
            <div className="ui-dialog w-full max-w-[860px] overflow-hidden">
              <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                      <Upload size={15} />
                      استيراد حسابات الأساتذة من إكسل
                    </div>
                    <h2 className="text-xl font-black text-[var(--text-primary)]">استيراد آمن مع التحقق قبل الحفظ</h2>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">
                      يتم فحص كل سطر قبل الإرسال. السطور الخاطئة تُعرض برسائل واضحة ولن يتم حفظها.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    onClick={closeImportModal}
                    aria-label="إغلاق"
                  >
                    <CircleOff size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[var(--text-secondary)]">
                      الأعمدة المقترحة: الدور، الاسم الكامل، الهاتف، معرّف الدخول، الصف، الشعبة، المادة، الحالة
                    </p>
                    <button
                      type="button"
                      className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4 text-sm"
                      onClick={() => void downloadUsersTemplate()}
                    >
                      <FileSpreadsheet size={15} />
                      تحميل نموذج جاهز
                    </button>
                  </div>

                  <label className="block cursor-pointer rounded-[16px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-strong)] p-4 text-center transition hover:border-[var(--primary)]">
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(event) => void handleImportFileChange(event)}
                    />
                    <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]">
                      <Upload size={18} />
                    </div>
                    <p className="text-sm font-black text-[var(--text-primary)]">اضغط لاختيار ملف Excel</p>
                    <p className="text-xs text-[var(--text-secondary)]">سيتم عرض معاينة وفحص السطور قبل الاستيراد</p>
                  </label>
                </div>

                {importErrors.length ? (
                  <div className="space-y-2 rounded-[20px] border border-[rgba(240,90,90,0.22)] bg-[rgba(240,90,90,0.08)] p-4">
                    <p className="text-sm font-black text-[var(--danger)]">أخطاء التحقق</p>
                    <ul className="max-h-44 space-y-1 overflow-y-auto pr-5 text-sm leading-7 text-[var(--danger)]">
                      {importErrors.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {importPreview.length ? (
                  <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <p className="mb-3 text-sm font-black text-[var(--text-primary)]">معاينة أول 6 صفوف من الملف</p>
                    <div className="overflow-x-auto rounded-[14px] border border-[var(--border)]">
                      <table className="ui-table min-w-[780px]">
                        <thead>
                          <tr>
                            {Object.keys(importPreview[0] ?? {}).map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, rowIndex) => (
                            <tr key={`preview-row-${rowIndex}`}>
                              {Object.keys(importPreview[0] ?? {}).map((column) => (
                                <td key={`${column}-${rowIndex}`}>{normalizeExcelCell(row[column]) || "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" className="ui-button ui-button--secondary" onClick={closeImportModal}>
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--primary inline-flex items-center gap-2"
                    onClick={() => void handleImportUsers()}
                    disabled={importing || importPayloads.length === 0}
                  >
                    {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {importing ? "جارٍ الاستيراد..." : `استيراد (${importPayloads.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {accountCard ? (
          <div
            className="ui-backdrop flex items-center justify-center p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeAccountCard();
              }
            }}
          >
            <div className="ui-dialog w-full max-w-[760px] overflow-hidden">
              <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                      <Printer size={15} />
                      بطاقة حساب التطبيق جاهزة
                    </div>
                    <h2 className="text-2xl font-black text-[var(--text-primary)]">{accountCard.school_name}</h2>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">
                      اطبع البطاقة أو انسخ بيانات الدخول المؤقتة ثم سلّمها إلى {accountCard.role === "student" ? "الطالب" : "المعلم"}.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    onClick={closeAccountCard}
                    aria-label="إغلاق"
                  >
                    <CircleOff size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
                <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]">
                  استخدم زر الطباعة لتسليم بيانات الدخول مباشرة للطالب/المدرس، أو انسخ البيانات يدويًا عند الحاجة.
                </div>

                <div className="flex justify-center">
                  <div className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
                    <SchoolLogo
                      src={accountCard.school_logo_url}
                      alt="شعار المدرسة"
                      label={accountCard.school_name}
                      size={56}
                      className="rounded-[18px] border border-[var(--border)] bg-white"
                    />
                    <div className="text-right">
                      <div className="text-sm font-black text-[var(--text-secondary)]">المدرسة</div>
                      <div className="text-lg font-black text-[var(--text-primary)]">{accountCard.school_name}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                    <div className="text-sm font-black text-[var(--text-secondary)]">الاسم الكامل</div>
                    <div className="mt-2 text-xl font-black text-[var(--text-primary)]">{accountCard.full_name}</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {accountCard.role === "student" ? "حساب طالب" : "حساب مدرس"}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                    <div className="text-sm font-black text-[var(--text-secondary)]">الصف والشعبة</div>
                    <div className="mt-2 text-xl font-black text-[var(--text-primary)]">
                      {accountCard.class_name || "—"}
                    </div>
                    <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {accountCard.section ? `الشعبة ${accountCard.section}` : "كل الشعب أو غير محددة"}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                    <div className="text-sm font-black text-[var(--text-secondary)]">معرّف الدخول</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]" dir="ltr">
                      {accountCard.login_identifier}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                    <div className="text-sm font-black text-[var(--text-secondary)]">كلمة المرور المؤقتة</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]" dir="ltr">
                      {accountCard.temporary_password}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <div className="mb-3 inline-flex items-center gap-2 text-base font-black text-[var(--text-primary)]">
                    <BookOpen size={16} />
                    تعليمات تسجيل الدخول
                  </div>
                  <ol className="space-y-2 pr-5 text-sm leading-8 text-[var(--text-secondary)]">
                    {accountCard.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    className="ui-button ui-button--secondary inline-flex items-center gap-2"
                    onClick={() => void handleCopyCredentials()}
                  >
                    <Copy size={16} />
                    نسخ البيانات
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--primary inline-flex items-center gap-2"
                    onClick={() => openPrintableWindow(accountCard, true)}
                  >
                    <Printer size={16} />
                    طباعة بطاقة الدخول
                  </button>
                  <button type="button" className="ui-button ui-button--secondary" onClick={closeAccountCard}>
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
