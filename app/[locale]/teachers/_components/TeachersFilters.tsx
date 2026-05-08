"use client";

// Teachers filters component

import { BookOpen, CircleOff, Download, Filter, Loader2, Search, ShieldCheck, Upload, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import type { TeachersFilterProps } from "../_types";

export function TeachersFilters({
  searchInput,
  setSearchInput,
  statusFilter,
  setStatusFilter,
  classFilter,
  setClassFilter,
  sectionFilter,
  setSectionFilter,
  subjectFilter,
  setSubjectFilter,
  classes,
  subjects,
  availableTeacherSections,
  onResetFilters,
  onRefresh,
  onExport,
  onImport,
  loading,
  query,
  normalizedClassFilter,
  normalizedSectionFilter,
  normalizedSubjectFilter,
}: TeachersFilterProps) {
  const isResetDisabled =
    !query &&
    !normalizedClassFilter &&
    !normalizedSectionFilter &&
    !normalizedSubjectFilter &&
    statusFilter === "all";

  return (
    <div className="rounded-[26px] bg-[var(--surface-muted)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-black text-[var(--text-primary)]">البحث والتصفية</div>
          <p className="text-xs leading-6 text-[var(--text-secondary)]">
            ابحث بالاسم أو معرّف الدخول أو الهاتف أو المادة، ثم صفِّ النتائج حسب الصف والشعبة والحالة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
          >
            <Download size={16} />
            تصدير إكسل
          </Button>
          <button
            type="button"
            className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
            onClick={onImport}
          >
            <Upload size={16} />
            استيراد إكسل
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
            onClick={onRefresh}
          >
            <Loader2 size={16} className={loading ? "animate-spin" : ""} />
            تحديث
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
            onClick={onResetFilters}
            disabled={isResetDisabled}
          >
            <CircleOff size={16} />
            مسح الفلاتر
          </button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,220px))]">
        <label className="relative block space-y-2">
          <span className="text-sm font-black text-[var(--text-secondary)]">بحث سريع</span>
          <Search
            size={18}
            className="pointer-events-none absolute text-[var(--text-tertiary)]"
            style={{ insetInlineStart: "1rem", top: "calc(50% + 0.95rem)", transform: "translateY(-50%)" }}
          />
          <input
            type="search"
            className="ui-input"
            style={{ paddingInlineStart: "3rem" }}
            placeholder="ابحث بالاسم أو المعرّف أو الهاتف أو المادة أو الصف"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
            <Filter size={16} />
            المادة
          </span>
          <select
            className="ui-input"
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="">كل المواد</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.name}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
            <BookOpen size={16} />
            الصف
          </span>
          <select
            className="ui-input"
            value={classFilter}
            onChange={(event) => {
              setClassFilter(event.target.value);
              setSectionFilter("");
            }}
          >
            <option value="">كل الصفوف</option>
            {classes.map((classOption) => (
              <option key={classOption.id} value={classOption.name}>
                {classOption.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
            <Users size={16} />
            الشعبة
          </span>
          <select
            className="ui-input"
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
          >
            <option value="">كل الشعب</option>
            {availableTeacherSections.map((sectionOption) => (
              <option key={sectionOption.id} value={sectionOption.name}>
                {sectionOption.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-black text-[var(--text-secondary)]">
            <ShieldCheck size={16} />
            الحالة
          </span>
          <select
            className="ui-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </label>
      </div>
    </div>
  );
}
