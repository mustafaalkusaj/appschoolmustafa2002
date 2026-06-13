"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  ChevronDown,
  Download,
  Plus,
  Search,
  Lock,
  RotateCcw,
} from "lucide-react";
import type { GradeFilters, ClassOption, SectionOption, SubjectOption, GradeType } from "../_types";

interface GradesFiltersProps {
  filters: GradeFilters;
  onChange: (patch: Partial<GradeFilters>) => void;
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  gradeTypes: GradeType[];
  onExport: () => void;
  onAddEntry: () => void;
  exporting: boolean;
  canEnterGrades: boolean;
  onLock: () => void;
  locking: boolean;
}

const fieldClasses =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

const ACADEMIC_YEARS = (() => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const base = month >= 9 ? year : year - 1;
  return [`${base}-${base + 1}`, `${base - 1}-${base}`, `${base - 2}-${base - 1}`];
})();

const STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "draft", label: "مسودة" },
  { value: "confirmed", label: "مؤكد" },
  { value: "locked", label: "مقفول" },
];

export function GradesFilters({
  filters,
  onChange,
  classes,
  sections,
  subjects,
  gradeTypes,
  onExport,
  onAddEntry,
  exporting,
  canEnterGrades,
  onLock,
  locking,
}: GradesFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const filteredSections = sections.filter(
    (s) => !filters.classId || s.class_id === filters.classId
  );

  const hasActiveFilters =
    filters.classId !== "" ||
    filters.sectionId !== "" ||
    filters.subjectId !== "" ||
    filters.gradeTypeId !== "" ||
    filters.status !== "";

  const handleReset = () => {
    onChange({
      classId: "",
      sectionId: "",
      subjectId: "",
      gradeTypeId: "",
      status: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--text-primary)]">فلترة الدرجات</p>
            <p className="text-[10px] text-[var(--text-muted)]">اختر الصف والمادة لعرض الدرجات</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export */}
          <button
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--card-bg)] transition-all disabled:opacity-40"
          >
            <Download size={14} />
            <span className="hidden sm:inline">{exporting ? "جاري التصدير..." : "تصدير Excel"}</span>
          </button>

          {/* Lock */}
          {canEnterGrades && (
            <button
              onClick={onLock}
              disabled={locking}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40"
            >
              <Lock size={14} />
              <span className="hidden sm:inline">{locking ? "جاري القفل..." : "قفل الدرجات"}</span>
            </button>
          )}

          {/* Advanced filters toggle */}
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold border transition-all ${
              hasActiveFilters || advancedOpen
                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                : "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--card-bg)]"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">فلاتر متقدمة</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            )}
            <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.span>
          </button>

          {/* Add grade */}
          {canEnterGrades && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAddEntry}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-black text-white bg-[var(--primary)] shadow-lg shadow-[var(--primary)]/25"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">إدخال درجة</span>
              <span className="sm:hidden">+</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Search bar — always visible */}
      <div className="relative">
        <Search
          size={15}
          className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="بحث عن اسم الطالب أو المادة..."
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] ps-10 pe-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
        />
      </div>

      {/* Quick row: Year | Semester | Class | Section | Subject | Type | Status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {/* Academic year */}
        <select
          className={fieldClasses}
          value={filters.academicYear}
          onChange={(e) => onChange({ academicYear: e.target.value })}
        >
          {ACADEMIC_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Semester toggle */}
        <div className="flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card-bg)]">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ semester: s })}
              className={`flex-1 h-10 text-sm font-bold transition-colors ${
                filters.semester === s
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              الفصل {s}
            </button>
          ))}
        </div>

        {/* Class */}
        <select
          className={fieldClasses}
          value={filters.classId}
          onChange={(e) => onChange({ classId: e.target.value, sectionId: "" })}
        >
          <option value="">كل الصفوف</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Section */}
        <select
          className={fieldClasses}
          value={filters.sectionId}
          onChange={(e) => onChange({ sectionId: e.target.value })}
          disabled={filteredSections.length === 0}
        >
          <option value="">كل الشعب</option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Subject */}
        <select
          className={fieldClasses}
          value={filters.subjectId}
          onChange={(e) => onChange({ subjectId: e.target.value })}
        >
          <option value="">كل المواد</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Grade type */}
        <select
          className={fieldClasses}
          value={filters.gradeTypeId}
          onChange={(e) => onChange({ gradeTypeId: e.target.value })}
        >
          <option value="">كل الأنواع</option>
          {gradeTypes.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {/* Status */}
        <select
          className={fieldClasses}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Advanced collapsible panel with reset */}
      <AnimatePresence>
        {advancedOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                  الفلاتر النشطة
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <RotateCcw size={11} />
                    إعادة ضبط الفلاتر
                  </button>
                )}
              </div>
              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {filters.classId && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      الصف محدد
                      <button onClick={() => onChange({ classId: "", sectionId: "" })} className="hover:text-[var(--danger)] ms-1">×</button>
                    </span>
                  )}
                  {filters.sectionId && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      الشعبة محددة
                      <button onClick={() => onChange({ sectionId: "" })} className="hover:text-[var(--danger)] ms-1">×</button>
                    </span>
                  )}
                  {filters.subjectId && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      المادة محددة
                      <button onClick={() => onChange({ subjectId: "" })} className="hover:text-[var(--danger)] ms-1">×</button>
                    </span>
                  )}
                  {filters.gradeTypeId && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      نوع الدرجة محدد
                      <button onClick={() => onChange({ gradeTypeId: "" })} className="hover:text-[var(--danger)] ms-1">×</button>
                    </span>
                  )}
                  {filters.status && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)]">
                      {STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}
                      <button onClick={() => onChange({ status: "" })} className="hover:text-[var(--danger)] ms-1">×</button>
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)] mt-2">لا توجد فلاتر نشطة</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
