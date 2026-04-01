"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import type { Teacher, Salary } from "../_types";

interface TeachersTableProps {
  teachers: Teacher[];
  salaries: Salary[];
  loading: boolean;
  currentMonth: string;
  onPaySalary: (teacher: Teacher) => void;
  onShowDetail: (teacher: Teacher) => void;
  onOpenMenu: (e: React.MouseEvent, teacher: Teacher) => void;
}

export function TeachersTable({
  teachers,
  salaries,
  loading,
  currentMonth,
  onPaySalary,
  onShowDetail,
  onOpenMenu,
}: TeachersTableProps) {
  const monthSalaries = salaries.filter((s) => s.month === currentMonth);
  const paidTeacherIds = monthSalaries.map((s) => s.teacher_id);

  if (loading) {
    return (
      <div className="tbl-wrap">
        <div className="spin" />
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="tbl-wrap">
        <div className="empty">لا يوجد مدرسون — اضغط إضافة مدرس</div>
      </div>
    );
  }

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الاسم</th>
            <th>المسمى</th>
            <th>المادة</th>
            <th>الراتب</th>
            <th>سعر المحاضرة</th>
            <th>حالة الشهر</th>
            <th>خيارات</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t, i) => {
            const paid = paidTeacherIds.includes(t.id);
            return (
              <tr key={t.id}>
                <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>
                  {i + 1}
                </td>
                <td>
                  <span
                    className="name-link"
                    onClick={() => onShowDetail(t)}
                  >
                    {t.full_name}
                  </span>
                </td>
                <td style={{ color: "var(--gray)", fontSize: ".75rem" }}>
                  {t.job_title || "—"}
                </td>
                <td style={{ color: "var(--gray)" }}>{t.subject || "—"}</td>
                <td style={{ fontWeight: 700 }}>
                  د.ع {formatNumber(t.base_salary)}
                </td>
                <td style={{ fontWeight: 700, color: "#2563EB" }}>
                  د.ع {formatNumber(t.lecture_price || 0)}
                </td>
                <td>
                  {paid ? (
                    <span
                      className="badge"
                      style={{ background: "#D1FAE5", color: "#065F46" }}
                    >
                      ✓ مدفوع
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{ background: "#FEE2E2", color: "#991B1B" }}
                    >
                      غير مدفوع
                    </span>
                  )}
                </td>
                <td>
                  {!paid && (
                    <button
                      className="btn-pay-s"
                      onClick={() => onPaySalary(t)}
                    >
                      <AppIcon token="💰" size={13} /> دفع
                    </button>
                  )}
                  <button
                    className="btn-action"
                    onClick={(e) => onOpenMenu(e, t)}
                  >
                    ▾
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
