"use client";

interface DashboardActionsProps {
  canManageClasses: boolean;
  showFeesTable: boolean;
  onToggleFeesTable: () => void;
  onOpenNewFee: () => void;
  onOpenClassesModal: () => void;
}

export function DashboardActions({
  canManageClasses,
  showFeesTable,
  onToggleFeesTable,
  onOpenNewFee,
  onOpenClassesModal,
}: DashboardActionsProps) {
  if (!canManageClasses) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: "1rem", flexWrap: "wrap" }}>
      <button className="fee-btn" onClick={onOpenNewFee}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        + إضافة قسط دراسي
      </button>
      <button className="fee-btn-outline" onClick={onToggleFeesTable}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="3" />
        </svg>
        {showFeesTable ? "إخفاء الجدول" : "عرض جدول الأقساط"}
      </button>
      <button className="fee-btn-outline" onClick={onOpenClassesModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
        إدارة الصفوف والشعب
      </button>
    </div>
  );
}
