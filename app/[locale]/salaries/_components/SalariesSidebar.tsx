"use client";

import { AppIcon } from "@/components/AppIcon";
import { SIDEBAR_ITEMS } from "../_types";

interface SalariesSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onDeductionsLoad: () => void;
  onCalendarLoad: () => void;
}

export function SalariesSidebar({
  activeSection,
  onSectionChange,
  onDeductionsLoad,
  onCalendarLoad,
}: SalariesSidebarProps) {
  const handleClick = (id: string) => {
    onSectionChange(id);
    if (id === "deductions") onDeductionsLoad();
    if (id === "calendar") onCalendarLoad();
  };

  return (
    <div className="sal-sidebar">
      <div
        style={{
          fontSize: ".72rem",
          fontWeight: 800,
          color: "var(--p2)",
          padding: ".4rem .7rem .6rem",
          borderBottom: "1px solid rgba(79,140,255,0.08)",
          marginBottom: ".4rem",
        }}
      >
        الرواتب
      </div>
      {SIDEBAR_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`sal-nav${activeSection === item.id ? " active" : ""}`}
          onClick={() => handleClick(item.id)}
        >
          <AppIcon token={item.icon} size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
