"use client";

import { useCallback, useMemo, useState } from "react";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import {
  UsersTab,
  UserForm,
  DeleteUserDialog,
  type UserFormData,
  getErrorMessage,
} from "../_components";
import type { UserRecord } from "../_components/types";

export default function UsersPage() {
  const { users, schools, branches, infrastructure, refresh } =
    useSuperAdminData();
  const toast = useToast();

  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const filteredUsers = useMemo(() => users, [users]);

  const handleSaveUser = useCallback(
    async (f: UserFormData, editing: UserRecord | null) => {
      try {
        const payload = {
          full_name: f.full_name,
          job_title: f.job_title || null,
          email: f.email,
          role: f.role,
          school_id: f.school_id || null,
          branch_id: f.branch_id || null,
          phone: f.phone || null,
          is_active: f.is_active,
          scope_level: f.scope_level,
          is_single_page_user: f.is_single_page_user,
          allowed_pages: f.allowed_pages,
          permissions_version: f.permissions_version,
          custom_permissions: f.permissions.length ? f.permissions : null,
        };
        if (editing) {
          const { response, payload: res } =
            await fetchJsonWithAuthorizedSession<{
              error?: { message?: string };
            }>(`/api/web/super-admin/users/${editing.id}`, {
              method: "PATCH",
              headers: withJsonHeaders(),
              body: JSON.stringify(payload),
            });
          if (!response.ok)
            throw new Error(res?.error?.message || "تعذر التحديث.");
        } else {
          const { response, payload: res } =
            await fetchJsonWithAuthorizedSession<{
              error?: { message?: string };
            }>("/api/users", {
              method: "POST",
              headers: withJsonHeaders(),
              body: JSON.stringify({ ...payload, password: f.password }),
            });
          if (!response.ok)
            throw new Error(res?.error?.message || "فشل إنشاء المستخدم.");
        }
        toast.success("تم حفظ المستخدم بنجاح ✓");
        setShowUserForm(false);
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر الحفظ."));
      }
    },
    [refresh, toast],
  );

  const handleDeleteUser = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        error?: { message?: string };
      }>(`/api/web/super-admin/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر أرشفة المستخدم.");
      toast.success(
        `تمت أرشفة المستخدم ${deleteTarget.full_name || deleteTarget.email || ""} ✓`,
      );
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر أرشفة المستخدم."));
    }
  }, [deleteTarget, refresh, toast]);

  const handleResetPassword = useCallback(
    async (userId: string) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          temporaryPassword?: string;
          error?: { message?: string };
        }>(`/api/web/super-admin/users/${userId}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          toast.error(
            payload?.error?.message || "تعذر إعادة تعيين كلمة المرور",
          );
          return;
        }
        toast.success(
          `كلمة المرور الجديدة: ${payload?.temporaryPassword}`,
        );
      } catch {
        toast.error("تعذر إعادة تعيين كلمة المرور");
      }
    },
    [toast],
  );

  const handleToggleActive = useCallback(
    async (userId: string, activate: boolean) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          error?: { message?: string };
        }>(`/api/web/super-admin/users/${userId}`, {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ is_active: activate }),
        });
        if (!response.ok)
          throw new Error(payload?.error?.message || "تعذر تحديث حالة المستخدم.");
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر تحديث حالة المستخدم."));
      }
    },
    [refresh, toast],
  );

  const handleImpersonate = useCallback(
    async (userId: string) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          link?: string;
          email?: string;
          error?: { message?: string };
        }>(`/api/web/super-admin/users/${userId}/impersonate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          toast.error(
            payload?.error?.message || "تعذر توليد رابط تسجيل الدخول",
          );
          return;
        }
        if (payload?.link) {
          window.open(payload.link, "_blank", "noopener,noreferrer");
          toast.success(
            `تم فتح رابط تسجيل الدخول لـ ${payload.email ?? "المستخدم"}`,
          );
        }
      } catch {
        toast.error("تعذر توليد رابط تسجيل الدخول");
      }
    },
    [toast],
  );

  return (
    <>
      <UsersTab
        users={users}
        schools={schools}
        branches={branches}
        filteredUsers={filteredUsers}
        onOpenCreateUser={() => {
          setEditUser(null);
          setShowUserForm(true);
        }}
        onOpenEditUser={(u) => {
          setEditUser(u);
          setShowUserForm(true);
        }}
        onDeleteUser={setDeleteTarget}
        onResetPassword={(id) => void handleResetPassword(id)}
        onImpersonate={(id) => void handleImpersonate(id)}
        onToggleActive={handleToggleActive}
      />

      <UserForm
        isOpen={showUserForm}
        editUser={editUser}
        schools={schools.map((s) => ({ id: s.id, name: s.name }))}
        branches={branches}
        infrastructure={infrastructure}
        onClose={() => setShowUserForm(false)}
        onSave={handleSaveUser}
      />

      <DeleteUserDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteUser()}
      />
    </>
  );
}
