"use client";

import { AppIcon } from "@/components/AppIcon";
import type { StudentWithFees } from "../_types";

interface StudentsToolbarProps {
  search: string;
  setSearch: (search: string) => void;
  filterClass: string;
  setFilterClass: (filter: string) => void;
  filterSection: string;
  setFilterSection: (filter: string) => void;
  classes: string[];
  sectionsList: string[];
  activeTab: string;
  isReadOnlyView: boolean;
  canManageStudentAccounts: boolean;
  datasetLoading: boolean;
  printingCards: boolean;
  filtered: StudentWithFees[];
  onExportCurrentPage: () => void;
  onExportAll: () => void;
  onPrintFiltered: () => void;
  onPrintAllCards: () => void;
  onAddStudent: () => void;
}

export function StudentsToolbar({
  search,
  setSearch,
  filterClass,
  setFilterClass,
  filterSection,
  setFilterSection,
  classes,
  sectionsList,
  activeTab,
  isReadOnlyView,
  canManageStudentAccounts,
  datasetLoading,
  printingCards,
  onExportCurrentPage,
  onExportAll,
  onPrintFiltered,
  onPrintAllCards,
  onAddStudent,
}: StudentsToolbarProps) {
  return (
    <div className="toolbar">
      <div className="srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <select
        className="filter-sel"
        value={filterClass}
        onChange={(e) => {
          setFilterClass(e.target.value);
          setFilterSection("");
        }}
      >
        <option value="">كل الصفوف</option>
        {classes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select className="filter-sel" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
        <option value="">كل الشعب</option>
        {sectionsList.map((sec) => (
          <option key={sec} value={sec}>
            شعبة {sec}
          </option>
        ))}
      </select>
      <>
        <button className="btn-export" onClick={onExportCurrentPage} title="تصدير الصفحة الحالية فقط (50 طالب)">
          <AppIcon token="📤" size={14} />
          تصدير الصفحة الحالية
        </button>
        <button
          className="btn-excel"
          onClick={onExportAll}
          disabled={datasetLoading}
          title="تصدير جميع الطلاب بغض النظر عن الصفحة أو الفلتر"
        >
          <AppIcon token="📥" size={14} />
          {datasetLoading ? "جارٍ التحضير..." : "تصدير الكل إكسل"}
        </button>
      </>
      <button className="btn-print" onClick={onPrintFiltered}>
        <AppIcon token="🖨️" size={14} />
        طباعة الطلاب المفلترين
      </button>
      {canManageStudentAccounts && (
        <button className="btn-print" onClick={onPrintAllCards} disabled={printingCards}>
          <AppIcon token="🪪" size={14} />
          {printingCards ? "جارٍ تجهيز البطاقات..." : "طباعة جميع بطاقات الطلاب"}
        </button>
      )}
      {activeTab === "active" && !isReadOnlyView && (
        <>
          {canManageStudentAccounts && (
            <>
              <button className="btn-add" onClick={onAddStudent}>
                + إضافة طالب
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
