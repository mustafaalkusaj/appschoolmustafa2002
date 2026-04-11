"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TABS } from "../_constants";
import type { StudentsMetaPayload } from "../_types";

interface StudentsTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentsMeta: StudentsMetaPayload;
}

export function StudentsTabs({ activeTab, setActiveTab, studentsMeta }: StudentsTabsProps) {
  const t = useTranslations("students.tabs");

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
      <TabsList className="bg-[var(--surface-soft)] rounded-[var(--radius-lg)] p-2 gap-2 flex flex-wrap">
        {TABS.map((tab) => {
          const count = studentsMeta.tabCounts[tab.id] ?? 0;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`
                flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-[var(--radius-md)]
                text-sm font-semibold transition-all duration-200 whitespace-nowrap
                data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white
                data-[state=active]:shadow-[var(--shadow-primary)]
                data-[state=inactive]:text-[var(--text-secondary)]
                data-[state=inactive]:hover:text-[var(--text-primary)]
                data-[state=inactive]:hover:bg-[var(--surface-hover)]
              `}
            >
              <AppIcon token={tab.icon} size={16} />
              <span>{t(tab.id)}</span>
              <Badge
                variant={activeTab === tab.id ? "primary" : "neutral"}
                size="sm"
                className={`
                  ${activeTab === tab.id 
                    ? "bg-white/20 text-white border-white/30" 
                    : ""}
                `}
              >
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
