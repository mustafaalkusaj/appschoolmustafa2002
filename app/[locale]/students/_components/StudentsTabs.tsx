"use client";

import { AppIcon } from "@/components/AppIcon";
import { TABS } from "../_constants";
import type { StudentsMetaPayload } from "../_types";

interface StudentsTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentsMeta: StudentsMetaPayload;
}

export function StudentsTabs({ activeTab, setActiveTab, studentsMeta }: StudentsTabsProps) {
  return (
    <div className="tabs">
      {TABS.map((tab) => {
        const count = studentsMeta.tabCounts[tab.id as keyof typeof studentsMeta.tabCounts] ?? 0;
        return (
          <button
            key={tab.id}
            className={`tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-ico">
              <AppIcon token={tab.icon} size={16} />
            </span>
            <span>{tab.label}</span>
            <span className="tab-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
