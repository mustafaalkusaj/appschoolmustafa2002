"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { AlertTriangle, BarChart3, Bell, Clock, Flag, RefreshCw, TrendingUp, Users } from "@/lib/icons";

const TYPE_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  notification:   { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "🔔" },
  homework:       { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "📚" },
  photo:          { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "📷" },
  video:          { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "🎥" },
  file:           { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "📄" },
  link:           { color: "#06b6d4", bg: "rgba(6,182,212,0.1)",   icon: "🔗" },
  announcement:   { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  icon: "📢" },
  grade_entry:    { color: "#84cc16", bg: "rgba(132,204,22,0.1)",  icon: "📝" },
  exam_photo:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: "📸" },
  worksheet:      { color: "#14b8a6", bg: "rgba(20,184,166,0.1)",  icon: "📋" },
  lesson_summary: { color: "#a855f7", bg: "rgba(168,85,247,0.1)",  icon: "📖" },
};

type DashboardData = {
  stats: {
    total: number;
    byType: Record<string, number>;
    activeTeachers: number;
    totalTeachers: number;
    inactiveTeachers: Array<{ id: string; full_name: string; subject: string; lastActivity: string | null }>;
    pendingReview: number;
    pendingReports: number;
  };
  topTeachers: Array<{ teacher_id: string; count: number; teacher?: { full_name: string; subject: string } }>;
  weeklyChart: Array<{ date: string; count: number; label: string }>;
};

type Period = "today" | "week" | "month";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

