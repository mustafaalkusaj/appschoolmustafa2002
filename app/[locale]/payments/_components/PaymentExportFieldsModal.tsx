"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { Download, FileSpreadsheet, CheckSquare, RotateCcw, GraduationCap, Phone, Banknote, Tag } from "lucide-react";

export type PaymentExportFieldKey =
  | "fullName" | "className" | "section" | "phone" | "address"
  | "totalFee" | "paidFee" | "discount" | "remainingFee" | "status";

type FieldDef = { key: PaymentExportFieldKey; label: string; labelEn: string; required?: boolean; group: string; groupEn: string };

const FIELD_DEFS: FieldDef[] = [
  { key: "fullName",      label: "اسم الطالب",      labelEn: "Student Name",    required: true, group: "بيانات الطالب",  groupEn: "Student" },
  { key: "className",     label: "الصف",            labelEn: "Class",           group: "بيانات الطالب",  groupEn: "Student" },
  { key: "section",       label: "الشعبة",          labelEn: "Section",         group: "بيانات الطالب",  groupEn: "Student" },
  { key: "phone",         label: "رقم الهاتف",      labelEn: "Phone",           group: "بيانات التواصل", groupEn: "Contact" },
  { key: "address",       label: "العنوان",          labelEn: "Address",         group: "بيانات التواصل", groupEn: "Contact" },
  { key: "totalFee",      label: "المبلغ الكلي",    labelEn: "Total Fee",       group: "البيانات المالية", groupEn: "Financial" },
  { key: "paidFee",       label: "المبلغ المدفوع",  labelEn: "Paid Amount",     group: "البيانات المالية", groupEn: "Financial" },
  { key: "discount",      label: "التخفيض",         labelEn: "Discount",        group: "البيانات المالية", groupEn: "Financial" },
  { key: "remainingFee",  label: "المبلغ المتبقي",  labelEn: "Remaining",       group: "البيانات المالية", groupEn: "Financial" },
  { key: "status",        label: "حالة الدفع",      labelEn: "Payment Status",  group: "أخرى",           groupEn: "Other" },
];

const DEFAULT_FIELDS: Set<PaymentExportFieldKey> = new Set<PaymentExportFieldKey>([
  "fullName", "className", "section", "phone", "totalFee", "paidFee", "discount", "remainingFee",
]);

const GROUPS = ["بيانات الطالب", "بيانات التواصل", "البيانات المالية", "أخرى"];
const GROUPS_EN = ["Student", "Contact", "Financial", "Other"];

const GROUP_ICONS: Record<string, typeof GraduationCap> = {
  "بيانات الطالب": GraduationCap,
  "بيانات التواصل": Phone,
  "البيانات المالية": Banknote,
  "أخرى": Tag,
};

const GROUP_COLORS: Record<string, string> = {
  "بيانات الطالب": "var(--primary)",
  "بيانات التواصل": "var(--info)",
  "البيانات المالية": "var(--success)",
  "أخرى": "var(--warning)",
};

interface Props {
  show: boolean;
  onClose: () => void;
  onExport: (fields: Set<PaymentExportFieldKey>) => void | Promise<void>;
  exporting?: boolean;
  locale?: string;
}

export function PaymentExportFieldsModal({ show, onClose, onExport, exporting, locale }: Props) {
  const isEn = locale === "en";
  const [selected, setSelected] = useState<Set<PaymentExportFieldKey>>(new Set(DEFAULT_FIELDS));

  const toggle = (key: PaymentExportFieldKey) => {
    const def = FIELD_DEFS.find(f => f.key === key);
    if (def?.required) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(FIELD_DEFS.map(f => f.key)));
  const resetDefaults = () => setSelected(new Set(DEFAULT_FIELDS));

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <div
        className="relative overflow-hidden rounded-t-2xl px-6 py-5"
        style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <FileSpreadsheet size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-white leading-tight">{isEn ? "Export Excel" : "تصدير Excel"}</h2>
            <p className="text-white/70 text-xs mt-0.5">{isEn ? "Choose the fields to export" : "اختر الحقول التي تريد تصديرها"}</p>
          </div>
        </div>
      </div>

      <ModalBody className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--text-muted)]">
            {isEn ? `${selected.size} of ${FIELD_DEFS.length} fields selected` : `${selected.size} من ${FIELD_DEFS.length} حقل محدد`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] hover:underline">
              <CheckSquare size={12} /> {isEn ? "Select all" : "تحديد الكل"}
            </button>
            <button onClick={resetDefaults} className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] hover:underline">
              <RotateCcw size={12} /> {isEn ? "Reset" : "إعادة تعيين"}
            </button>
          </div>
        </div>

        {GROUPS.map((group, gi) => {
          const Icon = GROUP_ICONS[group] ?? Tag;
          const color = GROUP_COLORS[group] ?? "var(--text-muted)";
          const groupFields = FIELD_DEFS.filter(f => f.group === group);
          return (
            <div key={group} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <span className="text-xs font-black" style={{ color }}>{isEn ? GROUPS_EN[gi] : group}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {groupFields.map(f => {
                  const active = selected.has(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggle(f.key)}
                      disabled={f.required}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-start",
                        active
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:border-[var(--primary)]/20",
                        f.required && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                        active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
                      )}>
                        {active && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </div>
                      <span>{isEn ? f.labelEn : f.label}</span>
                      {f.required && (
                        <span className="absolute top-1 left-1 text-[8px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded-full">
                          {isEn ? "Required" : "مطلوب"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </ModalBody>

      <ModalFooter className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>{isEn ? "Cancel" : "إلغاء"}</Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void onExport(selected)}
          disabled={exporting || selected.size === 0}
          className="gap-2"
        >
          <Download size={14} />
          {exporting
            ? (isEn ? "Exporting..." : "جاري التصدير...")
            : (isEn ? `Export ${selected.size} fields` : `تصدير ${selected.size} حقل`)}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
