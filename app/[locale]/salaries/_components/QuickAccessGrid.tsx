"use client";

import { AppIcon } from "@/components/AppIcon";
import { QUICK_ACCESS } from "../_types";

interface QuickAccessGridProps {
  showAll: boolean;
  onToggleShowAll: () => void;
  onAction: (id: string) => void;
}

export function QuickAccessGrid({
  showAll,
  onToggleShowAll,
  onAction,
}: QuickAccessGridProps) {
  const visibleItems = showAll ? QUICK_ACCESS : QUICK_ACCESS.slice(0, 7);

  return (
    <div className="quick-section">
      <div className="quick-header">
        <div
          className="quick-title"
          style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
        >
          <AppIcon token="📌" size={14} />
          الوصول السريع
        </div>
        <button className="show-all-btn" onClick={onToggleShowAll}>
          {showAll ? "عرض أقل" : "عرض الكل"}
        </button>
      </div>
      <div className="quick-grid">
        {visibleItems.map((qa) => (
          <button
            key={qa.id}
            className="qa-btn"
            onClick={() => onAction(qa.id)}
          >
            <div className="qa-ico" style={{ background: qa.bg }}>
              <AppIcon token={qa.icon} size={20} />
            </div>
            <span className="qa-label">{qa.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
