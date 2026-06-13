"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { Download, FileSpreadsheet, CheckSquare, RotateCcw, GraduationCap, Phone, Wallet, UserRound } from "lucide-react";

export type ExportFieldKey =
  | "name" | "className" | "section" | "phone" | "phone2"
  | "address" | "totalFees" | "paid" | "remaining" | "discount"
  | "status" | "regNumber" | "dob" | "parentName" | "gender"
  | "prevSchool" | "createdAt";

type FieldDef = { key: ExportFieldKey; label: string; required?: boolean; group: string };

const FIELD_DEFS: FieldDef[] = [
  { key: "name",       label: "الاسم الكامل",     required: true, group: "الأساسية" },
  { key: "className",  label: "الصف",              group: "الأساسية" },
  { key: "section",    label: "الشعبة",            group: "الأساسية" },
  { key: "status",     label: "الحالة",            group: "الأساسية" },
  { key: "regNumber",  label: "رقم القيد",         group: "الأساسية" },
  { key: "phone",      label: "الهاتف",            group: "بيانات التواصل" },
  { key: "phone2",     label: "هاتف 2",            group: "بيانات التواصل" },
  { key: "address",    label: "العنوان",           group: "بيانات التواصل" },
  { key: "parentName", label: "اسم ولي الأمر",    group: "بيانات التواصل" },
  { key: "totalFees",  label: "إجمالي الرسوم",    group: "الرسوم المالية" },
  { key: "paid",       label: "المدفوع",           group: "الرسوم المالية" },
  { key: "remaining",  label: "المتبقي",           group: "الرسوم المالية" },
  { key: "discount",   label: "الخصم",             group: "الرسوم المالية" },
  { key: "dob",        label: "تاريخ الميلاد",    group: "بيانات شخصية" },
  { key: "gender",     label: "الجنس",             group: "بيانات شخصية" },
  { key: "prevSchool", label: "المدرسة السابقة",  group: "بيانات شخصية" },
  { key: "createdAt",  label: "تاريخ التسجيل",    group: "بيانات شخصية" },
];

const DEFAULT_FIELDS: Set<ExportFieldKey> = new Set<ExportFieldKey>([
  "name", "className", "section", "phone", "address",
  "totalFees", "paid", "remaining", "status",
]);

const GROUPS = ["الأساسية", "بيانات التواصل", "الرسوم المالية", "بيانات شخصية"];

const GROUP_ICONS: Record<string, typeof GraduationCap> = {
  "الأساسية": GraduationCap,
  "بيانات التواصل": Phone,
  "الرسوم المالية": Wallet,
  "بيانات شخصية": UserRound,
};

const GROUP_COLORS: Record<string, string> = {
  "الأساسية": "var(--primary)",
  "بيانات التواصل": "var(--info)",
  "الرسوم المالية": "var(--success)",
  "بيانات شخصية": "var(--warning)",
};

interface ExportFieldsModalProps {
  show: boolean;
  onClose: () => void;
  onExport: (fields: Set<ExportFieldKey>) => void;
  loading?: boolean;
}

export function ExportFieldsModal({ show, onClose, onExport, loading }: ExportFieldsModalProps) {
  const [selected, setSelected] = useState<Set<ExportFieldKey>>(new Set(DEFAULT_FIELDS));

  function toggle(key: ExportFieldKey) {
    if (FIELD_DEFS.find(f => f.key === key)?.required) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectGroup(group: string, on: boolean) {
    setSelected(prev => {
      const next = new Set(prev);
      FIELD_DEFS.filter(f => f.group === group && !f.required).forEach(f => {
        on ? next.add(f.key) : next.delete(f.key);
      });
      return next;
    });
  }

  function selectAll() { setSelected(new Set(FIELD_DEFS.map(f => f.key))); }
  function selectDefault() { setSelected(new Set(DEFAULT_FIELDS)); }

  const total = FIELD_DEFS.length;

  return (
    <Modal open={show} onClose={onClose} size="lg">
      {/* Gradient Header */}
      <div
        className="relative overflow-hidden rounded-t-[var(--modal-radius)] px-6 py-5"
        style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #7c3aed) 100%)" }}
      >
        <div className="absolute top-0 end-0 w-40 h-40 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(40%, -40%)" }} />
        <div className="absolute bottom-0 start-8 w-24 h-24 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">تصدير Excel</h2>
              <p className="text-white/70 text-xs mt-0.5">اختر الحقول التي تريد تصديرها</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
              {selected.size} / {total}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-white/20"
              style={{ color: "white" }}
              aria-label="إغلاق"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="relative flex gap-2 mt-4">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          >
            <CheckSquare className="w-3 h-3" />
            تحديد الكل
          </button>
          <button
            onClick={selectDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
          >
            <RotateCcw className="w-3 h-3" />
            الافتراضية
          </button>
        </div>
      </div>

      <ModalBody className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GROUPS.map(group => {
          const fields = FIELD_DEFS.filter(f => f.group === group);
          const nonRequired = fields.filter(f => !f.required);
          const allOn = nonRequired.every(f => selected.has(f.key));
          const someOn = nonRequired.some(f => selected.has(f.key));

          const GroupIcon = GROUP_ICONS[group];
          const groupColor = GROUP_COLORS[group] ?? "var(--primary)";

          return (
            <div key={group} className="rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-soft)] border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${groupColor} 12%, transparent)` }}>
                    {GroupIcon && <GroupIcon size={14} style={{ color: groupColor }} />}
                  </div>
                  <span className="text-xs font-black text-[var(--text-secondary)] tracking-wide">{group}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)]">
                    {fields.filter(f => selected.has(f.key)).length}/{fields.length}
                  </span>
                </div>
                {nonRequired.length > 0 && (
                  <button
                    onClick={() => selectGroup(group, !allOn)}
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition",
                      allOn || someOn
                        ? "border-[var(--primary)] text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    )}
                  >
                    {allOn ? "إلغاء الكل" : "تحديد الكل"}
                  </button>
                )}
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-1 gap-1.5 p-3 bg-[var(--surface)]">
                {fields.map(f => {
                  const checked = selected.has(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggle(f.key)}
                      disabled={f.required}
                      className={cn(
                        "group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-semibold text-start transition-all duration-150",
                        checked
                          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]",
                        f.required && "opacity-70 cursor-not-allowed",
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        "w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 border transition-all",
                        checked
                          ? "bg-[var(--primary)] border-[var(--primary)]"
                          : "border-[var(--border)] bg-[var(--surface)]",
                      )}>
                        {checked && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="leading-tight">{f.label}</span>
                      {f.required && (
                        <span className="me-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                          مطلوب
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </ModalBody>

      <ModalFooter className="pt-4">
        <Button
          onClick={() => onExport(selected)}
          disabled={loading || selected.size === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {loading ? "جاري التصدير..." : `تصدير ${selected.size} حقل`}
        </Button>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      </ModalFooter>
    </Modal>
  );
}
