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
