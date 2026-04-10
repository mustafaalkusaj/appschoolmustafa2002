"use client";

import { AppIcon } from "@/components/AppIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerHeader, DrawerBody } from "@/components/ui/drawer";
import { formatNumber, formatDate } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
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
    <Drawer open={true} onClose={onClose} side="end" width="480px">
      <DrawerHeader
        title={`تفاصيل — ${teacher.full_name}`}
        onClose={onClose}
      />
      <DrawerBody className="space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              المعلومات
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الاسم:</span>
                <span className="font-semibold text-[var(--text-primary)]">{teacher.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">المسمى:</span>
                <span className="font-semibold text-[var(--text-primary)]">{teacher.job_title || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">المادة:</span>
                <span className="font-semibold text-[var(--text-primary)]">{teacher.subject || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الهاتف:</span>
                <span className="font-semibold text-[var(--text-primary)]">{teacher.phone || "—"}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              الرواتب
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">نظام الراتب:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {SALARY_TYPES.find((s) => s.value === teacher.salary_type)?.label || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الأساسي:</span>
                <span className="font-semibold text-[var(--text-primary)]">د.ع {formatNumber(teacher.base_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">سعر المحاضرة:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  د.ع {formatNumber(teacher.lecture_price || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">عدد الرواتب:</span>
                <span className="font-semibold text-[var(--text-primary)]">{teacherSalaries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">إجمالي المستلم:</span>
                <span className="font-bold text-[var(--success)]">
                  د.ع {formatNumber(totalReceived)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Classes Taught */}
        {teacher.classes_taught && teacher.classes_taught.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              الصفوف والشعب
            </div>
            <div className="flex flex-wrap gap-2">
              {teacher.classes_taught.map((c, i) => (
                <Badge key={i} variant="primary" size="sm">
                  {c.grade} ({c.section})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Salary History */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            سجل الرواتب ({teacherSalaries.length})
          </span>
          <Button size="sm" onClick={() => onPaySalary(teacher)}>
            + دفع راتب
          </Button>
        </div>

        {teacherSalaries.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            لا توجد رواتب بعد
          </div>
        ) : (
          <div className="space-y-2">
            {teacherSalaries.map((s, i) => {
              const net = (s.gross_salary || 0) - (s.deductions || 0);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--success)] text-sm">
                        د.ع {formatNumber(net)}
                      </span>
                      <Badge variant="primary" size="sm">{s.month}</Badge>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {s.paid_at ? formatDate(s.paid_at) : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => onPrintSalarySlip(s)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                      "hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors"
                    )}
                  >
                    <AppIcon token="🖨️" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </DrawerBody>
    </Drawer>
  );
}
