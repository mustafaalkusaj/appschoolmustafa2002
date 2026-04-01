"use client";

import { ModalFrame } from "./ui";
import { cx } from "./utils";
import type { UserRecord } from "./types";
import type { Permission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/auth";
import { PERMISSION_GROUPS } from "@/types/roles";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { useState, useEffect } from "react";

interface UserFormData {
  full_name: string;
  email: string;
  role: "super_admin" | "admin" | "employee";
  school_id: string;
  phone: string;
  is_active: boolean;
  password: string;
  permissions: Permission[];
}

interface UserFormProps {
  isOpen: boolean;
  editUser: UserRecord | null;
  schools: { id: string; name: string }[];
  infrastructure: AdminInfrastructure;
  onClose: () => void;
  onSave: (data: UserFormData, editUser: UserRecord | null) => Promise<void>;
}

function createInitialFormState(): UserFormData {
  return {
    full_name: "",
    email: "",
    role: "employee",
    school_id: "",
    phone: "",
    is_active: true,
    password: "",
    permissions: [],
  };
}

export function UserForm({ isOpen, editUser, schools, infrastructure, onClose, onSave }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(createInitialFormState());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editUser) {
        setFormData({
          full_name: editUser.full_name ?? "",
          email: editUser.email ?? "",
          role: editUser.role,
          school_id: editUser.school_id ?? "",
          phone: editUser.phone ?? "",
          is_active: editUser.is_active,
          password: "",
          permissions: editUser.custom_permissions ?? [],
        });
      } else {
        setFormData(createInitialFormState());
      }
    }
  }, [isOpen, editUser]);

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
      subtitle="يمكنك ضبط صلاحيات مخصصة أو تركها فارغة ليتم استخدام الافتراضي المرتبط بالدور."
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الاسم الكامل</label>
            <input className="ui-input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
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
              onChange={(e) => setFormData({ ...formData, role: e.target.value as "super_admin" | "admin" | "employee" })}
            >
              <option value="super_admin">{ROLE_LABELS.super_admin}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
              <option value="employee">{ROLE_LABELS.employee}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المدرسة</label>
            <select className="ui-input" value={formData.school_id} onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}>
              <option value="">كل المدارس (المدير العام)</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

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

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="mb-4 space-y-1">
            <h3 className="text-base font-black text-[var(--text-primary)]">الصلاحيات المخصصة</h3>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {infrastructure.customPermissions
                ? "عند ترك كل العناصر غير محددة سيتم اعتماد الصلاحيات الافتراضية للدور."
                : "تم تعطيل الحفظ المخصص للصلاحيات لأن عمود custom_permissions غير موجود بعد في user_profiles."}
            </p>
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