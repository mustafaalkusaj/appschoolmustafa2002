"use client";

import { useMemo, useState } from "react";

import { Pencil, RotateCcw, Shield, Trash2, Undo2 } from "lucide-react";

import { useAppData } from "@/hooks/useAppData";
import { useLanguage } from "@/hooks/useLanguage";
import { getPermissionContent, getPermissionGroupLabel, getRoleLabel } from "@/lib/i18n";
import { PERMISSION_GROUPS, buildTemplatePermissions, isBuiltInRole } from "@/lib/permissions";
import type { Permission } from "@/lib/types";

import { StatusPill } from "@/components/shared/status-pill";

interface RoleFormState {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}

const initialForm: RoleFormState = {
  key: "",
  name: "",
  description: "",
  permissions: [],
};

export function RolesPanel() {
  const { roles, users, createRole, updateRole, archiveRole, restoreRole } = useAppData();
  const { language, t } = useLanguage();

  const [form, setForm] = useState<RoleFormState>(initialForm);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visibleRoles = useMemo(
    () => roles.filter((role) => (showArchived ? true : !role.deletedAt)),
    [roles, showArchived],
  );

  const usageCount = useMemo(
    () =>
      new Map(
        roles.map((role) => [
          role.key,
          users.filter((user) => user.role === role.key && !user.deletedAt).length,
        ]),
      ),
    [roles, users],
  );

  const submit = () => {
    if (!form.name.trim() || !form.key.trim()) {
      return;
    }

    if (editingRoleKey) {
      updateRole(editingRoleKey, {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      });
    } else {
      createRole({
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      });
    }

    setForm(initialForm);
    setEditingRoleKey(null);
  };

  const togglePermission = (permission: Permission) => {
    setForm((current) => {
      const nextPermissions = current.permissions.includes(permission)
        ? current.permissions.filter((entry) => entry !== permission)
        : [...current.permissions, permission];

      return {
        ...current,
        permissions: nextPermissions,
      };
    });
  };

  const startEdit = (roleKey: string) => {
    const role = roles.find((entry) => entry.key === roleKey);
    if (!role) {
      return;
    }

    setEditingRoleKey(role.key);
    setForm({
      key: role.key,
      name: role.name || getRoleLabel(role.key, language),
      description: role.description,
      permissions: [...role.permissions],
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.roles.title}</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.superAdmin.roles.roleName}
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t.superAdmin.roles.roleKey}
            <input
              value={form.key}
              onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
              disabled={Boolean(editingRoleKey)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
            {t.superAdmin.roles.description}
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t.superAdmin.users.permissionsMatrix}
            </p>
            {isBuiltInRole(form.key) && (
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    permissions: buildTemplatePermissions(form.key),
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.superAdmin.users.resetRoleTemplate}
              </button>
            )}
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
            {editingRoleKey ? t.superAdmin.roles.updateRole : t.superAdmin.roles.createRole}
          </button>
          {(editingRoleKey || form.key || form.name || form.description || form.permissions.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setEditingRoleKey(null);
                setForm(initialForm);
              }}
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
        {t.superAdmin.roles.showArchived}
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.roles.roleName}</th>
              <th className="pb-2 pe-3 font-medium">{t.common.key}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.roles.roleType}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.roles.usage}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.roles.roleStatus}</th>
              <th className="pb-2 font-medium">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleRoles.map((role) => (
              <tr key={role.id}>
                <td className="py-3 pe-3">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {role.name || getRoleLabel(role.key, language)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{role.description}</p>
                </td>
                <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{role.key}</td>
                <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">
                  {role.isSystem ? t.superAdmin.roles.systemRole : t.superAdmin.roles.customRole}
                </td>
                <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{usageCount.get(role.key) ?? 0}</td>
                <td className="py-3 pe-3">
                  <StatusPill status={role.deletedAt ? "archived" : "active"} />
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(role.key)}
                      aria-label={t.common.edit}
                      className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {role.deletedAt ? (
                      <button
                        type="button"
                        onClick={() => restoreRole(role.key)}
                        aria-label={t.superAdmin.roles.restoreRole}
                        className="rounded-lg border border-emerald-300 p-1.5 text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      !role.isSystem && (
                        <button
                          type="button"
                          onClick={() => archiveRole(role.key)}
                          aria-label={t.superAdmin.roles.archiveRole}
                          className="rounded-lg border border-rose-300 p-1.5 text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