export function ActivityDashboard({ schoolId }: { schoolId: string }) {
  const t = useTranslations("teacherActivities");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardData & { ok: boolean }>(
        `/api/v1/teacher-activities/dashboard?period=${period}`,
      );
      if (!response.ok) throw new Error();
      setData(payload ?? null);
    } catch {
      setError(t("dashboard.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data)
    return (
      <Card>
        <CardContent className="p-10 text-center font-semibold text-[var(--danger)]">
          {error ?? t("dashboard.errorData")}
        </CardContent>
      </Card>
    );

  const maxChart = Math.max(...data.weeklyChart.map((d) => d.count), 1);
  const maxTopCount = data.topTeachers[0]?.count ?? 1;
  const RANK_COLORS = ["#f59e0b", "#94a3b8", "#cd7c3a"];
  const RANK_LABELS = ["🥇", "🥈", "🥉"];
  const PERIOD_LABELS: Record<Period, string> = {
    today: t("dashboard.today"),
    week:  t("dashboard.week"),
    month: t("dashboard.month"),
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">{t("dashboard.title")}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl p-1">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                style={{
                  background: period === p ? "var(--primary)" : "transparent",
                  color: period === p ? "#fff" : "var(--text-secondary)",
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--surface-soft)] transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <KPIGrid className="grid-cols-2 lg:grid-cols-5">
        {[
          { icon: BarChart3,    label: t("dashboard.kpi.totalActivities"),  value: String(data.stats.total),                                      variant: "primary"  as const },
          { icon: Users,        label: t("dashboard.kpi.activeTeachers"),   value: `${data.stats.activeTeachers} / ${data.stats.totalTeachers}`,  variant: "success"  as const },
          { icon: Clock,        label: t("dashboard.kpi.pendingReview"),    value: String(data.stats.pendingReview),                              variant: data.stats.pendingReview > 0 ? "warning" as const : "neutral" as const },
          { icon: AlertTriangle,label: t("dashboard.kpi.inactive"),         value: String(data.stats.inactiveTeachers.length),                   variant: data.stats.inactiveTeachers.length > 0 ? "danger" as const : "neutral" as const },
          { icon: Flag,         label: t("dashboard.kpi.pendingReports"),   value: String(data.stats.pendingReports),                            variant: data.stats.pendingReports > 0 ? "warning" as const : "neutral" as const },
        ].map((card, i) => (
          <motion.div key={card.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <StatsCard label={card.label} value={card.value} icon={card.icon} variant={card.variant} />
          </motion.div>
        ))}
      </KPIGrid>

      {/* Weekly chart */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(99,102,241,0.12)] text-[#6366f1]">
              <BarChart3 size={16} />
            </div>
            <h3
              className="text-sm font-extrabold"
              style={{ background: "linear-gradient(135deg, var(--primary), #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              {t("dashboard.weeklyActivity")}
            </h3>
          </div>
          {/* Chart */}
          <div className="flex items-end gap-2 h-48">
            {data.weeklyChart.map((day) => {
              const pct = maxChart > 0 ? (day.count / maxChart) * 100 : 0;
              const isMax = day.count === maxChart && day.count > 0;
              const isEmpty = day.count === 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  {/* Count */}
                  <span className={`text-[11px] font-extrabold h-4 leading-4 ${isMax ? "" : "opacity-0"}`} style={{ color: "var(--primary)" }}>
                    {day.count}
                  </span>
                  {/* Track + bar */}
                  <div className="relative flex-1 w-full rounded-2xl overflow-hidden" style={{ background: "var(--surface-soft)" }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-2xl transition-all duration-700"
                      style={{
                        height: isEmpty ? "3px" : `${Math.max(pct, 6)}%`,
                        background: isEmpty
                          ? "var(--border)"
                          : isMax
                            ? "linear-gradient(to top, var(--primary), color-mix(in srgb, var(--primary) 70%, white))"
                            : "color-mix(in srgb, var(--primary) 45%, transparent)",
                        boxShadow: isMax ? `0 -4px 20px color-mix(in srgb, var(--primary) 30%, transparent)` : "none",
                      }}
                    />
                    {/* count badge inside bar */}
                    {!isMax && day.count > 0 && (
                      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold" style={{ color: "var(--primary)" }}>
                        {day.count}
                      </span>
                    )}
                  </div>
                  {/* Day label */}
                  <span className="text-[10px] font-semibold truncate w-full text-center" style={{ color: isMax ? "var(--primary)" : "var(--text-muted)" }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top teachers + Type distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(245,158,11,0.12)] text-[#f59e0b]">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-sm font-extrabold" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("dashboard.topTeachers")}
              </h3>
            </div>
            <div className="flex flex-col gap-3.5">
              {data.topTeachers.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">{t("dashboard.noData")}</p>
              )}
              {data.topTeachers.map((t, i) => {
                const pct = maxTopCount > 0 ? Math.round((t.count / maxTopCount) * 100) : 0;
                const rankColor = RANK_COLORS[i] ?? "var(--border)";
                return (
                  <div key={t.teacher_id}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: i < 3 ? `${rankColor}22` : "var(--surface-soft)",
                          border: `2px solid ${i < 3 ? rankColor : "var(--border)"}`,
                          color: i < 3 ? rankColor : "var(--text-muted)",
                          fontSize: i < 3 ? 14 : 11,
                          fontWeight: 800,
                        }}
                      >
                        {i < 3 ? RANK_LABELS[i] : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[var(--text-primary)] truncate">{t.teacher?.full_name ?? "أستاذ"}</div>
                        {t.teacher?.subject && (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-[var(--primary)] bg-[rgba(99,102,241,0.1)] px-2 py-0.5 rounded-full">
                            {t.teacher.subject}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-extrabold px-3 py-0.5 rounded-full flex-shrink-0" style={{ color: i < 3 ? rankColor : "var(--primary)", background: i < 3 ? `${rankColor}18` : "rgba(99,102,241,0.1)" }}>
                        {t.count}
                      </span>
                    </div>
                    <div className="h-1 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: i < 3 ? `linear-gradient(to left, ${rankColor}, ${rankColor}88)` : "var(--primary)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(236,72,153,0.12)] text-[#ec4899]">
                <BarChart3 size={16} />
              </div>
              <h3 className="text-sm font-extrabold" style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("dashboard.contentDistribution")}
              </h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {Object.entries(TYPE_STYLE).map(([type, cfg]) => {
                const count = data.stats.byType[type] ?? 0;
                const pct = Math.round((count / (data.stats.total || 1)) * 100);
                const label = t(`activityTypes.${type}` as Parameters<typeof t>[0]);
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base leading-none">{cfg.icon}</span>
                      <span className="flex-1 text-xs text-[var(--text-secondary)] font-semibold">{label}</span>
                      <span className="text-xs font-extrabold" style={{ color: cfg.color }}>{count}</span>
                    </div>
                    <div className="h-1 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.color, minWidth: count > 0 ? 4 : 0 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inactive teachers */}
      {data.stats.inactiveTeachers.length > 0 && (
        <Card className="border-[rgba(249,115,22,0.25)] bg-[rgba(249,115,22,0.04)]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(249,115,22,0.15)] text-[#f97316]">
                <AlertTriangle size={16} />
              </div>
              <span className="text-sm font-extrabold text-[#f97316]">
                {t("dashboard.inactiveAlert", { count: data.stats.inactiveTeachers.length })}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.stats.inactiveTeachers.map((t) => (
                <div key={t.id} className="bg-[var(--card-bg)] border border-[rgba(249,115,22,0.2)] rounded-full px-3.5 py-1.5 text-xs text-[var(--text-secondary)] font-semibold">
                  {t.full_name}
                  {t.subject && <span className="text-[var(--text-muted)] font-normal"> — {t.subject}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending alerts */}
      {(data.stats.pendingReview > 0 || data.stats.pendingReports > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.stats.pendingReview > 0 && (
            <div className="flex-1 min-w-[200px] flex items-center gap-2.5 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-xl px-4 py-3 text-sm font-bold text-[#d97706]">
              <Bell size={15} />
              {t("dashboard.pendingReviewAlert", { count: data.stats.pendingReview })}
            </div>
          )}
          {data.stats.pendingReports > 0 && (
            <div className="flex-1 min-w-[200px] flex items-center gap-2.5 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.25)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--danger)]">
              <Flag size={15} />
              {t("dashboard.pendingReportAlert", { count: data.stats.pendingReports })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
        ))}
      </div>
      <div className="h-56 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-72 bg-[var(--card-bg)] border border-[var(--border)] rounded-[var(--card-radius)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
