"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Bell, Send, History, Megaphone, LayoutGrid } from "@/lib/icons";
import { NotificationStatsCards } from "./NotificationStatsCards";
import { SendNotificationForm } from "./SendNotificationForm";
import { NotificationHistory } from "./NotificationHistory";
import { AnnouncementsList } from "./AnnouncementsList";
import { AdsList } from "./AdsList";
import { cn } from "@/lib/brand/brand-utils";

type Tab = "send" | "history" | "announcements" | "ads";

interface NotificationsExperienceProps {
  schoolId: string;
  branchId?: string;
  locale: string;
}

export function NotificationsExperience({ schoolId, branchId, locale }: NotificationsExperienceProps) {
  const t = useTranslations("notifications");
  const [activeTab, setActiveTab] = useState<Tab>("send");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "send",          label: t("tabs.send"),          icon: Send,        color: "var(--primary)" },
    { id: "history",       label: t("tabs.history"),       icon: History,     color: "var(--success)" },
    { id: "announcements", label: t("tabs.announcements"), icon: Megaphone,   color: "var(--warning)" },
    { id: "ads",           label: "الإعلانات",              icon: LayoutGrid,  color: "var(--primary)" },
  ];

  function handleSendSuccess() {
    setRefreshKey((k) => k + 1);
    setActiveTab("history");
  }

  const activeTabConfig = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              لوحة الإدارة · الإشعارات
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
              {t("pageTitle") || "مركز الإشعارات"}
            </h1>
            <p className="text-white/70 text-sm">
              {t("pageSubtitle") || "إرسال إشعارات فورية وإعلانات للطلاب والمعلمين"}
            </p>
          </div>
          <div
            className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <Bell size={38} className="text-white" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <NotificationStatsCards schoolId={schoolId} refreshKey={refreshKey} />

      {/* Tab Bar */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
                isActive ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="notif-tab-pill"
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

      {/* Tab Label (mobile) */}
      <div className="sm:hidden -mt-3">
        <p className="text-sm font-semibold" style={{ color: activeTabConfig.color }}>
          {activeTabConfig.label}
        </p>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {activeTab === "send" && (
            <SendNotificationForm schoolId={schoolId} branchId={branchId} locale={locale} onSuccess={handleSendSuccess} />
          )}
          {activeTab === "history" && (
            <NotificationHistory schoolId={schoolId} locale={locale} refreshKey={refreshKey} />
          )}
          {activeTab === "announcements" && (
            <AnnouncementsList schoolId={schoolId} branchId={branchId} locale={locale} />
          )}
          {activeTab === "ads" && (
            <AdsList schoolId={schoolId} locale={locale} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
