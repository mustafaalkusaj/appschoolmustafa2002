"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  Check,
  X,
  Plus,
  Copy,
  Trash2,
  Pencil,
  ChevronDown,
} from "@/lib/icons";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { logAction } from "@/lib/audit";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  ROLES,
  buildTemplatePermissions,
  normalizePermissions,
  type Permission,
  type UserRole,
} from "@/types/roles";
import { isMissingRelationError } from "@/lib/admin-infrastructure";
import { MigrationNotice, cx, relationName } from "./UI";

type SchoolOption = {
  id: string;
  name: string;
};

type SchoolRelation = { name: string | null } | Array<{ name: string | null }> | null;

type CustomRoleRecord = {
  id: string;
  name: string;
  description: string | null;
  school_id: string | null;
  base_role: UserRole;
  permissions: Permission[] | null;
  created_at?: string | null;
  schools?: SchoolRelation;
};

type CustomRoleQueryResponse = {
  data: CustomRoleRecord[] | null;
  error: { message: string } | null;
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "مدير عام",
  admin: "مدير مدرسة",
  employee: "موظف",
  parent: "ولي أمر",
};

function createInitialForm(baseRole: UserRole = "admin") {
  return {
    name: "",
    description: "",
    school_id: "",
    base_role: baseRole,
    permissions: buildTemplatePermissions(baseRole),
  };
}

