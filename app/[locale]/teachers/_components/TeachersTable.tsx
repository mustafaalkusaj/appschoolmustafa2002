"use client";

// Teachers table component

import {
  BookOpen,
  CheckCircle2,
  CircleOff,
  KeyRound,
  Loader2,
  PencilLine,
  Printer,
  Trash2,
  Users,
} from "@/lib/icons";
import { ListPagination } from "@/components/school/ListPagination";
import type { ManagedUserRecord } from "@/lib/managed-users";
import { RolePill, StatusPill } from "./ui";
import { formatDateLabel } from "../_utils";

type TeachersTableProps = {
  users: ManagedUserRecord[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  togglingId: string | null;
  cardLoadingId: string | null;
  resetLoadingId: string | null;
  onEdit: (user: ManagedUserRecord) => void;
  onOpenAccountCard: (user: ManagedUserRecord) => void;
  onResetPassword: (user: ManagedUserRecord) => void;
  onToggle: (user: ManagedUserRecord) => void;
  onDelete: (user: ManagedUserRecord) => void;
};

export function TeachersTable({
  users,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  togglingId,
  cardLoadingId,
  resetLoadingId,
  onEdit,
  onOpenAccountCard,
  onResetPassword,
  onToggle,
  onDelete,
}: TeachersTableProps) {
  return (
    <>
      <div className="mt-5 overflow-x-auto rounded-[26px] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-xs)]">
        <table className="ui-table min-w-[1260px]">
          <thead className="bg-[var(--surface-muted)]">
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="mx-auto max-w-md space-y-3">
                    <p className="text-lg font-black text-[var(--text-primary)]">لا توجد حسابات مطابقة</p>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">
                      أنشئ أول حساب أستاذ، أو عدّل الفلاتر الحالية لعرض نتائج أكثر.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={user.auth_user_id} className={index % 2 === 0 ? "bg-transparent" : "bg-[var(--surface-soft)]/45"}>
                  <td>
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${
                          user.role === "student"
                            ? "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-primary)]"
                            : "border border-[rgba(242,169,59,0.18)] bg-[rgba(242,169,59,0.12)] text-[var(--warning)]"
                        }`}
                      >
                        {user.role === "student" ? <Users size={18} /> : <BookOpen size={18} />}
                      </div>
                      <div className="space-y-2">
                        <div className="font-black text-[var(--text-primary)]">{user.full_name}</div>
                        <div className="inline-flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <span dir="ltr">{user.email}</span>
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span>{user.phone || "بدون رقم هاتف"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RolePill role={user.role} />
                  </td>
                  <td>
                    {user.role === "student" ? (
                      <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                        <div>الصف: {user.student?.class_name || "غير محدد"}</div>
                        <div>الشعبة: {user.student?.section || "غير محددة"}</div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm leading-7 text-[var(--text-secondary)]">
                        <div>عدد التكليفات: {user.teacher?.assignments.length ?? 0}</div>
                        {user.teacher?.assignments.length ? (
                          user.teacher.assignments.slice(0, 2).map((assignment) => (
                            <div key={assignment.id || `${assignment.subject_name}-${assignment.class_name}-${assignment.section_name ?? "*"}`}>
                              {assignment.subject_name} • {assignment.class_name}
                              {assignment.section_name ? ` • ${assignment.section_name}` : " • كل الشعب"}
                            </div>
                          ))
                        ) : (
                          <div>لم تُسند أي تكليفات حتى الآن</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                      <div className="space-y-1">
                        <div className="text-[11px] font-black text-[var(--text-tertiary)]">معرّف الدخول</div>
                        <div dir="ltr" className="font-bold text-[var(--text-primary)]">
                          {user.app_account?.login_identifier || user.email}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-black text-[var(--text-tertiary)]">كلمة المرور المؤقتة</div>
                        <div>{user.app_account?.has_temporary_password ? "جاهزة للطباعة" : "تحتاج إعادة تعيين"}</div>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="ui-button ui-button--secondary inline-flex min-h-[42px] min-w-[102px] items-center justify-center gap-2 px-3 py-2 text-sm"
                        onClick={() => onEdit(user)}
                      >
                        <PencilLine size={15} />
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="ui-button ui-button--primary inline-flex min-h-[42px] min-w-[124px] items-center justify-center gap-2 px-3 py-2 text-sm"
                        onClick={() => onOpenAccountCard(user)}
                        disabled={cardLoadingId === user.auth_user_id}
                      >
                        {cardLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                        بطاقة الدخول
                      </button>
                      <button
                        type="button"
                        className="ui-button ui-button--secondary inline-flex min-h-[42px] min-w-[124px] items-center justify-center gap-2 px-3 py-2 text-sm"
                        onClick={() => onResetPassword(user)}
                        disabled={resetLoadingId === user.auth_user_id}
                      >
                        {resetLoadingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                        إعادة ضبط المرور
                      </button>
                      <button
                        type="button"
                        className={`ui-button inline-flex min-h-[42px] min-w-[94px] items-center justify-center gap-2 px-3 py-2 text-sm ${
                          user.is_active ? "ui-button--danger" : "ui-button--primary"
                        }`}
                        onClick={() => onToggle(user)}
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
                      <button
                        type="button"
                        className="ui-button ui-button--danger inline-flex min-h-[42px] min-w-[94px] items-center justify-center gap-2 px-3 py-2 text-sm"
                        onClick={() => onDelete(user)}
                        disabled={togglingId === user.auth_user_id}
                      >
                        {togglingId === user.auth_user_id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <ListPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={onPageChange}
          disabled={loading}
        />
      </div>
    </>
  );
}
