"use client";

import { useMemo, useState } from "react";

import { Pencil, RotateCcw, ShieldBan, ShieldCheck, Trash2, Undo2, UserPlus } from "lucide-react";

import { useAppData } from "@/hooks/useAppData";
import { useLanguage } from "@/hooks/useLanguage";
import {
  formatNumber,
  getPermissionContent,
  getPermissionGroupLabel,
  getRoleLabel,
} from "@/lib/i18n";
import { PERMISSION_GROUPS, buildTemplatePermissions } from "@/lib/permissions";
import type { Permission, Role } from "@/lib/types";

import { StatusPill } from "@/components/shared/status-pill";

interface FormState {
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  permissions: Permission[];
}

export function UsersPanel() {
  const {
    schools,
    roles,
    users,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    toggleUserStatus,
    applyRoleTemplate,
  } = useAppData();

  const activeRoles = useMemo(() => roles.filter((role) => !role.deletedAt), [roles]);
  const defaultRoleKey = activeRoles.find((role) => role.key !== "super_admin")?.key ?? activeRoles[0]?.key ?? "admin";

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    role: defaultRoleKey,
    schoolId: null,
    permissions: activeRoles.find((role) => role.key === defaultRoleKey)?.permissions ?? buildTemplatePermissions(defaultRoleKey),
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { language, t } = useLanguage();

  const schoolMap = useMemo(
    () => new Map(schools.filter((school) => !school.deletedAt).map((school) => [school.id, school.name])),
    [schools],
  );
  const roleMap = useMemo(() => new Map(roles.map((role) => [role.key, role])), [roles]);
  const visibleUsers = useMemo(
    () => users.filter((user) => (showArchived ? true : !user.deletedAt)),
    [showArchived, users],
  );

  const resetForm = () => {
    const nextRole = activeRoles.find((role) => role.key !== "super_admin")?.key ?? activeRoles[0]?.key ?? "admin";
    setForm({
      name: "",
      email: "",
      role: nextRole,
      schoolId: null,
      permissions:
        activeRoles.find((role) => role.key === nextRole)?.permissions ?? buildTemplatePermissions(nextRole),
    });
    setEditingUserId(null);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      return;
    }

    const selectedRoleKey = activeRoles.some((role) => role.key === form.role) ? form.role : defaultRoleKey;

    if (editingUserId) {
      const current = users.find((entry) => entry.id === editingUserId);
      if (!current) {
        return;
      }

      updateUser(editingUserId, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: selectedRoleKey,
        schoolId: selectedRoleKey === "super_admin" ? null : form.schoolId,
        permissions: form.permissions,
        status: current.status,
      });
    } else {
      createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: selectedRoleKey,
        schoolId: selectedRoleKey === "super_admin" ? null : form.schoolId,
        permissions: form.permissions,
      });
    }

    resetForm();
  };

  const startEdit = (userId: string) => {
    const current = users.find((entry) => entry.id === userId);
    if (!current) {
      return;
    }

    setEditingUserId(userId);
    setForm({
      name: current.name,
      email: current.email,
      role: current.role,
      schoolId: current.schoolId,
      permissions: [...current.permissions],
    });
  };

  const togglePermission = (permission: Permission) => {
    setForm((current) => {
      const hasPermission = current.permissions.includes(permission);
      return {
        ...current,
        permissions: hasPermission
          ? current.permissions.filter((entry) => entry !== permission)
          : [...current.permissions, permission],
      };
    });
  };

  const applySelectedRoleTemplate = (roleKey: Role) => {
    const template = roleMap.get(roleKey)?.permissions ?? buildTemplatePermissions(roleKey);
    setForm((current) => ({ ...current, permissions: [...template] }));
  };

  const selectedRoleValue = activeRoles.some((role) => role.key === form.role) ? form.role : defaultRoleKey;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.users.title}</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.common.name}
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.common.email}
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.common.role}
            <select
              value={selectedRoleValue}
              onChange={(event) => {
                const role = event.target.value;
                setForm((current) => ({
                  ...current,
                  role,
                  permissions: [...(roleMap.get(role)?.permissions ?? buildTemplatePermissions(role))],
                  schoolId: role === "super_admin" ? null : current.schoolId,
                }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-900"
            >
              {activeRoles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name || getRoleLabel(role.key, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.superAdmin.users.school}
            <select
              value={form.schoolId ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  schoolId: event.target.value || null,
                }))
              }
              disabled={selectedRoleValue === "super_admin"}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">{t.common.noSchool}</option>
              {schools
                .filter((school) => !school.deletedAt)
                .map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.superAdmin.users.permissionsMatrix}
            </p>
              <button
                type="button"
                onClick={() => applySelectedRoleTemplate(selectedRoleValue)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
              >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.superAdmin.users.resetRoleTemplate}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {getPermissionGroupLabel(group.key, language)}
                </p>
                <div className="space-y-2">
                  {group.permissions.map((permission) => {
                    const content = getPermissionContent(permission, language);
                    return (
                      <label
                        key={permission}
                        className="flex items-start gap-2 rounded-md bg-slate-100/70 px-2 py-1.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                        />
                        <span>
                          <span className="font-semibold">{content.label}</span>
                          <span className="block opacity-75">{content.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={submit}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            {editingUserId ? t.superAdmin.users.updateUser : t.superAdmin.users.createUser}
          </button>
          {editingUserId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {t.common.cancel}
            </button>
          )}
        </div>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => setShowArchived(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-600"
        />
        {t.superAdmin.users.showArchived}
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.users.user}</th>
              <th className="pb-2 pe-3 font-medium">{t.common.role}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.users.school}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.users.status}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.users.permissions}</th>
              <th className="pb-2 font-medium">{t.superAdmin.users.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleUsers.map((user) => {
              const role = roleMap.get(user.role);
              return (
                <tr key={user.id}>
                  <td className="py-3 pe-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{user.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </td>
                  <td className="py-3 pe-3 text-slate-700 dark:text-slate-200">
                    {role?.name || getRoleLabel(user.role, language)}
                  </td>
                  <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">
                    {user.schoolId ? schoolMap.get(user.schoolId) : t.common.globalScope}
                  </td>
                  <td className="py-3 pe-3">
                    <StatusPill status={user.deletedAt ? "archived" : user.status} />
                  </td>
                  <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">
                    {formatNumber(user.permissions.length, language)}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {!user.deletedAt && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(user.id)}
                            aria-label={t.superAdmin.users.editUser}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyRoleTemplate(user.id, user.role)}
                            aria-label={t.superAdmin.users.resetUserPermissions}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user.id)}
                            aria-label={t.superAdmin.users.toggleUserStatus}
                            className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                          >
                            {user.status === "active" ? (
                              <ShieldBan className="h-3.5 w-3.5" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(user.id)}
                            aria-label={t.superAdmin.users.archiveUser}
                            className="rounded-lg border border-rose-300 p-1.5 text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {user.deletedAt && (
                        <button
                          type="button"
                          onClick={() => restoreUser(user.id)}
                          aria-label={t.superAdmin.users.restoreUser}
                          className="rounded-lg border border-emerald-300 p-1.5 text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:text-emerald-300"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
