"use client";

import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber, formatDate } from "@/lib/formatting";
import type { Deduction, Teacher } from "../_types";

interface DeductionsSectionProps {
  teachers: Teacher[];
  deductionsList: Deduction[];
  deductionTeacher: string;
  deductionAmount: string;
  deductionNotes: string;
  saving: boolean;
  onUpdateTeacher: (id: string) => void;
  onUpdateAmount: (amount: string) => void;
  onUpdateNotes: (notes: string) => void;
  onSave: () => void;
}

export function DeductionsSection({
  teachers,
  deductionsList,
  deductionTeacher,
  deductionAmount,
  deductionNotes,
  saving,
  onUpdateTeacher,
  onUpdateAmount,
  onUpdateNotes,
  onSave,
}: DeductionsSectionProps) {
  return (
    <div className="space-y-6">
      {/* New Deduction Form */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[var(--text-primary)]">
          <AppIcon token="💸" size={16} />
          تسجيل سحب جديد
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="اسم الأستاذ" className="col-span-2">
            <Select
              value={deductionTeacher}
              onChange={(e) => onUpdateTeacher(e.target.value)}
            >
              <option value="">اختر الأستاذ...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="مبلغ السحب (د.ع)">
            <Input
              type="number"
              value={deductionAmount}
              onChange={(e) => onUpdateAmount(e.target.value)}
            />
          </FormField>

          <FormField label="الملاحظات (اختياري)">
            <Input
              value={deductionNotes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="أي ملاحظات..."
            />
          </FormField>
        </div>
        <div className="mt-4">
          <Button
            onClick={onSave}
            loading={saving}
            disabled={saving || !deductionTeacher}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ السحب"}
          </Button>
        </div>
      </div>

      {/* Deductions Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        {deductionsList.length === 0 ? (
          <EmptyState
            title="لا توجد سحوبات مسجلة"
            description="استخدم النموذج أعلاه لتسجيل سحب جديد"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">#</th>
                <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">الأستاذ</th>
                <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">المبلغ</th>
                <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">التاريخ</th>
                <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {deductionsList.map((d, i) => (
                <tr key={d.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{d.teachers?.full_name || "—"}</td>
                  <td className="px-4 py-3 font-bold text-[var(--danger)]">
                    د.ع {formatNumber(d.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {formatDate(d.deduction_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {d.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
