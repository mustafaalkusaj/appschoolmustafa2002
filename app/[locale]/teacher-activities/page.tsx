"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { ActivityDashboard } from "./_components/ActivityDashboard";
import { ActivityTimeline } from "./_components/ActivityTimeline";
import { ReviewPanel } from "./_components/ReviewPanel";
import { TeacherActivityView } from "./_components/TeacherActivityView";
import { ActivitySettings } from "./_components/ActivitySettings";
import { CheckCircle2, Clock, LayoutDashboard, Settings, Users } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";

type Tab = "dashboard" | "timeline" | "review" | "by-teacher" | "settings";

const TAB_COLORS: Record<Tab, string> = {
  dashboard:    "var(--primary)",
  timeline:     "#8b5cf6",
  review:       "#f59e0b",
  "by-teacher": "#10b981",
  settings:     "#6366f1",
};

const TAB_ICONS: Record<Tab, React.ElementType> = {
  dashboard:    LayoutDashboard,
  timeline:     Clock,
  review:       CheckCircle2,
  "by-teacher": Users,
  settings:     Settings,
};

export default function TeacherActivitiesPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const t = useTranslations("teacherActivities");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const schoolId = schoolScope.selectedSchoolId ?? profile?.school_id ?? profile?.school?.id ?? "";
  const isSuperAdmin = profile?.role === "super_admin";

  const ALL_TABS: Array<{ id: Tab; label: string; icon: React.ElementType; color: string; superAdminOnly?: boolean }> = [
    { id: "dashboard",  label: t("tabs.dashboard"),  icon: TAB_ICONS.dashboard,    color: TAB_COLORS.dashboard },
    { id: "timeline",   label: t("tabs.timeline"),   icon: TAB_ICONS.timeline,     color: TAB_COLORS.timeline },
    { id: "review",     label: t("tabs.review"),     icon: TAB_ICONS.review,       color: TAB_COLORS.review },
    { id: "by-teacher", label: t("tabs.byTeacher"),  icon: TAB_ICONS["by-teacher"], color: TAB_COLORS["by-teacher"] },
    { id: "settings",   label: t("tabs.settings"),   icon: TAB_ICONS.settings,     color: TAB_COLORS.settings, superAdminOnly: true },
  ];

  const TABS = ALL_TABS.filter((tab) => !tab.superAdminOnly || isSuperAdmin);

  const activeTabConfig = TABS.find((t) => t.id === activeTab) ?? TABS[0]!;

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/teacher-activities" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={t("subtitle")}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState scope={schoolScope} />
              ) : (
                <div className="space-y-6">

                  {/* Hero Banner */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)",
                    }}
                  >
                    <div
                      className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none"
                      style={{ background: "white", transform: "translate(35%, -40%)" }}
                    />
                    <div
                      className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none"
                      style={{ background: "white", transform: "translateY(60%)" }}
                    />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                          {t("heroBadge")}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          {t("title")}
                        </h1>
                        <p className="text-white/70 text-sm">
                          {t("heroDescription")}
                        </p>
                      </div>
                      <div
                        className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                      >
                        <LayoutDashboard size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Animated Tab Bar */}
                  <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10 whitespace-nowrap flex-shrink-0",
                            isActive
                              ? "text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="ta-tab-pill"
                              className="absolute inset-0 rounded-xl"
                              style={{ background: tab.color }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            <Icon size={15} />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile tab label */}
                  <div className="sm:hidden -mt-3">
                    <p className="text-sm font-semibold" style={{ color: activeTabConfig.color }}>
                      {activeTabConfig.label}
                    </p>
                  </div>

                  {/* Tab content with AnimatePresence */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {activeTab === "dashboard"  && <ActivityDashboard schoolId={schoolId} />}
                      {activeTab === "timeline"   && <ActivityTimeline  schoolId={schoolId} />}
                      {activeTab === "review"     && <ReviewPanel       schoolId={schoolId} />}
                      {activeTab === "by-teacher" && <TeacherActivityView schoolId={schoolId} />}
                      {activeTab === "settings"   && <ActivitySettings  schoolId={schoolId} />}
                    </motion.div>
                  </AnimatePresence>

                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
