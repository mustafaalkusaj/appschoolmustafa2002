"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { Download, FileSpreadsheet, CheckSquare, RotateCcw, GraduationCap, Phone, Briefcase, UserRound } from "lucide-react";

export type TeacherExportFieldKey =
  | "employeeId" | "fullName" | "subject" | "jobTitle" | "contractType"
  | "phone" | "email" | "gender" | "hireDate" | "experience"
  | "status" | "appAccount";

type FieldDef = { key: TeacherExportFieldKey; label: string; labelEn: string; required?: boolean; group: string; groupEn: string };

const FIELD_DEFS: FieldDef[] = [
  { key: "fullName",      label: "الاسم الكامل",     labelEn: "Full Name",          required: true, group: "الأساسية",      groupEn: "Basic" },
  { key: "employeeId",    label: "رقم الموظف",       labelEn: "Employee ID",        group: "الأساسية",      groupEn: "Basic" },
  { key: "subject",       label: "المادة",            labelEn: "Subject",            group: "الأساسية",      groupEn: "Basic" },
  { key: "jobTitle",      label: "المسمى الوظيفي",   labelEn: "Job Title",          group: "الأساسية",      groupEn: "Basic" },
  { key: "status",        label: "الحالة",            labelEn: "Status",             group: "الأساسية",      groupEn: "Basic" },
  { key: "phone",         label: "الهاتف",            labelEn: "Phone",              group: "بيانات التواصل", groupEn: "Contact" },
  { key: "email",         label: "البريد الإلكتروني", labelEn: "Email",              group: "بيانات التواصل", groupEn: "Contact" },
  { key: "contractType",  label: "نوع العقد",         labelEn: "Contract Type",      group: "بيانات وظيفية",  groupEn: "Employment" },
  { key: "hireDate",      label: "تاريخ التعيين",    labelEn: "Hire Date",          group: "بيانات وظيفية",  groupEn: "Employment" },
  { key: "experience",    label: "سنوات الخبرة",     labelEn: "Years of Experience", group: "بيانات وظيفية",  groupEn: "Employment" },
  { key: "gender",        label: "الجنس",             labelEn: "Gender",             group: "بيانات شخصية",   groupEn: "Personal" },
  { key: "appAccount",    label: "حساب التطبيق",     labelEn: "App Account",        group: "بيانات شخصية",   groupEn: "Personal" },
];

const DEFAULT_FIELDS: Set<TeacherExportFieldKey> = new Set<TeacherExportFieldKey>([
  "fullName", "employeeId", "subject", "jobTitle", "phone", "status", "contractType",
]);

const GROUPS = ["الأساسية", "بيانات التواصل", "بيانات وظيفية", "بيانات شخصية"];
const GROUPS_EN = ["Basic", "Contact", "Employment", "Personal"];

const GROUP_ICONS: Record<string, typeof GraduationCap> = {
  "الأساسية": GraduationCap,
  "بيانات التواصل": Phone,
  "بيانات وظيفية": Briefcase,
  "بيانات شخصية": UserRound,
};

const GROUP_COLORS: Record<string, string> = {
  "الأساسية": "var(--primary)",
  "بيانات التواصل": "var(--info)",
  "بيانات وظيفية": "var(--success)",
  "بيانات شخصية": "var(--warning)",
};

interface TeacherExportFieldsModalProps {
  show: boolean;
  onClose: () => void;
  onExport: (fields: Set<TeacherExportFieldKey>) => void;
  loading?: boolean;
  locale?: "ar" | "en";
}

export function TeacherExportFieldsModal({ show, onClose, onExport, loading, locale = "ar" }: TeacherExportFieldsModalProps) {
  const isEn = locale === "en";
  const [selected, setSelected] = useState<Set<TeacherExportFieldKey>>(new Set(DEFAULT_FIELDS));

  function toggle(key: TeacherExportFieldKey) {
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
              <h2 className="text-base font-black text-white leading-tight">{isEn ? "Export Excel" : "تصدير Excel"}</h2>
              <p className="text-white/70 text-xs mt-0.5">{isEn ? "Choose the fields to export" : "اختر الحقول التي تريد تصديرها"}</p>
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
              aria-label={isEn ? "Close" : "إغلاق"}
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
            {isEn ? "Select All" : "تحديد الكل"}
          </button>
          <button
            onClick={selectDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
          >
            <RotateCcw className="w-3 h-3" />
            {isEn ? "Defaults" : "الافتراضية"}
          </button>
        </div>
      </div>

      <ModalBody className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GROUPS.map((group, gi) => {
          const fields = FIELD_DEFS.filter(f => f.group === group);
          const nonRequired = fields.filter(f => !f.required);
          const allOn = nonRequired.every(f => selected.has(f.key));
          const someOn = nonRequired.some(f => selected.has(f.key));

          const GroupIcon = GROUP_ICONS[group];
          const groupColor = GROUP_COLORS[group] ?? "var(--primary)";
          const groupLabel = isEn ? GROUPS_EN[gi] : group;

          return (
            <div key={group} className="rounded-xl border border-[var(--border)] overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-soft)] border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${groupColor} 12%, transparent)` }}>
                    {GroupIcon && <GroupIcon size={14} style={{ color: groupColor }} />}
                  </div>
                  <span className="text-xs font-black text-[var(--text-secondary)] tracking-wide">{groupLabel}</span>
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
                    {allOn ? (isEn ? "Deselect" : "إلغاء الكل") : (isEn ? "Select All" : "تحديد الكل")}
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
                      <span className="leading-tight">{isEn ? f.labelEn : f.label}</span>
                      {f.required && (
                        <span className="me-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
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
        </div>
      </ModalBody>

      <ModalFooter className="pt-4">
        <Button
          onClick={() => onExport(selected)}
          disabled={loading || selected.size === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {loading
            ? (isEn ? "Exporting..." : "جاري التصدير...")
            : (isEn ? `Export ${selected.size} fields` : `تصدير ${selected.size} حقل`)}
        </Button>
        <Button variant="secondary" onClick={onClose}>{isEn ? "Cancel" : "إلغاء"}</Button>
      </ModalFooter>
    </Modal>
  );
}
