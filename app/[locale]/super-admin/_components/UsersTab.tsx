"use client";

import { useState, useMemo, useEffect, type ElementType } from "react";
import { Users, UserRoundPlus, FileDown, PencilLine, Trash2, KeyRound, ExternalLink, GraduationCap, BookOpen, ShieldCheck, Search } from "@/lib/icons";
import { formatDate, relationName } from "./utils";
import type { BranchOptionRecord, SchoolRecord, UserRecord } from "./types";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";
import { cn } from "@/lib/brand/brand-utils";

type UserSegment = "staff" | "students" | "teachers";

function classifyUser(user: UserRecord): UserSegment {
  const email = (user.email ?? "").toLowerCase();
  if (email.startsWith("student.") && email.endsWith("@schoolapp.local")) return "students";
  if (email.startsWith("teacher.") && email.endsWith("@schoolapp.local")) return "teachers";
  return "staff";
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 7) return `${days}ي`;
  if (days < 30) return `${Math.floor(days / 7)}أ`;
  if (days < 365) return `${Math.floor(days / 30)}ش`;
  return `${Math.floor(days / 365)}س`;
}

interface UsersTabProps {
  users: UserRecord[];
  schools: SchoolRecord[];
  branches: BranchOptionRecord[];
  filteredUsers: UserRecord[];
  onOpenCreateUser: () => void;
  onOpenEditUser: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onResetPassword: (userId: string) => void;
  onImpersonate?: (userId: string) => void;
  onToggleActive?: (userId: string, isActive: boolean) => Promise<void>;
}

