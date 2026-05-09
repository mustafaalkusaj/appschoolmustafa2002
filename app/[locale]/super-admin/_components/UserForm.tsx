"use client";

import { ModalFrame } from "./ui";
import { cx } from "./utils";
import type { BranchOptionRecord, UserRecord } from "./types";
import type { Permission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/auth";
import { getPathForPageCode, PAGE_PATHS, type PageCode } from "@/lib/authorization/page-access";
import { findJobTitlePresetById, JOB_TITLE_PRESETS } from "@/lib/users/job-title-presets";
import { PERMISSION_GROUPS } from "@/types/roles";
import { isRoleAllowedForPath } from "@/types/roles";
import { buildTemplatePermissions } from "@/types/roles";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { ShieldCheck, Building2, GitBranch, ChevronDown, ChevronUp, Crown, Shield, Users } from "@/lib/icons";

interface UserFormData {
  preset_id: string;
  full_name: string;
  job_title: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  school_id: string;
  branch_id: string;
  phone: string;
  is_active: boolean;
  password: string;
  permissions: Permission[];
  scope_level: "super_admin" | "group_admin" | "branch_user" | "restricted";
  is_single_page_user: boolean;
  allowed_pages: PageCode[];
  permissions_version: number;
}

interface UserFormProps {
  isOpen: boolean;
  editUser: UserRecord | null;
  schools: { id: string; name: string }[];
  branches: BranchOptionRecord[];
  infrastructure: AdminInfrastructure;
  onClose: () => void;
  onSave: (data: UserFormData, editUser: UserRecord | null) => Promise<void>;
}

const PAGE_LABELS: Record<PageCode, string> = {
  dashboard: "لوحة التحكم",
  students: "الطلاب",
  teachers: "الأساتذة",
  attendance: "الحضور",
  payments: "الحسابات",
  expenses: "المصروفات",
  salaries: "الرواتب",
  reports: "التقارير",
  monitoring: "المراقبة",
  "fee-notifications": "تنبيهات الأقساط",
  group: "لوحة المجموعة",
  "branch-overview": "لوحة الفرع",
  schools: "المدارس",
  subscriptions: "الاشتراكات",
  "super-admin": "الإدارة العامة",
};

const FOCUSED_PAGE_CODES = (Object.keys(PAGE_PATHS) as PageCode[]).filter(
  (pageCode) =>
    pageCode !== "dashboard" &&
    pageCode !== "group" &&
    pageCode !== "schools" &&
    pageCode !== "subscriptions" &&
    pageCode !== "super-admin",
);

function createInitialFormState(): UserFormData {
  return {
    preset_id: "",
    full_name: "",
    job_title: "",
    email: "",
    role: "employee",
    school_id: "",
    branch_id: "",
    phone: "",
    is_active: true,
    password: "",
    permissions: [],
    scope_level: "group_admin",
    is_single_page_user: false,
    allowed_pages: [],
    permissions_version: 1,
  };
}

// ─── Role card definitions ──────────────────────────────────────────────────
const ROLE_CARDS: {
  role: "admin" | "employee" | "super_admin";
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  {
    role: "admin",
    label: "مدير المدرسة",
    description: "صلاحية كاملة على مستوى المدرسة",
    Icon: Shield,
  },
  {
    role: "employee",
    label: "موظف",
    description: "صلاحيات محدودة حسب التخصيص",
    Icon: Users,
  },
  {
    role: "super_admin",
    label: "مدير عام",
    description: "صلاحية كاملة على المنصة",
    Icon: Crown,
  },
];

// ─── Scope card definitions ──────────────────────────────────────────────────
const SCOPE_CARDS: {
  value: "group_admin" | "branch_user";
  label: string;
  sub: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  {
    value: "group_admin",
    label: "على مستوى المدرسة",
    sub: "يرى كل بيانات المدرسة",
    Icon: ShieldCheck,
  },
  {
    value: "branch_user",
    label: "فرع واحد فقط",
    sub: "مقيّد بفرع محدد",
    Icon: GitBranch,
  },
];

export function UserForm({ isOpen, editUser, schools, branches, infrastructure, onClose, onSave }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(createInitialFormState());
  const [saving, setSaving] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const availableBranches = useMemo(
    () => branches.filter((branch) => !formData.school_id || branch.school_id === formData.school_id),
    [branches, formData.school_id],
  );

  const availableAssignablePages = useMemo(
    () =>
      FOCUSED_PAGE_CODES.filter((pageCode) => {
        const pagePath = getPathForPageCode(pageCode);
        if (!pagePath) {
          return false;
        }
        return isRoleAllowedForPath(formData.role, pagePath);
      }),
    [formData.role],
  );

  const roleTemplatePermissions = useMemo(() => buildTemplatePermissions(formData.role), [formData.role]);

  useEffect(() => {
    if (isOpen) {
      if (editUser) {
        setFormData({
          preset_id: "",
          full_name: editUser.full_name ?? "",
          job_title: editUser.job_title ?? "",
          email: editUser.email ?? "",
          role: editUser.role,
          school_id: editUser.school_id ?? "",
          branch_id: editUser.branch_id ?? editUser.default_branch_id ?? "",
          phone: editUser.phone ?? "",
          is_active: editUser.is_active,
          password: "",
          permissions: editUser.custom_permissions ?? [],
          scope_level:
            editUser.role === "super_admin"
              ? "super_admin"
              : editUser.scope_level === "branch_user" ||
                  (editUser.scope_level === "restricted" && Boolean(editUser.branch_id ?? editUser.default_branch_id))
                ? "branch_user"
                : "group_admin",
          is_single_page_user:
            editUser.is_single_page_user || (Array.isArray(editUser.allowed_pages) && editUser.allowed_pages.length === 1),
          allowed_pages: Array.isArray(editUser.allowed_pages) ? (editUser.allowed_pages as PageCode[]) : [],
          permissions_version: editUser.permissions_version ?? 1,
        });
      } else {
        setFormData(createInitialFormState());
      }
    }
  }, [isOpen, editUser]);

  useEffect(() => {
      const allowedPageSet = new Set<PageCode>(availableAssignablePages);
      setFormData((current) => {
        const nextAllowedPages = current.allowed_pages.filter((pageCode) => allowedPageSet.has(pageCode));
        const shouldBeSinglePage = nextAllowedPages.length === 1;
        if (
          nextAllowedPages.length === current.allowed_pages.length &&
          shouldBeSinglePage === current.is_single_page_user
        ) {
          return current;
        }
        return {
          ...current,
          allowed_pages: nextAllowedPages,
          is_single_page_user: shouldBeSinglePage,
        };
      });
  }, [availableAssignablePages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData, editUser);
    } finally {
      setSaving(false);
    }
  };

  // ─── Role change handler ──────────────────────────────────────────────────
  const handleRoleChange = (nextRole: "super_admin" | "admin" | "employee") => {
    setFormData((current) => ({
      ...current,
      preset_id: nextRole === current.role ? current.preset_id : "",
      role: nextRole,
      school_id: nextRole === "super_admin" ? "" : current.school_id,
      branch_id: nextRole === "super_admin" ? "" : current.branch_id,
      scope_level:
        nextRole === "super_admin"
          ? "super_admin"
          : current.scope_level === "super_admin"
            ? "group_admin"
            : current.scope_level,
      is_single_page_user:
        nextRole === "super_admin" ? false : current.allowed_pages.length === 1,
      allowed_pages: nextRole === "super_admin" ? [] : current.allowed_pages,
    }));
  };

  // ─── Scope change handler ─────────────────────────────────────────────────
  const handleScopeChange = (nextScope: "group_admin" | "branch_user") => {
    setFormData((current) => {
      const nextAllowedPages =
        nextScope === "branch_user" && !current.allowed_pages.includes("branch-overview")
          ? (["branch-overview", ...current.allowed_pages] as UserFormData["allowed_pages"])
          : current.allowed_pages;
      return {
        ...current,
        scope_level: nextScope,
        branch_id: nextScope === "branch_user" ? current.branch_id : "",
        is_single_page_user: nextAllowedPages.length === 1,
        allowed_pages: nextAllowedPages,
      };
    });
  };

  if (!isOpen) return null;

  // ─── Live summary values ──────────────────────────────────────────────────
  const summaryScope = (() => {
    if (formData.role === "super_admin") return "المنصة بالكامل";
    if (formData.scope_level === "branch_user") {
      const branch = availableBranches.find((b) => b.id === formData.branch_id);
      return branch ? `فرع: ${branch.name}` : "فرع واحد";
    }
    return "كل المدرسة";
  })();

  const summaryPages =
    formData.allowed_pages.length === 0
      ? "صفحات الدور الافتراضية"
      : `${formData.allowed_pages.length} صفحات محددة`;

  const summaryPermissions =
    formData.permissions.length === 0
      ? "افتراضية"
      : `${formData.permissions.length} مخصصة`;

  return (
    <ModalFrame
      title={editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
      subtitle="حدّد ما إذا كان المستخدم على مستوى المدرسة، على مستوى فرع واحد، أو مقيّداً إلى صفحة أو صفحات محددة فقط."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 1 — المعلومات الأساسية
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            المعلومات الأساسية
          </h3>

          <div className="space-y-4">
            {/* Preset selector — full width */}
            <div>
              <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">قالب جاهز</label>
              <select
                className="ui-input"
                value={formData.preset_id}
                onChange={(e) => {
                  const nextPresetId = e.target.value;
                  const preset = findJobTitlePresetById(nextPresetId);

                  if (!preset) {
                    setFormData((current) => ({
                      ...current,
                      preset_id: "",
                    }));
                    return;
                  }

                  setFormData((current) => ({
                    ...current,
                    preset_id: preset.id,
                    job_title: preset.jobTitle,
                    role: preset.role,
                    permissions: [...preset.permissions],
                    allowed_pages: [...preset.allowedPages],
                    is_single_page_user: preset.allowedPages.length === 1,
                  }));
                }}
              >
                <option value="">بدون قالب جاهز</option>
                {JOB_TITLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs font-bold text-[var(--text-tertiary)]">
                يملأ القالب المسمى الوظيفي والدور والصلاحيات والصفحات المقترحة، ويمكنك تعديلها يدويًا.
              </p>
              {formData.preset_id ? (
                <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]">
                  {findJobTitlePresetById(formData.preset_id)?.description}
                </div>
              ) : null}
            </div>

            {/* Full name + Job title — side by side */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الاسم الكامل</label>
                <input
                  className="ui-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المسمى الوظيفي</label>
                <input
                  className="ui-input"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="مثال: محاسب، مسؤول حضور"
                />
              </div>
            </div>

            {/* Email + Password — side by side */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">البريد الإلكتروني</label>
                <input
                  className="ui-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={Boolean(editUser)}
                />
              </div>
              {!editUser ? (
                <div>
                  <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">كلمة المرور</label>
                  <input
                    className="ui-input"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="أدخل كلمة مرور المستخدم الجديد"
                  />
                </div>
              ) : null}
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
              <div>
                <div className="text-sm font-black text-[var(--text-primary)]">حالة الحساب</div>
                <div className="text-xs font-bold text-[var(--text-tertiary)]">
                  {formData.is_active ? "الحساب نشط ويمكن تسجيل الدخول" : "الحساب موقوف مؤقتًا"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  formData.is_active ? "bg-[var(--brand)]" : "bg-[var(--surface-strong)] border border-[var(--border)]",
                )}
                role="switch"
                aria-checked={formData.is_active}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out",
                    formData.is_active ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 2 — نطاق الوصول
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            نطاق الوصول
          </h3>

          <div className="space-y-5">
            {/* 1. الدور — 3 visual role cards */}
            <div>
              <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الدور</label>
              <div className="grid gap-3 md:grid-cols-3">
                {ROLE_CARDS.map(({ role, label, description, Icon }) => {
                  const selected = formData.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={cn(
                        "flex flex-col items-start gap-1.5 rounded-[18px] border px-4 py-3 text-right transition",
                        selected
                          ? "border-[rgba(79,140,255,0.5)] bg-[rgba(79,140,255,0.08)]"
                          : "border-[var(--border)] bg-[var(--surface-strong)] hover:border-[rgba(79,140,255,0.3)] hover:bg-[rgba(79,140,255,0.04)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          selected ? "text-[var(--brand)]" : "text-[var(--text-tertiary)]",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-black",
                          selected ? "text-[var(--brand)]" : "text-[var(--text-primary)]",
                        )}
                      >
                        {label}
                      </span>
                      <span className="text-xs font-bold leading-snug text-[var(--text-tertiary)]">
                        {description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. المدرسة — hidden for super_admin */}
            {formData.role !== "super_admin" ? (
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المدرسة</label>
                <div className="relative">
                  <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <select
                    className="ui-input pr-9"
                    value={formData.school_id}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        school_id: e.target.value,
                        branch_id: "",
                      }))
                    }
                  >
                    <option value="">اختر المدرسة</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm font-bold text-[var(--text-tertiary)]">كل المدارس — المدير العام لا يقتصر على مدرسة واحدة</span>
                </div>
              </div>
            )}

            {/* 3. النطاق — 2 radio-style cards (hidden for super_admin) */}
            {formData.role !== "super_admin" ? (
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">النطاق</label>
                <div className="grid gap-3 md:grid-cols-2">
                  {SCOPE_CARDS.map(({ value, label, sub, Icon }) => {
                    const selected = formData.scope_level === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleScopeChange(value)}
                        className={cn(
                          "flex items-center gap-3 rounded-[18px] border px-4 py-3 text-right transition",
                          selected
                            ? "border-[rgba(79,140,255,0.5)] bg-[rgba(79,140,255,0.08)]"
                            : "border-[var(--border)] bg-[var(--surface-strong)] hover:border-[rgba(79,140,255,0.3)] hover:bg-[rgba(79,140,255,0.04)]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            selected ? "text-[var(--brand)]" : "text-[var(--text-tertiary)]",
                          )}
                        />
                        <div className="flex flex-col items-start">
                          <span
                            className={cn(
                              "text-sm font-black",
                              selected ? "text-[var(--brand)]" : "text-[var(--text-primary)]",
                            )}
                          >
                            {label}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-tertiary)]">{sub}</span>
                        </div>
                        <span
                          className={cn(
                            "mr-auto h-4 w-4 shrink-0 rounded-full border-2 transition",
                            selected
                              ? "border-[var(--brand)] bg-[var(--brand)]"
                              : "border-[var(--border)] bg-transparent",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 4. الفرع — always visible when relevant */}
            {formData.role !== "super_admin" ? (
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الفرع</label>
                {formData.scope_level === "branch_user" ? (
                  <div className="relative">
                    <GitBranch className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <select
                      className="ui-input pr-9"
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    >
                      <option value="">اختر الفرع</option>
                      {availableBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 opacity-60">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-[var(--text-tertiary)]" />
                      <span className="text-sm font-bold text-[var(--text-tertiary)]">لا يقتصر على فرع واحد — النطاق على مستوى المدرسة</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 3 — الصفحات والصلاحيات
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">

          {/* 3a — الصفحات المسموحة (collapsible, open by default) */}
          {formData.role !== "super_admin" ? (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              {/* Header / toggle */}
              <button
                type="button"
                onClick={() => setPagesOpen((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[var(--text-primary)]">الصفحات المسموحة</h3>
                  {formData.allowed_pages.length > 0 ? (
                    <span className="rounded-full bg-[rgba(79,140,255,0.12)] px-2.5 py-0.5 text-xs font-black text-[var(--brand)]">
                      {formData.allowed_pages.length}
                    </span>
                  ) : null}
                </div>
                {pagesOpen ? (
                  <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                )}
              </button>

              {pagesOpen ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    إذا تركت هذا القسم فارغًا فسيعمل المستخدم وفق صفحات دوره المعتادة. إذا اخترت صفحة واحدة فقط فلن تظهر
                    القائمة الجانبية، وإذا اخترت صفحتين أو أكثر فستظهر قائمة جانبية مصغرة.
                  </p>

                  {/* Select all / Deselect all */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="ui-button ui-button--secondary"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          allowed_pages: [...availableAssignablePages],
                          is_single_page_user: availableAssignablePages.length === 1,
                        }))
                      }
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--secondary"
                      onClick={() =>
                        setFormData((current) => ({
                          ...current,
                          allowed_pages: [],
                          is_single_page_user: false,
                        }))
                      }
                    >
                      إلغاء الكل
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {availableAssignablePages.map((pageCode) => {
                      const checked = formData.allowed_pages.includes(pageCode);
                      return (
                        <label
                          key={pageCode}
                          className={cx(
                            "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-bold transition",
                            checked
                              ? "border-[rgba(79,140,255,0.22)] bg-[rgba(79,140,255,0.10)] text-[var(--text-primary)]"
                              : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)]",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextAllowedPages = e.target.checked
                                ? Array.from(new Set([...formData.allowed_pages, pageCode]))
                                : formData.allowed_pages.filter((item) => item !== pageCode);

                              if (e.target.checked) {
                                setFormData((current) => {
                                  const checkedPages = Array.from(new Set([...current.allowed_pages, pageCode]));
                                  return {
                                    ...current,
                                    allowed_pages: checkedPages,
                                    is_single_page_user: checkedPages.length === 1,
                                  };
                                });
                              } else {
                                setFormData((current) => ({
                                  ...current,
                                  allowed_pages: current.allowed_pages.filter((item) => item !== pageCode),
                                  is_single_page_user: nextAllowedPages.length === 1,
                                }));
                              }
                            }}
                          />
                          <span>{PAGE_LABELS[pageCode]}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="text-sm font-bold text-[var(--text-secondary)]">
                    {formData.allowed_pages.length === 0
                      ? "لا توجد صفحات مخصصة حاليًا، وسيستخدم هذا الحساب صفحات الدور الافتراضية."
                      : formData.allowed_pages.length === 1
                        ? "تم اختيار صفحة واحدة، وسيعمل هذا الحساب بدون قائمة جانبية."
                        : `${formData.allowed_pages.length} صفحات مخصصة، وستظهر قائمة جانبية تحتوي فقط على هذه الصفحات.`}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 3b — الصلاحيات التفصيلية (collapsible, closed by default — advanced) */}
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            {/* Header / toggle */}
            <button
              type="button"
              onClick={() => setPermissionsOpen((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[var(--text-primary)]">الصلاحيات التفصيلية</h3>
                <span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-0.5 text-xs font-black text-[var(--text-tertiary)]">
                  متقدم
                </span>
                {formData.permissions.length > 0 ? (
                  <span className="rounded-full bg-[rgba(79,140,255,0.12)] px-2.5 py-0.5 text-xs font-black text-[var(--brand)]">
                    {formData.permissions.length}
                  </span>
                ) : null}
              </div>
              {permissionsOpen ? (
                <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
              )}
            </button>

            {permissionsOpen ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {infrastructure.customPermissions
                    ? `يمكنك تعديل صلاحيات ${ROLE_LABELS[formData.role]} لهذا الحساب. عند ترك كل العناصر غير محددة سيتم اعتماد الصلاحيات الافتراضية للدور.`
                    : "تم تعطيل الحفظ المخصص للصلاحيات لأن عمود custom_permissions غير موجود بعد في user_profiles."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-button ui-button--secondary"
                    disabled={!infrastructure.customPermissions}
                    onClick={() => setFormData((current) => ({ ...current, permissions: [...roleTemplatePermissions] }))}
                  >
                    اعتماد صلاحيات الدور
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--secondary"
                    disabled={!infrastructure.customPermissions}
                    onClick={() => setFormData((current) => ({ ...current, permissions: [] }))}
                  >
                    إزالة التخصيصات
                  </button>
                  <div className="flex min-h-10 items-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-xs font-bold text-[var(--text-secondary)]">
                    الصلاحيات الافتراضية للدور: {roleTemplatePermissions.length}
                  </div>
                </div>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.title} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                      <div className="mb-3 text-sm font-black text-[var(--text-primary)]">{group.title}</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checked = formData.permissions.includes(permission.key);
                          return (
                            <label
                              key={permission.key}
                              className={cx(
                                "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-bold transition",
                                checked
                                  ? "border-[rgba(79,140,255,0.22)] bg-[rgba(79,140,255,0.10)] text-[var(--text-primary)]"
                                  : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!infrastructure.customPermissions}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, permissions: [...formData.permissions, permission.key] });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      permissions: formData.permissions.filter((item) => item !== permission.key),
                                    });
                                  }
                                }}
                              />
                              <span>{permission.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-sm font-bold text-[var(--text-secondary)]">
                  {formData.permissions.length === 0
                    ? "لا توجد صلاحيات مخصصة حالياً."
                    : `${formData.permissions.length} صلاحيات محددة لهذا المستخدم.`}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            Live Summary Badge
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
          <div className="mb-1.5 text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)]">
            ملخص الصلاحيات
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-tertiary)]">نطاق:</span>
              <span className="rounded-full bg-[rgba(79,140,255,0.10)] px-2.5 py-0.5 text-xs font-black text-[var(--brand)]">
                {summaryScope}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-tertiary)]">صفحات:</span>
              <span className="rounded-full bg-[rgba(79,140,255,0.10)] px-2.5 py-0.5 text-xs font-black text-[var(--brand)]">
                {summaryPages}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-tertiary)]">صلاحيات:</span>
              <span className="rounded-full bg-[rgba(79,140,255,0.10)] px-2.5 py-0.5 text-xs font-black text-[var(--brand)]">
                {summaryPermissions}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : editUser ? "حفظ التعديلات" : "إضافة المستخدم"}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export type { UserFormData };
export { createInitialFormState };
