"use client";

import { formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Student, PAGE_SIZE } from "../_types";

interface PaymentsTableProps {
  students: Student[];
  paymentCountsByStudent: Record<string, number>;
  loading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onStudentClick: (student: Student) => void;
  onAddPayment: (student: Student) => void;
}

export function PaymentsTable({
  students,
  paymentCountsByStudent,
  loading,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onStudentClick,
  onAddPayment,
}: PaymentsTableProps) {
  if (loading) {
    return (
      <div className="tbl-wrap">
        <div className="spin" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="tbl-wrap">
        <div className="empty">لا توجد نتائج</div>
      </div>
    );
  }

  return (
    <div className="tbl-wrap">
      <div className="tbl-mobile-cards">
        {students.map((s, i) => {
          const pct = s.total_fee > 0 ? Math.min(100, Math.round((s.paid_fee / s.total_fee) * 100)) : 0;
          return (
            <article key={s.id} className="tbl-mobile-card">
              <div className="tbl-mobile-card__header">
                <div>
                  <button
                    type="button"
                    className="student-link tbl-mobile-card__title"
                    onClick={() => onStudentClick(s)}
                  >
                    {s.full_name}
                  </button>
                  <div className="tbl-mobile-card__subtitle">
                    #{(page - 1) * PAGE_SIZE + i + 1} • {s.class_name || "بدون صف"} •{" "}
                    {formatNumber(paymentCountsByStudent[s.id] ?? 0)} دفعة
                  </div>
                </div>
                <div className="tbl-mobile-card__amount">
                  د.ع {formatNumber(s.remaining_fee)}
                </div>
              </div>

              <div className="tbl-mobile-card__grid">
                <div className="tbl-mobile-card__item">
                  <span>المدفوع</span>
                  <strong style={{ color: "#10B981" }}>د.ع {formatNumber(s.paid_fee)}</strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>الإجمالي</span>
                  <strong>د.ع {formatNumber(s.total_fee)}</strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>الخصم</span>
                  <strong>
                    {s.discount_value && s.discount_value > 0 ? `د.ع ${formatNumber(s.discount_value)}` : "—"}
                  </strong>
                </div>
                <div className="tbl-mobile-card__item">
                  <span>الهاتف</span>
                  <strong>{s.phone || "—"}</strong>
                </div>
              </div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: pct >= 100 ? "#10B981" : "#6C4AB6" }}
                />
              </div>

              <div className="tbl-mobile-card__actions">
                <button
                  type="button"
                  className="tbl-mobile-card__action tbl-mobile-card__action--primary"
                  onClick={() => onAddPayment(s)}
                >
                  إضافة دفعة
                </button>
                <button
                  type="button"
                  className="tbl-mobile-card__action"
                  onClick={() => onStudentClick(s)}
                >
                  عرض التفاصيل
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الطالب</th>
            <th>الصف والشعبة</th>
            <th>رقم الهاتف</th>
            <th>المبلغ الكلي</th>
            <th>المبلغ المدفوع</th>
            <th>الخصم</th>
            <th>المبلغ المتبقي</th>
            <th>العمليات</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const pct = s.total_fee > 0 ? Math.min(100, Math.round((s.paid_fee / s.total_fee) * 100)) : 0;
            return (
              <tr key={s.id}>
                <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>
                  <span
                    className="student-link"
                    onClick={() => onStudentClick(s)}
                  >
                    {s.full_name}
                  </span>
                  <div style={{ color: "var(--gray)", fontSize: ".7rem", marginTop: ".18rem" }}>
                    {formatNumber(paymentCountsByStudent[s.id] ?? 0)} دفعة مسجلة
                  </div>
                </td>
                <td style={{ color: "var(--gray)" }}>{s.class_name}</td>
                <td style={{ color: "var(--gray)", fontSize: ".75rem" }}>{s.phone || "—"}</td>
                <td style={{ fontWeight: 700 }}>د.ع {formatNumber(s.total_fee)}</td>
                <td style={{ color: "#10B981", fontWeight: 700 }}>د.ع {formatNumber(s.paid_fee)}</td>
                <td style={{ color: "var(--gray)" }}>
                  {s.discount_value && s.discount_value > 0 ? `د.ع ${formatNumber(s.discount_value)}` : "—"}
                </td>
                <td>
                  <div style={{ color: s.remaining_fee > 0 ? "#EF4444" : "#10B981", fontWeight: 700 }}>
                    د.ع {formatNumber(s.remaining_fee)}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: pct >= 100 ? "#10B981" : "#6C4AB6" }}
                    />
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: ".3rem", alignItems: "center" }}>
                    <button
                      className="btn-pay"
                      title="إضافة دفعة"
                      onClick={() => onAddPayment(s)}
                    >
                      <AppIcon token="$" size={14} className="text-white" />
                    </button>
                    <button
                      className="btn-print-sm"
                      title="تفاصيل"
                      onClick={() => onStudentClick(s)}
                    >
                      <AppIcon token="📋" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-nav" disabled={page === 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            السابق
          </button>
          <span className="results-count">
            صفحة {formatNumber(page)} من {formatNumber(totalPages)} | {formatNumber(totalCount)} طالب
          </span>
          <button
            className="btn-nav"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
