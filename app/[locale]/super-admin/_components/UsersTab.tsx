"use client";

import { useState, useMemo } from "react";
import { Users, UserRoundPlus, FileDown, PencilLine, Trash2, KeyRound } from "@/lib/icons";
import { SectionCard, EmptyState } from "./ui";
import { formatDate, relationName } from "./utils";
import type { BranchOptionRecord, SchoolRecord, UserRecord } from "./types";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

interface UsersTabProps {
  users: UserRecord[];
  schools: SchoolRecord[];
  branches: BranchOptionRecord[];
  filteredUsers: UserRecord[];
  onOpenCreateUser: () => void;
  onOpenEditUser: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onResetPassword: (userId: string) => void;
}

export function UsersTab({
  users: _users,
  schools: _schools,
  branches,
  filteredUsers,
  onOpenCreateUser,
  onOpenEditUser,
  onDeleteUser,
  onResetPassword,
}: UsersTabProps) {
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

  const displayedUsers = useMemo(
    () => showInactiveOnly ? filteredUsers.filter((u) => !u.is_active) : filteredUsers,
    [filteredUsers, showInactiveOnly],
  );

  return (
    <SectionCard
      title={`إدارة المستخدمين (${displayedUsers.length})`}
      description="إدارة المستخدمين مع إظهار المدرسة، الفرع، المسمى الوظيفي، ونمط الوصول المقيّد للصفحات عندما يكون ذلك مطلوباً."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`ui-button inline-flex items-center gap-2 ${showInactiveOnly ? "ui-button--primary" : "ui-button--secondary"}`}
            onClick={() => setShowInactiveOnly((v) => !v)}
          >
            غير نشطين فقط
          </button>
          <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => exportToCSV(filteredUsers, "users")}>
            <FileDown size={16} />
            تصدير
          </button>
          <button type="button" className="ui-button ui-button--primary inline-flex items-center gap-2" onClick={onOpenCreateUser}>
            <UserRoundPlus size={16} />
            إضافة مستخدم
          </button>
        </div>
      }
    >
      {displayedUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا توجد نتائج للمستخدمين"
          description="جرّب تعديل البحث الحالي أو أضف مستخدماً جديداً لتخصيص الوصول."
          actionLabel="إضافة مستخدم"
          onAction={onOpenCreateUser}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[30px] border border-[var(--border)] lg:block">
            <div className="max-h-[70dvh] overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>البريد</th>
                    <th>الدور</th>
                    <th>المدرسة</th>
                    <th>الصلاحيات</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((user) => {
                    const roleColor = ROLE_COLORS[user.role] ?? { bg: "rgba(79,140,255,0.12)", color: "#4F8CFF" };
                    const customPermissionsCount = user.custom_permissions?.length ?? 0;
                    const branchName = user.branch_id ? branchNames.get(user.branch_id) ?? "—" : null;
                    const accessMode =
                      user.role === "super_admin"
                        ? "عام"
                        : user.scope_level === "branch_user"
                            ? "فرع"
                            : "مدرسة";

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="space-y-1">
                            <div className="font-black">{user.full_name || "—"}</div>
                            {user.job_title ? (
                              <div className="text-xs font-bold text-[var(--primary)]">{user.job_title}</div>
                            ) : null}
                            <div className="text-xs font-bold text-[var(--text-tertiary)]">{formatDate(user.created_at)}</div>
                          </div>
                        </td>
                        <td className="text-[var(--text-secondary)]">{user.email || "—"}</td>
                        <td>
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black" style={{ background: roleColor.bg, color: roleColor.color }}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="text-[var(--text-secondary)]">{relationName(user.schools) || "كل المدارس"}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <span className="ui-pill">{customPermissionsCount === 0 ? "افتراضي" : `${customPermissionsCount} مخصص`}</span>
                            <span className="ui-pill">{accessMode}</span>
                            {branchName ? <span className="ui-pill">{branchName}</span> : null}
                            {user.allowed_pages.length > 0 ? (
                              <span className="ui-pill">{`${user.allowed_pages.length} صفحات`}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className={user.is_active ? "ui-pill ui-pill--success" : "ui-pill ui-pill--danger"}>{user.is_active ? "نشط" : "موقوف"}</span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4" onClick={() => onOpenEditUser(user)}>
                              <PencilLine size={16} />
                              تعديل
                            </button>
                            <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4" title="إعادة تعيين كلمة المرور" onClick={() => onResetPassword(user.id)}>
                              <KeyRound size={16} />
                            </button>
                            <button type="button" className="ui-button ui-button--danger inline-flex items-center gap-2 px-4" onClick={() => onDeleteUser(user)}>
                              <Trash2 size={16} />
                              أرشفة
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {displayedUsers.map((user) => {
              const roleColor = ROLE_COLORS[user.role] ?? { bg: "rgba(79,140,255,0.12)", color: "#4F8CFF" };
              const branchName = user.branch_id ? branchNames.get(user.branch_id) ?? "—" : null;

              return (
                <article key={user.id} className="ui-surface rounded-[28px] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-[var(--text-primary)]">{user.full_name || "—"}</h3>
                      {user.job_title ? (
                        <p className="text-xs font-black text-[var(--primary)]">{user.job_title}</p>
                      ) : null}
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{user.email}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black" style={{ background: roleColor.bg, color: roleColor.color }}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="ui-pill">{relationName(user.schools) || "كل المدارس"}</span>
                    {branchName ? <span className="ui-pill">{branchName}</span> : null}
                    {user.allowed_pages.length > 0 ? (
                      <span className="ui-pill">{`${user.allowed_pages.length} صفحات`}</span>
                    ) : null}
                    <span className={user.is_active ? "ui-pill ui-pill--success" : "ui-pill ui-pill--danger"}>{user.is_active ? "نشط" : "موقوف"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="ui-button ui-button--secondary inline-flex flex-1 items-center justify-center gap-2" onClick={() => onOpenEditUser(user)}>
                      <PencilLine size={16} />
                      تعديل
                    </button>
                    <button type="button" className="ui-button ui-button--secondary inline-flex items-center justify-center gap-2 px-3" title="إعادة تعيين كلمة المرور" onClick={() => onResetPassword(user.id)}>
                      <KeyRound size={16} />
                    </button>
                    <button type="button" className="ui-button ui-button--danger inline-flex flex-1 items-center justify-center gap-2" onClick={() => onDeleteUser(user)}>
                      <Trash2 size={16} />
                      أرشفة
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </SectionCard>
  );
}