export function RolesTab({
  infrastructure,
  schools,
}: {
  infrastructure: AdminInfrastructure;
  schools: SchoolOption[];
}) {
  const [activeTab, setActiveTab] = useState<"matrix" | "list">("matrix");
  const [roles, setRoles] = useState<CustomRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRoleRecord | null>(null);
  const [formData, setFormData] = useState(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<CustomRoleRecord | null>(null);
  const [userCountByRole, setUserCountByRole] = useState<Record<string, number>>({});

  const schoolOptions = useMemo(
    () => schools.filter((school) => school.name.trim().length > 0),
    [schools],
  );
  const schoolNamesById = useMemo(
    () => new Map(schoolOptions.map((school) => [school.id, school.name])),
    [schoolOptions],
  );

  const fetchRoles = useCallback(async () => {
    if (!infrastructure.customRoles) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let needsSchoolFallback = false;
      let response: CustomRoleQueryResponse = await supabase
        .from("custom_roles")
        .select("id, name, description, school_id, base_role, permissions, created_at, schools(name)")
        .order("created_at", { ascending: false });

      if (response.error && isMissingRelationError(response.error, "custom_roles", "schools")) {
        needsSchoolFallback = true;
        response = await supabase
          .from("custom_roles")
          .select("id, name, description, school_id, base_role, permissions, created_at")
          .order("created_at", { ascending: false });
      }

      if (response.error) throw response.error;

      const normalized = ((response.data || []) as CustomRoleRecord[]).map((role) => ({
        ...role,
        base_role: (role.base_role || "employee") as UserRole,
        permissions: Array.isArray(role.permissions) ? (role.permissions as Permission[]) : null,
        schools: needsSchoolFallback
          ? (role.school_id ? { name: schoolNamesById.get(role.school_id) ?? null } : null)
          : role.schools ?? null,
      }));

      setRoles(normalized);
      setMessage(
        needsSchoolFallback
          ? "تم عرض أسماء المدارس للأدوار المخصصة بوضع توافق لأن علاقة الربط مع جدول المدارس غير متاحة حالياً."
          : "",
      );

      // Fetch user counts per custom role
      try {
        const { data: userRoleData } = await supabase
          .from("user_profiles")
          .select("custom_role_id")
          .not("custom_role_id", "is", null);
        const counts: Record<string, number> = {};
        for (const row of (userRoleData ?? [])) {
          const rid = (row as { custom_role_id: string | null }).custom_role_id;
          if (rid) counts[rid] = (counts[rid] ?? 0) + 1;
        }
        setUserCountByRole(counts);
      } catch {
        // non-fatal — column may not exist yet
      }
    } catch (err) {
      console.error("Failed to fetch custom roles:", err);
      setMessage("تعذر تحميل الأدوار المخصصة حالياً.");
    } finally {
      setLoading(false);
    }
  }, [infrastructure.customRoles, schoolNamesById]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function resetForm(baseRole: UserRole = "admin") {
    setEditingRole(null);
    setFormData(createInitialForm(baseRole));
  }

  function openCreateRole() {
    resetForm("admin");
    setShowForm(true);
  }

  function openEditRole(role: CustomRoleRecord) {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      school_id: role.school_id || "",
      base_role: role.base_role,
      permissions: normalizePermissions(role.permissions ?? [], role.base_role),
    });
    setShowForm(true);
  }

  function togglePermission(permission: Permission) {
    setFormData((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      school_id: formData.school_id || null,
      base_role: formData.base_role,
      permissions: normalizePermissions(formData.permissions, formData.base_role),
    };

    try {
      if (editingRole) {
        const { error } = await supabase.from("custom_roles").update(payload).eq("id", editingRole.id);
        if (error) throw error;

        await logAction({
          action_type: "role_change",
          entity_type: "role",
          entity_id: editingRole.id,
          summary: `تحديث دور مخصص: ${payload.name}`,
          metadata: payload,
        });
      } else {
        const { data, error } = await supabase.from("custom_roles").insert(payload).select("id").single();
        if (error) throw error;

        await logAction({
          action_type: "create",
          entity_type: "role",
          entity_id: data.id,
          summary: `إنشاء دور مخصص: ${payload.name}`,
          metadata: payload,
        });
      }

      setShowForm(false);
      resetForm();
      await fetchRoles();
    } catch (err) {
      console.error("Save custom role error:", err);
      setMessage("تعذر حفظ الدور المخصص.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: CustomRoleRecord) {
    try {
      const { error } = await supabase.from("custom_roles").delete().eq("id", role.id);
      if (error) throw error;

      await logAction({
        action_type: "delete",
        entity_type: "role",
        entity_id: role.id,
        summary: `حذف دور مخصص: ${role.name}`,
      });

      await fetchRoles();
    } catch (err) {
      console.error("Delete custom role error:", err);
      setMessage("تعذر حذف الدور المخصص.");
    }
  }

  async function handleClone(role: CustomRoleRecord) {
    try {
      const payload = {
        name: `${role.name} (نسخة)`,
        description: role.description,
        school_id: role.school_id,
        base_role: role.base_role,
        permissions: normalizePermissions(role.permissions ?? [], role.base_role),
      };

      const { data, error } = await supabase.from("custom_roles").insert(payload).select("id").single();
      if (error) throw error;

      await logAction({
        action_type: "create",
        entity_type: "role",
        entity_id: data.id,
        summary: `نسخ دور مخصص: ${role.name}`,
      });

      await fetchRoles();
    } catch (err) {
      console.error("Clone custom role error:", err);
      setMessage("تعذر نسخ الدور المخصص.");
    }
  }

  if (!infrastructure.customRoles) {
    return (
      <MigrationNotice description="جدول `custom_roles` غير موجود في قاعدة البيانات الحالية. تم تجهيز شاشة إدارة الأدوار المخصصة، لكنها تحتاج تشغيل `admin_infrastructure.sql` لتصبح فعّالة." />
    );
  }

  return (
    <div className="space-y-3">
      {message ? <MigrationNotice title="تنبيه" description={message} /> : null}

      {/* Tab row */}
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("matrix")}
          className={cx(
            "rounded px-2 py-1 text-[11px] font-black transition",
            activeTab === "matrix" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          )}
        >
          مصفوفة الصلاحيات
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={cx(
            "rounded px-2 py-1 text-[11px] font-black transition",
            activeTab === "list" ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          )}
        >
          الأدوار المخصصة ({roles.length})
        </button>
        {activeTab === "list" && (
          <button
            type="button"
            className="ms-auto flex items-center gap-1 rounded border border-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/20"
            onClick={openCreateRole}
          >
            <Plus size={12} />
            إضافة دور
          </button>
        )}
      </div>

      {activeTab === "matrix" ? (
        <div className="overflow-x-auto">
          <div className="rounded-md border border-[var(--border)] overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-muted)]">
                  <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">الصلاحية</th>
                  {ROLES.map((role) => (
                    <th key={role} className="py-1.5 px-2 text-center text-[10px] font-black text-[var(--text-primary)] border-b border-[var(--border)]">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((group) => (
                  <details key={group.title} className="group contents" open>
                    <summary className="contents cursor-pointer">
                      <tr className="bg-[rgba(79,140,255,0.04)]">
                        <td colSpan={ROLES.length + 1} className="py-1 px-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--primary)]">
                            <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                            {group.title}
                          </div>
                        </td>
                      </tr>
                    </summary>
                    {group.permissions.map((perm) => (
                      <tr key={perm.key} className="border-t border-[var(--border)] hover:bg-[rgba(79,140,255,0.02)]">
                        <td className="py-1.5 px-2">
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">{perm.label}</span>
                          <p className="text-[9px] text-[var(--text-muted)]">{perm.key}</p>
                        </td>
                        {ROLES.map((role) => {
                          const has = ROLE_PERMISSIONS[role].includes(perm.key) || ROLE_PERMISSIONS[role].includes("full_access");
                          return (
                            <td key={role} className="py-1.5 px-2 text-center">
                              <div className="flex justify-center">
                                {has ? (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(47,182,122,0.14)] text-[var(--success)]">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(240,90,90,0.14)] text-[var(--danger)]">
                                    <X size={10} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </details>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="sk h-10 w-full rounded" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد أدوار مخصصة بعد</p>
          ) : (
            <div>
              {roles.map((role) => {
                const permissions = normalizePermissions(role.permissions ?? [], role.base_role);
                return (
                  <div key={role.id} className="flex items-center gap-2 py-1.5 px-2 border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors">
                    <Shield size={12} className="text-[var(--text-muted)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-[var(--text-primary)]">{role.name}</span>
                      {role.description && (
                        <span className="ms-2 text-[10px] text-[var(--text-muted)]">{role.description}</span>
                      )}
                    </div>
                    <span className="ui-pill text-[10px]">{ROLE_LABELS[role.base_role]}</span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      {role.school_id ? relationName(role.schools) || "مدرسة محددة" : "المنصة"}
                    </span>
                    <span className="ui-pill ui-pill--success text-[10px] shrink-0">{permissions.length} صلاحية</span>
                    {(userCountByRole[role.id] ?? 0) > 0 && (
                      <span className="ui-pill text-[10px] shrink-0" title="عدد المستخدمين الذين يستخدمون هذا الدور">
                        {userCountByRole[role.id]} مستخدم
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="text-[10px] font-black text-[var(--primary)] hover:underline"
                        onClick={() => openEditRole(role)}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--primary)]"
                        onClick={() => void handleClone(role)}
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={(userCountByRole[role.id] ?? 0) > 0}
                        title={(userCountByRole[role.id] ?? 0) > 0 ? `${userCountByRole[role.id]} مستخدم يستخدم هذا الدور` : "حذف الدور"}
                        className="text-[10px] font-black text-[var(--danger)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => (userCountByRole[role.id] ?? 0) === 0 && setRoleToDelete(role)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="ui-surface w-full max-w-2xl rounded-xl p-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-base font-black">
              {editingRole ? "تعديل دور مخصص" : "إضافة دور مخصص"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black">اسم الدور</label>
                  <input
                    className="ui-input"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black">الدور الأساسي</label>
                  <select
                    className="ui-input"
                    value={formData.base_role}
                    onChange={(e) => {
                      const baseRole = e.target.value as UserRole;
                      setFormData((current) => ({
                        ...current,
                        base_role: baseRole,
                        permissions: buildTemplatePermissions(baseRole),
                      }));
                    }}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black">الوصف</label>
                  <textarea
                    className="ui-input min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black">النطاق</label>
                  <select
                    className="ui-input"
                    value={formData.school_id}
                    onChange={(e) => setFormData((current) => ({ ...current, school_id: e.target.value }))}
                  >
                    <option value="">على مستوى المنصة</option>
                    {schoolOptions.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-black text-[var(--text-primary)]">الصلاحيات</h4>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      تم ملء الصلاحيات الافتراضية من الدور الأساسي ويمكنك تعديلها.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-[var(--border)] px-2 py-1 text-[11px] font-black text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                    onClick={() => setFormData((current) => ({
                      ...current,
                      permissions: buildTemplatePermissions(current.base_role),
                    }))}
                  >
                    إعادة ضبط
                  </button>
                </div>

                <div className="space-y-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.title} className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                      <div className="mb-2 text-xs font-black text-[var(--text-primary)]">{group.title}</div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checked = formData.permissions.includes(permission.key);
                          return (
                            <label
                              key={permission.key}
                              className={cx(
                                "flex items-center gap-2 rounded border px-2 py-2 text-xs font-bold transition cursor-pointer",
                                checked
                                  ? "border-[rgba(79,140,255,0.22)] bg-[rgba(79,140,255,0.10)] text-[var(--text-primary)]"
                                  : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(permission.key)}
                              />
                              <span>{permission.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
                  إلغاء
                </button>
                <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : editingRole ? "حفظ التعديلات" : "إضافة الدور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="حذف الدور المخصص"
        description={roleToDelete ? `سيتم حذف الدور "${roleToDelete.name}" نهائياً من قائمة الأدوار المخصصة.` : ""}
        confirmLabel="نعم، احذف الدور"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setRoleToDelete(null)}
        onConfirm={async () => {
          const target = roleToDelete;
          setRoleToDelete(null);
          if (target) await handleDelete(target);
        }}
      />
    </div>
  );
}
