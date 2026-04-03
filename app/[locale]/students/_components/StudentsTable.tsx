"use client";

import { formatNumber } from "@/lib/formatting";
import { STATUS_MAP } from "../_constants";
import type { StudentWithFees, StudentActionItem } from "../_types";

interface StudentsTableProps {
  pagedStudents: StudentWithFees[];
  pagedLoading: boolean;
  pagedError: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  activeTab: string;
  error: string;
  canManageStudentAccounts: boolean;
  getActions: (s: StudentWithFees) => StudentActionItem[];
  openMenu: (e: React.MouseEvent, student: StudentWithFees) => void;
  onPageChange: (page: number) => void;
}

export function StudentsTable({
  pagedStudents,
  pagedLoading,
  pagedError,
  totalCount,
  page,
  pageSize,
  totalPages,
  activeTab,
  error,
  canManageStudentAccounts,
  getActions,
  openMenu,
  onPageChange,
}: StudentsTableProps) {
  if (pagedLoading) {
    return (
      <div className="tbl-wrap">
        <div className="spin" />
      </div>
    );
  }

  if (error || pagedError) {
    return (
      <div className="tbl-wrap">
        <div className="empty">
          خطأ في تحميل البيانات: {error || pagedError || "غير معروف"}
        </div>
      </div>
    );
  }

  if (pagedStudents.length === 0) {
    return (
      <div className="tbl-wrap">
        <div className="empty">
          {totalCount === 0
            ? activeTab === "active" && canManageStudentAccounts
              ? "لا يوجد طلاب — اضغط إضافة طالب"
              : `لا يوجد طلاب في هذه القائمة (${activeTab})`
            : "لا توجد نتائج مطابقة للفلاتر الحالية"}
        </div>
      </div>
    );
  }

  return (
    <div className="tbl-wrap">
      <div className="tbl-mobile-cards">
        {pagedStudents.map((s, i) => {
          const st = STATUS_MAP[s.status] || STATUS_MAP.active;
          const actions = getActions(s);
          return (
            <article key={s.id} className="tbl-mobile-card">
              <div className="tbl-mobile-card__header">
                <div>
                  <button
                    type="button"
                    className="tbl-mobile-card__title"
                    onClick={(e) => openMenu(e, s)}
                  >
                    {s.full_name}
                  </button>
                  <div className="tbl-mobile-card__subtitle">
                    #{(page - 1) * pageSize + i + 1} • {s.class_name} • {s.section || "بدون شعبة"}
                  </div>
                </div>
                <span className="badge" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>

              <div className="tbl-mobile-card__grid">
                <div className="tbl-mobile-card__item">
                  <span>الهاتف</span>
                  <strong>{s.phone || "—"}</strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>المدفوع</span>
                  <strong style={{ color: "#10B981" }}>د.ع {formatNumber(s.paid_fee)}</strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>المتبقي</span>
                  <strong style={{ color: s.remaining_fee > 0 ? "#EF4444" : "#10B981" }}>
                    د.ع {formatNumber(s.remaining_fee)}
                  </strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>العنوان</span>
                  <strong>{s.address || "—"}</strong>
                </div>
              </div>

              {actions.length > 0 ? (
                <button
                  type="button"
                  className="btn-action tbl-mobile-card__action"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => openMenu(e, s)}
                >
                  خيارات الطالب ▾
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>الصف</th>
            <th>الشعبة</th>
            <th>العنوان</th>
            <th>الهاتف</th>
            <th>الرسوم</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>الحالة</th>
            <th>خيارات</th>
          </tr>
        </thead>
        <tbody>
          {pagedStudents.map((s, i) => {
            const st = STATUS_MAP[s.status] || STATUS_MAP.active;
            const actions = getActions(s);
            return (
              <tr key={s.id}>
                <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>
                  {(page - 1) * pageSize + i + 1}
                </td>
                <td>
                  <span
                    className="student-name"
                    style={{
                      fontWeight: 700,
                      color: "var(--p2)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                    onClick={(e) => openMenu(e, s)}
                  >
                    {s.full_name}
                  </span>
                </td>
                <td>{s.class_name}</td>
                <td>{s.section || "—"}</td>
                <td style={{ color: "var(--gray)" }}>{s.address || "—"}</td>
                <td style={{ color: "var(--gray)" }}>{s.phone || "—"}</td>
                <td>د.ع {formatNumber(s.total_fee)}</td>
                <td style={{ color: "#10B981", fontWeight: 600 }}>
                  د.ع {formatNumber(s.paid_fee)}
                </td>
                <td
                  style={{
                    color: s.remaining_fee > 0 ? "#EF4444" : "#10B981",
                    fontWeight: 600,
                  }}
                >
                  د.ع {formatNumber(s.remaining_fee)}
                </td>
                <td>
                  <span className="badge" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </td>
                <td>
                  {actions.length > 0 && (
                    <button
                      className="btn-action"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => openMenu(e, s)}
                    >
                      خيارات ▾
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
          <button
            className="btn-nav disabled:opacity-50 px-4 py-2 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg cursor-pointer hover:shadow-md transition-all disabled:cursor-not-allowed"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            السابق
          </button>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            صفحة {page} من {totalPages} | {totalCount} طالب
          </span>
          <button
            className="btn-nav disabled:opacity-50 px-4 py-2 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg cursor-pointer hover:shadow-md transition-all disabled:cursor-not-allowed"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
