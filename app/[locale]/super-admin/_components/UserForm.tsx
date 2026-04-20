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

export function UserForm({ isOpen, editUser, schools, branches, infrastructure, onClose, onSave }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(createInitialFormState());
  const [saving, setSaving] = useState(false);

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

  if (!isOpen) return null;

  return (
    <ModalFrame
      title={editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
      subtitle="حدّد ما إذا كان المستخدم على مستوى المدرسة، على مستوى فرع واحد، أو مقيّداً إلى صفحة أو صفحات محددة فقط."
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">قالب صلاحيات جاهز</label>
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
            <p className="mt-2 text-xs font-bold text-[var(--text-tertiary)]">
              يملأ القالب المسمى الوظيفي والدور والصلاحيات والصفحات المقترحة، ويمكنك تعديلها يدويًا قبل الحفظ.
            </p>
            {formData.preset_id ? (
              <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]">
                {findJobTitlePresetById(formData.preset_id)?.description}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الاسم الكامل</label>
            <input className="ui-input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المسمى الوظيفي</label>
            <input
              className="ui-input"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              placeholder="مثال: محاسب، مسؤول حضور، شؤون الطلاب"
            />
            <p className="mt-2 text-xs font-bold text-[var(--text-tertiary)]">
              هذا الحقل وصفي فقط ولا يغيّر الدور الأمني. الصلاحيات تبقى محكومة بالدور والصلاحيات المخصصة أدناه.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">البريد الإلكتروني</label>
            <input className="ui-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={Boolean(editUser)} />
          </div>

          {!editUser ? (
            <div className="md:col-span-2">
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

          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الدور</label>
            <select
              className="ui-input"
              value={formData.role}
              onChange={(e) => {
                const nextRole = e.target.value as "super_admin" | "admin" | "employee";
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
              }}
            >
              <option value="super_admin">{ROLE_LABELS.super_admin}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
              <option value="employee">{ROLE_LABELS.employee}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المدرسة</label>
            <select
              className="ui-input"
              value={formData.school_id}
              disabled={formData.role === "super_admin"}
              onChange={(e) =>
                setFormData((current) => ({
                  ...current,
                  school_id: e.target.value,
                  branch_id: "",
                }))
              }
            >
              <option value="">{formData.role === "super_admin" ? "كل المدارس (المدير العام)" : "اختر المدرسة"}</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">نطاق التشغيل</label>
            <select
              className="ui-input"
              value={formData.scope_level}
              disabled={formData.role === "super_admin"}
              onChange={(e) => {
                const nextScope = e.target.value as UserFormData["scope_level"];
                setFormData((current) => ({
                  ...current,
                  scope_level: nextScope,
                  branch_id: nextScope === "branch_user" ? current.branch_id : "",
                  is_single_page_user: current.allowed_pages.length === 1,
                }));
              }}
            >
              {formData.role === "super_admin" ? <option value="super_admin">صلاحية عامة للمنصة</option> : null}
              <option value="group_admin">على مستوى المدرسة</option>
              <option value="branch_user">على مستوى فرع واحد</option>
            </select>
          </div>

          {formData.role !== "super_admin" && formData.scope_level === "branch_user" ? (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الفرع</label>
              <select
                className="ui-input"
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
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الحالة</label>
            <select
              className="ui-input"
              value={formData.is_active ? "active" : "inactive"}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
            >
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>
          </div>
        </div>

        {formData.role !== "super_admin" ? (
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="mb-4 space-y-1">
              <h3 className="text-base font-black text-[var(--text-primary)]">الصفحات المسموحة لهذا المستخدم</h3>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                إذا تركت هذا القسم فارغًا فسيعمل المستخدم وفق صفحات دوره المعتادة. إذا اخترت صفحة واحدة فقط فلن تظهر
                القائمة الجانبية، وإذا اخترت صفحتين أو أكثر فستظهر قائمة جانبية مصغرة تحتوي فقط على هذه الصفحات.
              </p>
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

            <div className="mt-4 text-sm font-bold text-[var(--text-secondary)]">
              {formData.allowed_pages.length === 0
                ? "لا توجد صفحات مخصصة حاليًا، وسيستخدم هذا الحساب صفحات الدور الافتراضية."
                : formData.allowed_pages.length === 1
                  ? "تم اختيار صفحة واحدة، وسيعمل هذا الحساب بدون قائمة جانبية."
                  : `${formData.allowed_pages.length} صفحات مخصصة، وستظهر قائمة جانبية تحتوي فقط على هذه الصفحات.`}
            </div>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="mb-4 space-y-1">
            <h3 className="text-base font-black text-[var(--text-primary)]">الصلاحيات المخصصة</h3>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {infrastructure.customPermissions
                ? `يمكنك تعديل صلاحيات ${ROLE_LABELS[formData.role]} لهذا الحساب. عند ترك كل العناصر غير محددة سيتم اعتماد الصلاحيات الافتراضية للدور.`
                : "تم تعطيل الحفظ المخصص للصلاحيات لأن عمود custom_permissions غير موجود بعد في user_profiles."}
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
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

          <div className="mt-4 text-sm font-bold text-[var(--text-secondary)]">
            {formData.permissions.length === 0
              ? "لا توجد صلاحيات مخصصة حالياً."
              : `${formData.permissions.length} صلاحيات محددة لهذا المستخدم.`}
          </div>
        </div>

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
