"use client";

import { AppIcon } from "@/components/AppIcon";
import { QUICK_FILTERS } from "../_types";

interface PaymentsFiltersProps {
  quickFilter: string;
  setQuickFilter: (filter: string) => void;
  filterClass: string;
  setFilterClass: (cls: string) => void;
  filterSort: string;
  setFilterSort: (sort: string) => void;
  filterDir: string;
  setFilterDir: (dir: string) => void;
  classes: string[];
  onExport: () => void;
  onAddPayment: () => void;
  exporting: boolean;
  resolvedSchoolId: string | null;
  canAddPayments: boolean;
}

export function PaymentsFilters({
  quickFilter,
  setQuickFilter,
  filterClass,
  setFilterClass,
  filterSort,
  setFilterSort,
  filterDir,
  setFilterDir,
  classes,
  onExport,
  onAddPayment,
  exporting,
  resolvedSchoolId,
  canAddPayments,
}: PaymentsFiltersProps) {
  return (
    <div className="ops-section">
      <div className="ops-header">
        <div className="ops-title">
          <AppIcon token="⚙️" size={14} /> العمليات
        </div>
        <div className="ops-actions">
          <button className="btn-export" onClick={onExport} disabled={exporting || !resolvedSchoolId}>
            <AppIcon token="⬇️" size={14} /> {exporting ? "جارٍ التصدير..." : "تصدير إكسل"}
          </button>
          {canAddPayments && (
            <button className="btn-add" onClick={onAddPayment}>
              + إضافة فاتورة
            </button>
          )}
        </div>
      </div>

      {/* Quick filters */}
      <div className="quick-filters">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`qf-btn${quickFilter === f.id ? " active" : ""}`}
            onClick={() => setQuickFilter(f.id)}
          >
            <AppIcon token="📋" size={12} /> {f.label}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="adv-filters">
        <div className="adv-title">
          <AppIcon token="🔍" size={13} /> الفلاتر
        </div>
        <div className="adv-grid2">
          <div className="af-item">
            <label className="af-label">الصف والشعبة</label>
            <select className="af-input" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">- الكل -</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="af-item">
            <label className="af-label">ترتيب حسب</label>
            <select className="af-input" value={filterSort} onChange={(e) => setFilterSort(e.target.value)}>
              <option value="name">الاسم</option>
              <option value="remaining">المتبقي</option>
              <option value="total">إجمالي الرسوم</option>
            </select>
          </div>
          <div className="af-item">
            <label className="af-label">اتجاه الترتيب</label>
            <select className="af-input" value={filterDir} onChange={(e) => setFilterDir(e.target.value)}>
              <option value="asc">تصاعدي ↑</option>
              <option value="desc">تنازلي ↓</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
