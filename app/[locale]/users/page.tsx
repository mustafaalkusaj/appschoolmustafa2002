"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleOff,
  Copy,
  Filter,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { supabase } from "@/lib/supabase";
import {
  type ManagedTeacherAssignmentInput,
  MANAGED_USER_ROLE_LABELS,
  validateCreateManagedUserInput,
  validateUpdateManagedUserInput,
  type ManagedUserAccountCard,
  type ManagedUserRecord,
  type ManagedUserRole,
} from "@/lib/managed-users";

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
    address: string;
    total_fee: string;
    paid_fee: string;
    discount_value: string;
  };
  teacher: {
    specialization: string;
    notes: string;
    assignments: TeacherAssignmentFormState[];
  };
};

function createEmptyTeacherAssignment(): TeacherAssignmentFormState {
  return {
    subject_name: "",
    class_name: "",
    section: "",
  };
}

function createEmptyForm(role: ManagedUserRole = "student"): UserFormState {
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
      address: "",
      total_fee: "0",
      paid_fee: "0",
      discount_value: "0",
    },
    teacher: {
      specialization: "",
      notes: "",
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
      address: user.student?.address ?? "",
      total_fee: String(user.student?.total_fee ?? 0),
      paid_fee: String(user.student?.paid_fee ?? 0),
      discount_value: String(user.student?.discount_value ?? 0),
    },
    teacher: {
      specialization: user.teacher?.specialization ?? "",
      notes: user.teacher?.notes ?? "",
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
            address: form.student.address,
            total_fee: form.student.total_fee,
            paid_fee: form.student.paid_fee,
            discount_value: form.student.discount_value,
          }
        : null,
    teacher:
      form.role === "teacher"
        ? {
            specialization: form.teacher.specialization,
            notes: form.teacher.notes,
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

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildPrintableCardHtml(card: ManagedUserAccountCard, autoPrint = true) {
  const instructions = card.instructions.map((instruction) => `<li>${instruction}</li>`).join("");
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const roleLabel = card.role === "student" ? "الطالب" : "المدرس";

  return `
    <html dir="rtl">
      <head>
        <title>بطاقة حساب التطبيق</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background: #eef4fb;
            font-family: "Segoe UI", Tahoma, sans-serif;
            color: #112338;
          }
          .card {
            max-width: 760px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid rgba(15, 91, 141, 0.14);
            border-radius: 28px;
            padding: 28px;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.10);
          }
          .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 24px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .brand img {
            width: 56px;
            height: 56px;
            object-fit: contain;
            border-radius: 16px;
            border: 1px solid rgba(15, 91, 141, 0.14);
          }
          .brand h1 {
            margin: 0;
            font-size: 24px;
          }
          .brand p,
          .hint,
          .meta {
            margin: 4px 0 0;
            color: #547086;
            line-height: 1.7;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .meta-card,
          .credentials,
          .instructions {
            border-radius: 20px;
            border: 1px solid rgba(15, 91, 141, 0.12);
            background: #f8fbff;
            padding: 18px;
          }
          .label {
            font-size: 13px;
            color: #6b8194;
            margin-bottom: 6px;
          }
          .value {
            font-size: 18px;
            font-weight: 800;
          }
          .credentials .value {
            direction: ltr;
            text-align: left;
          }
          ol {
            margin: 0;
            padding-inline-start: 22px;
          }
          li {
            line-height: 1.9;
          }
          .footer {
            margin-top: 18px;
            font-size: 12px;
            color: #6b8194;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .card {
              box-shadow: none;
              border: none;
              border-radius: 0;
              max-width: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="top">
            <div class="brand">
              ${card.school_logo_url ? `<img src="${card.school_logo_url}" alt="شعار المدرسة" />` : ""}
              <div>
                <h1>${card.school_name}</h1>
                <p>بطاقة بيانات دخول ${roleLabel}</p>
              </div>
            </div>
            <div class="hint">تم التوليد: ${formatDateLabel(card.generated_at)}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="label">الاسم الكامل</div>
              <div class="value">${card.full_name}</div>
              <div class="meta">${card.role === "student" ? "حساب طالب" : "حساب مدرس"}</div>
            </div>
            <div class="meta-card">
              <div class="label">الصف والشعبة</div>
              <div class="value">${classLine || "—"}</div>
              <div class="meta">${card.role === "student" ? "يظهر للطلاب فقط" : "حسب التكليفات المسندة"}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="credentials">
              <div class="label">معرّف الدخول</div>
              <div class="value">${card.login_identifier}</div>
            </div>
            <div class="credentials">
              <div class="label">كلمة المرور المؤقتة</div>
              <div class="value">${card.temporary_password}</div>
            </div>
          </div>

          <div class="instructions">
            <div class="label">إرشادات الدخول</div>
            <ol>${instructions}</ol>
          </div>

          <div class="footer">يمكن حفظ هذه البطاقة كملف PDF من نافذة الطباعة عند الحاجة.</div>
        </div>
        ${autoPrint ? "<script>window.print();</script>" : ""}
      </body>
    </html>
  `;
}

export default function UsersManagementPage() {
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
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ManagedUserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUserRecord | null>(null);
  const [accountCard, setAccountCard] = useState<ManagedUserAccountCard | null>(null);
  const [form, setForm] = useState<UserFormState>(() => createEmptyForm());

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const fetchOptions = useCallback(async () => {
    if (!currentSchoolId) {
      setClasses([]);
      setSections([]);
      setSubjects([]);
      return;
    }

    const [classesResult, sectionsResult, subjectsResult] = await Promise.all([
      supabase.from("classes").select("*").eq("school_id", currentSchoolId).order("created_at", { ascending: true }),
      supabase
        .from("sections")
        .select("*")
        .eq("school_id", currentSchoolId)
        .order("created_at", { ascending: true }),
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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/dashboard/users?schoolId=${encodeURIComponent(currentSchoolId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر تحميل الحسابات."));
      }

      setUsers(Array.isArray(payload?.users) ? (payload.users as ManagedUserRecord[]) : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل الحسابات.");
    } finally {
      setLoading(false);
    }
  }, [currentSchoolId, profile]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchUsers();
    void fetchOptions();
  }, [fetchOptions, fetchUsers, profile, schoolScope.scopeLoading]);

  const stats = useMemo(() => {
    const activeCount = users.filter((user) => user.is_active).length;
    return [
      {
        label: "إجمالي الحسابات",
        value: users.length,
        hint: "جميع الحسابات المرتبطة بالمدرسة الحالية",
      },
      {
        label: "حسابات الطلاب",
        value: users.filter((user) => user.role === "student").length,
        hint: "الطلاب الذين لديهم بيانات دخول حقيقية",
      },
      {
        label: "حسابات المدرسين",
        value: users.filter((user) => user.role === "teacher").length,
        hint: "المدرسون المرتبطون بحسابات النظام",
      },
      {
        label: "الحسابات النشطة",
        value: activeCount,
        hint: `${users.length - activeCount} حساب غير نشط حالياً`,
      },
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter === "active" && !user.is_active) return false;
      if (statusFilter === "inactive" && user.is_active) return false;
      if (!deferredQuery) return true;

      const searchPool = [
        user.full_name,
        user.email,
        user.phone,
        user.student?.class_name,
        user.student?.section,
        user.teacher?.specialization,
        ...(user.teacher?.assignments.flatMap((assignment) => [
          assignment.subject_name,
          assignment.class_name,
          assignment.section_name,
        ]) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchPool.includes(deferredQuery);
    });
  }, [deferredQuery, roleFilter, statusFilter, users]);

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

  function getSectionsForClass(className: string) {
    const classRow = classes.find((item) => item.name === className);
    return classRow ? sectionOptionsByClass.get(classRow.id) ?? [] : [];
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function resetForm(nextRole: ManagedUserRole = "student") {
    setFieldErrors({});
    setForm(createEmptyForm(nextRole));
  }

  function openCreateModal() {
    clearMessages();
    setEditingUser(null);
    resetForm("student");
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

  function updateTeacherAssignment(index: number, key: keyof TeacherAssignmentFormState, value: string) {
    setForm((current) => ({
      ...current,
      teacher: {
        ...current.teacher,
        assignments: current.teacher.assignments.map((assignment, assignmentIndex) =>
          assignmentIndex === index
            ? {
                ...assignment,
                [key]: key === "section" ? value : value,
                ...(key === "class_name" ? { section: "" } : {}),
              }
            : assignment,
        ),
      },
    }));
  }

  function addTeacherAssignmentRow() {
    setForm((current) => ({
      ...current,
      teacher: {
        ...current.teacher,
        assignments: [...current.teacher.assignments, createEmptyTeacherAssignment()],
      },
    }));
  }

  function removeTeacherAssignmentRow(index: number) {
    setForm((current) => {
      const nextAssignments = current.teacher.assignments.filter((_, assignmentIndex) => assignmentIndex !== index);
      return {
        ...current,
        teacher: {
          ...current.teacher,
          assignments: nextAssignments.length > 0 ? nextAssignments : [createEmptyTeacherAssignment()],
        },
      };
    });
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

  async function openAccountCardForUser(user: ManagedUserRecord) {
    if (!currentSchoolId) {
      setError("يجب تحديد مدرسة قبل عرض بطاقة الحساب.");
      return;
    }

    clearMessages();
    setCardLoadingId(user.auth_user_id);

    try {
      const response = await fetch(
        `/api/dashboard/users/${user.auth_user_id}/card?schoolId=${encodeURIComponent(currentSchoolId)}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readApiError(payload, "تعذر تحميل بطاقة الحساب."));
      }

      setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
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
      const response = await fetch(`/api/dashboard/users/${user.auth_user_id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(
        editingUser ? `/api/dashboard/users/${editingUser.auth_user_id}` : "/api/dashboard/users",
        {
          method: editingUser ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
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

      const createdStudent = !editingUser && payload.role === "student";
      setSuccess(
        editingUser
          ? "تم تحديث الحساب بنجاح."
          : createdStudent
            ? "تم إنشاء حساب الطالب بنجاح وفتح بطاقة الدخول مباشرة."
            : "تم إنشاء حساب المدرس بنجاح.",
      );
      if (createdStudent && result?.accountCard) {
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
      const response = await fetch(`/api/dashboard/users/${user.auth_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  const showingModal = showCreateModal || Boolean(editingUser);

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="layout" dir="rtl">
        <AppSidebar currentPath="/users" />

        <div className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">إدارة حسابات الطلاب والمدرسين</div>
              <div className="topbar-sub">إنشاء الحسابات وتعديلها من لوحة المدرسة فقط بدون تسجيل مفتوح</div>
            </div>

            <button type="button" className="ui-button ui-button--primary inline-flex items-center gap-2" onClick={openCreateModal}>
              <Plus size={16} />
              إنشاء حساب
            </button>
          </div>

          <div className="content space-y-5">
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

            <SchoolScopeBanner scope={schoolScope} />

            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState
                scope={schoolScope}
                title="إدارة المستخدمين"
                description="يجب اختيار مدرسة صريحة أولاً قبل إنشاء أو تعديل حسابات الطلاب والمدرسين."
              />
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stats.map((item) => (
                    <article key={item.label} className="ui-surface rounded-[28px] p-5">
                      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
                        <Users size={20} />
                      </div>
                      <p className="text-sm font-black text-[var(--text-secondary)]">{item.label}</p>
                      <div className="mt-2 text-3xl font-black text-[var(--text-primary)]">{item.value}</div>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{item.hint}</p>
                    </article>
                  ))}
                </section>

                <section className="ui-surface rounded-[30px] p-5">
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-[var(--text-primary)]">صفحة إدارة المستخدمين</h2>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                        جميع الحسابات هنا مربوطة مباشرةً بـ Supabase Auth وسجلات الطلاب أو المدرسين داخل قاعدة البيانات.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => void fetchUsers()}>
                        <Loader2 size={16} className={loading ? "animate-spin" : ""} />
                        تحديث
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_220px]">
                    <label className="relative block">
                      <Search
                        size={18}
                        className="pointer-events-none absolute top-1/2 text-[var(--text-tertiary)]"
                        style={{ insetInlineStart: "1rem", transform: "translateY(-50%)" }}
                      />
                      <input
                        type="search"
                        className="ui-input"
                        style={{ paddingInlineStart: "3rem" }}
                        placeholder="ابحث بالاسم أو البريد أو الصف أو التخصص"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
                        <Filter size={16} />
                        الدور
                      </span>
                      <select className="ui-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | ManagedUserRole)}>
                        <option value="all">كل الأدوار</option>
                        <option value="student">الطلاب</option>
                        <option value="teacher">المدرسون</option>
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

                  <div className="mt-5 overflow-x-auto rounded-[24px] border border-[var(--border)]">
                    <table className="ui-table min-w-[1160px]">
                      <thead>
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
                                  أنشئ أول حساب طالب أو مدرس، أو عدّل الفلاتر الحالية لعرض نتائج أكثر.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => (
                            <tr key={user.auth_user_id}>
                              <td>
                                <div className="space-y-1">
                                  <div className="font-black text-[var(--text-primary)]">{user.full_name}</div>
                                  <div className="text-sm text-[var(--text-secondary)]" dir="ltr">
                                    {user.email}
                                  </div>
                                  <div className="text-sm text-[var(--text-secondary)]">{user.phone || "بدون رقم هاتف"}</div>
                                </div>
                              </td>
                              <td>
                                <span className="ui-pill">{MANAGED_USER_ROLE_LABELS[user.role]}</span>
                              </td>
                              <td>
                                {user.role === "student" ? (
                                  <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    <div>الصف: {user.student?.class_name || "غير محدد"}</div>
                                    <div>الشعبة: {user.student?.section || "غير محددة"}</div>
                                  </div>
                                ) : (
                                  <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    <div>التخصص: {user.teacher?.specialization || "غير محدد"}</div>
                                    <div>عدد التكليفات: {user.teacher?.assignments.length ?? 0}</div>
                                    {user.teacher?.assignments.slice(0, 2).map((assignment) => (
                                      <div key={assignment.id || `${assignment.subject_name}-${assignment.class_name}-${assignment.section_name ?? "*"}`}>
                                        {assignment.subject_name} • {assignment.class_name}
                                        {assignment.section_name ? ` • ${assignment.section_name}` : " • كل الشعب"}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                                  <div>
                                    معرّف الدخول:{" "}
                                    <span dir="ltr" className="font-bold text-[var(--text-primary)]">
                                      {user.app_account?.login_identifier || user.email}
                                    </span>
                                  </div>
                                  <div>
                                    كلمة المرور المؤقتة:{" "}
                                    {user.app_account?.has_temporary_password ? "جاهزة للطباعة" : "تحتاج إعادة تعيين"}
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
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm"
                                    onClick={() => openEditModal(user)}
                                  >
                                    <PencilLine size={15} />
                                    تعديل
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm"
                                    onClick={() => void openAccountCardForUser(user)}
                                    disabled={cardLoadingId === user.auth_user_id}
                                  >
                                    {cardLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                                    إعادة الطباعة
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm"
                                    onClick={() => void handleResetTemporaryPassword(user)}
                                    disabled={cardLoadingId === user.auth_user_id}
                                  >
                                    {cardLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                                    إعادة ضبط المؤقتة
                                  </button>
                                  <button
                                    type="button"
                                    className={`ui-button inline-flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm ${
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
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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
            <div className="ui-dialog w-full max-w-[860px] overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-[var(--text-primary)]">
                    {editingUser ? "تعديل بيانات الحساب" : "إنشاء حساب جديد"}
                  </h2>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    {editingUser
                      ? "يتم تعديل بيانات Supabase Auth والملف التعريفي والسجل المرتبط في عملية واحدة."
                      : "يتم إنشاء مستخدم مصادقة حقيقي ثم ملف تعريفي وسجل طالب أو مدرس مرتبط به مع بطاقة دخول قابلة للطباعة."}
                  </p>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">نوع الحساب</span>
                    <select
                      className={inputClass(Boolean(fieldErrors.role))}
                      value={form.role}
                      disabled={Boolean(editingUser)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...createEmptyForm(event.target.value as ManagedUserRole),
                          full_name: current.full_name,
                          email: current.email,
                          phone: current.phone,
                          is_active: current.is_active,
                        }))
                      }
                    >
                      <option value="student">طالب</option>
                      <option value="teacher">مدرس</option>
                    </select>
                    <FieldError message={fieldErrors.role} />
                  </label>

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
                    <div className="rounded-[20px] border border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.08)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">
                      <div className="mb-1 flex items-center gap-2 font-black text-[var(--text-primary)]">
                        <Sparkles size={16} />
                        توليد تلقائي لبيانات التطبيق
                      </div>
                      سيتم إنشاء مستخدم Supabase Auth حقيقي ومعرّف دخول وكلمة مرور مؤقتة آمنة تلقائياً، ثم عرض بطاقة حساب قابلة للطباعة فور الحفظ.
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">
                      تغيير الدور أو كلمة المرور غير مشمول هنا. استخدم زر "إعادة ضبط المؤقتة" من الجدول لإصدار كلمة مرور جديدة وفتح بطاقة الحساب مباشرة.
                    </div>
                  )}
                </div>

                {form.role === "student" ? (
                  <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات سجل الطالب</h3>
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

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">العنوان</span>
                        <input
                          className={inputClass(Boolean(fieldErrors["student.address"]))}
                          value={form.student.address}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, address: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["student.address"]} />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">إجمالي الرسوم</span>
                        <input
                          type="number"
                          min="0"
                          className={inputClass(Boolean(fieldErrors["student.total_fee"]))}
                          value={form.student.total_fee}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, total_fee: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["student.total_fee"]} />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">المدفوع</span>
                        <input
                          type="number"
                          min="0"
                          className={inputClass(Boolean(fieldErrors["student.paid_fee"]))}
                          value={form.student.paid_fee}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, paid_fee: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["student.paid_fee"]} />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">قيمة الخصم</span>
                        <input
                          type="number"
                          min="0"
                          className={inputClass(Boolean(fieldErrors["student.discount_value"]))}
                          value={form.student.discount_value}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              student: { ...current.student, discount_value: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["student.discount_value"]} />
                      </label>
                    </div>
                  </section>
                ) : (
                  <section className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <h3 className="text-lg font-black text-[var(--text-primary)]">بيانات سجل المدرس</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">التخصص</span>
                        <input
                          className={inputClass(Boolean(fieldErrors["teacher.specialization"]))}
                          value={form.teacher.specialization}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              teacher: { ...current.teacher, specialization: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["teacher.specialization"]} />
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">ملاحظات</span>
                        <textarea
                          className={`${inputClass(Boolean(fieldErrors["teacher.notes"]))} min-h-[132px] resize-y`}
                          value={form.teacher.notes}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              teacher: { ...current.teacher, notes: event.target.value },
                            }))
                          }
                        />
                        <FieldError message={fieldErrors["teacher.notes"]} />
                      </label>
                    </div>

                    <div className="space-y-3 rounded-[20px] border border-[rgba(15,91,141,0.1)] bg-white/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-black text-[var(--text-primary)]">تكليفات المعلم</div>
                          <p className="text-sm leading-7 text-[var(--text-secondary)]">
                            كل صف هنا يمثل مادة + صف + شعبة مسموح لهذا المعلم العمل عليها داخل التطبيق.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2"
                          onClick={addTeacherAssignmentRow}
                        >
                          <Plus size={15} />
                          إضافة تكليف
                        </button>
                      </div>

                      <FieldError message={fieldErrors["teacher.assignments"]} />

                      {form.teacher.assignments.map((assignment, index) => {
                        const assignmentSections = getSectionsForClass(assignment.class_name);

                        return (
                          <div
                            key={`${assignment.subject_name}-${assignment.class_name}-${assignment.section}-${index}`}
                            className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                          >
                            <label className="space-y-2">
                              <span className="text-sm font-black text-[var(--text-primary)]">المادة</span>
                              <input
                                list="subjects-list"
                                className={inputClass(Boolean(fieldErrors[`teacher.assignments.${index}.subject_name`]))}
                                value={assignment.subject_name}
                                onChange={(event) => updateTeacherAssignment(index, "subject_name", event.target.value)}
                              />
                              <FieldError message={fieldErrors[`teacher.assignments.${index}.subject_name`]} />
                            </label>

                            <label className="space-y-2">
                              <span className="text-sm font-black text-[var(--text-primary)]">الصف</span>
                              <select
                                className={inputClass(Boolean(fieldErrors[`teacher.assignments.${index}.class_name`]))}
                                value={assignment.class_name}
                                onChange={(event) => updateTeacherAssignment(index, "class_name", event.target.value)}
                              >
                                <option value="">اختر الصف</option>
                                {classes.map((classOption) => (
                                  <option key={classOption.id} value={classOption.name}>
                                    {classOption.name}
                                  </option>
                                ))}
                              </select>
                              <FieldError message={fieldErrors[`teacher.assignments.${index}.class_name`]} />
                            </label>

                            <label className="space-y-2">
                              <span className="text-sm font-black text-[var(--text-primary)]">الشعبة</span>
                              <select
                                className={inputClass()}
                                value={assignment.section ?? ""}
                                onChange={(event) => updateTeacherAssignment(index, "section", event.target.value)}
                              >
                                <option value="">كل الشعب</option>
                                {assignmentSections.map((sectionOption) => (
                                  <option key={sectionOption.id} value={sectionOption.name}>
                                    {sectionOption.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="flex items-end">
                              <button
                                type="button"
                                className="ui-button ui-button--danger"
                                onClick={() => removeTeacherAssignmentRow(index)}
                                disabled={form.teacher.assignments.length === 1}
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}

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
                    <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(79,140,255,0.12)] px-3 py-1 text-sm font-black text-[var(--primary)]">
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
                {accountCard.school_logo_url ? (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={accountCard.school_logo_url}
                        alt="شعار المدرسة"
                        className="h-14 w-14 rounded-[18px] border border-[var(--border)] object-contain bg-white p-2"
                      />
                      <div className="text-right">
                        <div className="text-sm font-black text-[var(--text-secondary)]">المدرسة</div>
                        <div className="text-lg font-black text-[var(--text-primary)]">{accountCard.school_name}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

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

                  <div className="rounded-[24px] border border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.08)] p-5">
                    <div className="text-sm font-black text-[var(--text-secondary)]">معرّف الدخول</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]" dir="ltr">
                      {accountCard.login_identifier}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[rgba(198,132,40,0.18)] bg-[rgba(198,132,40,0.08)] p-5">
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
                    className="ui-button ui-button--secondary inline-flex items-center gap-2"
                    onClick={() => openPrintableWindow(accountCard, true)}
                  >
                    <Printer size={16} />
                    طباعة
                  </button>
                  <button type="button" className="ui-button ui-button--primary" onClick={closeAccountCard}>
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
