"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber, formatDate } from "@/lib/formatting";
import { SALARY_TYPES } from "../_types";
import type { Teacher, Salary } from "../_types";

interface TeacherDetailPanelProps {
  teacher: Teacher;
  salaries: Salary[];
  currentMonth: string;
  onClose: () => void;
  onPaySalary: (teacher: Teacher) => void;
  onPrintSalarySlip: (salary: Salary) => void;
}

export function TeacherDetailPanel({
  teacher,
  salaries,
  currentMonth: _currentMonth,
  onClose,
  onPaySalary,
  onPrintSalarySlip,
}: TeacherDetailPanelProps) {
  const teacherSalaries = salaries
    .filter((s) => s.teacher_id === teacher.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  const totalReceived = teacherSalaries.reduce(
    (a, s) => a + (s.gross_salary || 0) - (s.deductions || 0),
    0
  );

  return (
    <div className="det-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="det-panel">
        <div className="det-hdr">
          <div className="det-ttl">تفاصيل — {teacher.full_name}</div>
          <button className="det-cls" onClick={onClose}>
            <AppIcon token="✕" size={12} />
          </button>
        </div>

        <div className="dp-cards">
          <div className="dp-card">
            <div className="dp-ct">المعلومات</div>
            <div className="dp-row">
              <span className="dp-lbl">الاسم:</span>
              <span className="dp-val">{teacher.full_name}</span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">المسمى:</span>
              <span className="dp-val">{teacher.job_title || "—"}</span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">المادة:</span>
              <span className="dp-val">{teacher.subject || "—"}</span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">الهاتف:</span>
              <span className="dp-val">{teacher.phone || "—"}</span>
            </div>
          </div>
          <div className="dp-card">
            <div className="dp-ct">الرواتب</div>
            <div className="dp-row">
              <span className="dp-lbl">نظام الراتب:</span>
              <span className="dp-val">
                {SALARY_TYPES.find((s) => s.value === teacher.salary_type)?.label || "—"}
              </span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">الأساسي:</span>
              <span className="dp-val">د.ع {formatNumber(teacher.base_salary)}</span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">سعر المحاضرة:</span>
              <span className="dp-val">
                د.ع {formatNumber(teacher.lecture_price || 0)}
              </span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">عدد الرواتب:</span>
              <span className="dp-val">{teacherSalaries.length}</span>
            </div>
            <div className="dp-row">
              <span className="dp-lbl">إجمالي المستلم:</span>
              <span className="dp-val" style={{ color: "#10B981" }}>
                د.ع {formatNumber(totalReceived)}
              </span>
            </div>
          </div>
        </div>

        {teacher.classes_taught && teacher.classes_taught.length > 0 && (
          <div
            style={{
              background: "#F7FBFF",
              borderRadius: 12,
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: ".8rem",
                fontWeight: 700,
                color: "var(--p2)",
                marginBottom: ".6rem",
              }}
            >
              الصفوف والشعب
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
              {teacher.classes_taught.map((c, i) => (
                <span
                  key={i}
                  className="badge"
                  style={{ background: "#EDF6FF", color: "var(--p3)", fontSize: ".75rem" }}
                >
                  {c.grade} ({c.section})
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: ".8rem",
          }}
        >
          <span style={{ fontSize: ".88rem", fontWeight: 800 }}>
            سجل الرواتب ({teacherSalaries.length})
          </span>
          <button
            className="btn-add"
            style={{ padding: ".4rem .8rem", fontSize: ".75rem" }}
            onClick={() => onPaySalary(teacher)}
          >
            + دفع راتب
          </button>
        </div>

        {teacherSalaries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "var(--gray)",
              fontSize: ".85rem",
            }}
          >
            لا توجد رواتب بعد
          </div>
        ) : (
          teacherSalaries.map((s, i) => {
            const net = (s.gross_salary || 0) - (s.deductions || 0);
            return (
              <div className="sal-row" key={s.id}>
                <div className="sal-num">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#10B981",
                        fontSize: ".85rem",
                      }}
                    >
                      د.ع {formatNumber(net)}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: "#EDF6FF",
                        color: "var(--p3)",
                        fontSize: ".65rem",
                      }}
                    >
                      {s.month}
                    </span>
                  </div>
                  <div style={{ fontSize: ".7rem", color: "var(--gray)" }}>
                    {s.paid_at ? formatDate(s.paid_at) : "—"}
                  </div>
                </div>
                <button
                  className="btn-print-sm"
                  onClick={() => onPrintSalarySlip(s)}
                >
                  <AppIcon token="🖨️" size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