export function UsersTab({
  users: _users,
  schools,
  branches,
  filteredUsers,
  onOpenCreateUser,
  onOpenEditUser,
  onDeleteUser,
  onResetPassword,
  onImpersonate,
  onToggleActive,
}: UsersTabProps) {
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [segment, setSegment] = useState<UserSegment>("staff");
  const [internalQuery, setInternalQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));

  const schoolNameMap = useMemo(
    () => new Map(schools.map((s) => [s.id, s.name])),
    [schools],
  );

  const schoolOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of filteredUsers) {
      if (u.school_id) {
        const name = schoolNameMap.get(u.school_id) ?? relationName(u.schools) ?? u.school_id;
        seen.set(u.school_id, name);
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [filteredUsers, schoolNameMap]);

  const staffCount = useMemo(() => filteredUsers.filter(u => classifyUser(u) === "staff").length, [filteredUsers]);
  const studentCount = useMemo(() => filteredUsers.filter(u => classifyUser(u) === "students").length, [filteredUsers]);
  const teacherCount = useMemo(() => filteredUsers.filter(u => classifyUser(u) === "teachers").length, [filteredUsers]);

  useEffect(() => {
    setInternalQuery("");
    setSchoolFilter("");
  }, [segment]);

  const segmentedUsers = useMemo(() => {
    const base = filteredUsers.filter(u => classifyUser(u) === segment);
    return base.filter(u => {
      if (schoolFilter && u.school_id !== schoolFilter) return false;
      if (!internalQuery) return true;
      const q = internalQuery.toLowerCase();
      return (
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [filteredUsers, segment, internalQuery, schoolFilter]);

  const displayedUsers = useMemo(
    () => showInactiveOnly ? segmentedUsers.filter((u) => !u.is_active) : segmentedUsers,
    [segmentedUsers, showInactiveOnly],
  );

  const SEGMENT_TABS: { key: UserSegment; label: string; icon: ElementType; count: number }[] = [
    { key: "staff", label: "الموظفون والمدراء", icon: ShieldCheck, count: staffCount },
    { key: "students", label: "حسابات الطلاب", icon: GraduationCap, count: studentCount },
    { key: "teachers", label: "حسابات المعلمين", icon: BookOpen, count: teacherCount },
  ];

  async function handleBulkToggle(activate: boolean) {
    if (!onToggleActive || selected.size === 0) return;
    setBulkLoading(true);
    for (const id of Array.from(selected)) {
      const user = filteredUsers.find((u) => u.id === id);
      if (user && user.is_active !== activate) {
        await onToggleActive(id, activate);
      }
    }
    setSelected(new Set());
    setBulkLoading(false);
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <span className="text-xs font-black text-[var(--text-primary)]">
          المستخدمون ({displayedUsers.length})
        </span>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInactiveOnly(v => !v)}
            className={cn(
              "inline-flex h-6 items-center rounded border px-2 text-[11px] font-black transition-colors",
              showInactiveOnly
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            غير نشطين
          </button>
          <button
            type="button"
            onClick={() => exportToCSV(displayedUsers, `users-${segment}`)}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
            title="تصدير"
          >
            <FileDown size={11} />
          </button>
          <button
            type="button"
            onClick={onOpenCreateUser}
            className="flex items-center gap-1 rounded border border-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/20"
          >
            <UserRoundPlus size={12} />
            مستخدم
          </button>
        </div>
      </div>

      {/* Segment tabs + search + school filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {SEGMENT_TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSegment(key)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-black transition-colors",
                segment === key
                  ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={11} />
              {label}
              <span className="text-[10px]">({count})</span>
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* Internal search */}
          <div className="relative">
            <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={internalQuery}
              onChange={e => setInternalQuery(e.target.value)}
              placeholder="بحث..."
              className="h-6 ps-6 pe-2 text-[11px] rounded border border-[var(--border)] bg-[var(--surface-muted)] outline-none focus:border-[var(--primary)] min-w-[120px]"
            />
          </div>

          {/* School filter */}
          {schoolOptions.length > 0 && (
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="h-6 text-[11px] rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 outline-none max-w-[130px]"
            >
              <option value="">كل المدارس</option>
              {schoolOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && onToggleActive && (
        <div className="flex items-center gap-2 rounded-md border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1.5">
          <span className="text-xs font-black text-[var(--primary)]">{selected.size} محدد</span>
          <button
            onClick={() => void handleBulkToggle(true)}
            disabled={bulkLoading}
            className="text-[10px] font-black text-[var(--success)] hover:underline disabled:opacity-50"
          >
            تمكين
          </button>
          <button
            onClick={() => void handleBulkToggle(false)}
            disabled={bulkLoading}
            className="text-[10px] font-black text-[var(--danger)] hover:underline disabled:opacity-50"
          >
            تعطيل
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ms-auto text-[10px] text-[var(--text-muted)] hover:underline"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Table */}
      {displayedUsers.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">
          {segment === "students"
            ? "لا توجد حسابات طلاب مضافة بعد."
            : segment === "teachers"
              ? "لا توجد حسابات معلمين مضافة بعد."
              : "لا توجد نتائج — جرّب تعديل البحث أو أضف مستخدماً جديداً."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-[var(--border)]">
          <div className="max-h-[70dvh] overflow-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  {onToggleActive && <th className="w-6"></th>}
                  <th>الاسم / البريد</th>
                  <th>الدور</th>
                  <th>المدرسة</th>
                  <th>الصلاحيات</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((user) => {
                  const isSelected = selected.has(user.id);
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
                      {onToggleActive && (
                        <td className="w-6">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(user.id);
                              else next.delete(user.id);
                              setSelected(next);
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                      )}
                      <td>
                        <div>
                          <div className="font-black text-[var(--text-primary)]">{user.full_name || "—"}</div>
                          {user.job_title ? (
                            <div className="text-[10px] font-bold text-[var(--primary)]">{user.job_title}</div>
                          ) : null}
                          <div className="text-[10px] text-[var(--text-muted)]">{user.email || "—"}</div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black"
                          style={{ background: roleColor.bg, color: roleColor.color }}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td>
                        <span className="max-w-[100px] truncate block text-[var(--text-secondary)] text-xs">
                          {relationName(user.schools) || "كل المدارس"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <span className="ui-pill">{customPermissionsCount === 0 ? "افتراضي" : `${customPermissionsCount} مخصص`}</span>
                          <span className="ui-pill">{accessMode}</span>
                          {branchName ? <span className="ui-pill">{branchName}</span> : null}
                          {user.allowed_pages.length > 0 ? (
                            <span className="ui-pill">{`${user.allowed_pages.length} صفحات`}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={user.is_active ? "ui-pill ui-pill--success" : "ui-pill ui-pill--danger"}>
                          {user.is_active ? "نشط" : "موقوف"}
                        </span>
                      </td>
                      <td className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                        {relativeDate(user.created_at)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditUser(user)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                            title="تعديل"
                          >
                            <PencilLine size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onResetPassword(user.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-amber-500"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound size={11} />
                          </button>
                          {onImpersonate && (
                            <button
                              type="button"
                              onClick={() => onImpersonate(user.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                              title="دخول كهذا المستخدم"
                            >
                              <ExternalLink size={11} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteUser(user)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)]"
                            title="أرشفة"
                          >
                            <Trash2 size={11} />
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
      )}
    </div>
  );
}
