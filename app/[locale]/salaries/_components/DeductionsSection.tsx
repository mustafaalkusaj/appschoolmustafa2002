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
  const amountPreview = deductionAmount ? parseFloat(deductionAmount) : null;

  return (
    <div className="space-y-6">
      {/* New Deduction Form */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] border-s-4 border-s-[var(--danger)]">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb,var(--danger) 12%,transparent)" }}
          >
            <AppIcon token="💸" size={16} />
          </div>
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">تسجيل سحب جديد</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">أدخل بيانات السحب من راتب الأستاذ</div>
          </div>
          {amountPreview !== null && !isNaN(amountPreview) && amountPreview > 0 && (
            <div className="ms-auto text-sm font-black tabular-nums" style={{ color: "var(--danger)" }}>
              − د.ع {formatNumber(amountPreview)}
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-5">
            <FormField label="اسم الأستاذ" className="col-span-2">
              <Select
                value={deductionTeacher}
                onChange={(e) => onUpdateTeacher(e.target.value)}
              >
                <option value="">اختر الأستاذ...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="مبلغ السحب (د.ع)">
              <Input
                type="number"
                value={deductionAmount}
                onChange={(e) => onUpdateAmount(e.target.value)}
                placeholder="0"
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

          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={onSave}
              loading={saving}
              disabled={saving || !deductionTeacher}
            >
              <AppIcon token="💾" size={14} />
              {saving ? "جارٍ الحفظ..." : "حفظ السحب"}
            </Button>
          </div>
        </div>
      </div>

      {/* Deductions Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        {/* Table Header Label */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-soft)]">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb,var(--danger) 12%,transparent)" }}
          >
            <AppIcon token="📋" size={13} />
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">سجل السحوبات</span>
          {deductionsList.length > 0 && (
            <span
              className="ms-auto text-xs font-bold px-2.5 py-1 rounded-full tabular-nums"
              style={{
                background: "color-mix(in srgb,var(--danger) 12%,transparent)",
                color: "var(--danger)",
              }}
            >
              {deductionsList.length} سحب
            </span>
          )}
        </div>

        {deductionsList.length === 0 ? (
          <EmptyState
            title="لا توجد سحوبات مسجلة"
            description="استخدم النموذج أعلاه لتسجيل سحب جديد"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    الأستاذ
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    المبلغ
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    التاريخ
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    ملاحظات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {deductionsList.map((d, i) => (
                  <tr
                    key={d.id}
                    className="hover:bg-[var(--surface-soft)]/60 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold tabular-nums"
                        style={{
                          background: "color-mix(in srgb,var(--text-muted) 10%,transparent)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-[var(--text-primary)]">
                      {d.teachers?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-black tabular-nums text-sm" style={{ color: "var(--danger)" }}>
                        − د.ع {formatNumber(d.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)] tabular-nums">
                      {formatDate(d.deduction_date)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                      {d.notes ? (
                        <span className="italic">{d.notes}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
