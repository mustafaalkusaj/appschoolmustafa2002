"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { CalendarDays, Sparkles, BookOpen, Clock, RefreshCw, Plus, ChevronRight, ChevronLeft } from "@/lib/icons";
import { useCalendarEvents, type CalendarEvent, EVENT_TYPE_CONFIG } from "./_hooks/useCalendarEvents";
import { CalendarGrid } from "./_components/CalendarGrid";
// AI suggestions panel removed
import { EventModal } from "./_components/EventModal";
import { motion, AnimatePresence, useMotionValue, useTransform, animate as motionAnimate } from "framer-motion";

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_SHORT = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => { const u = rounded.on("change", setDisplay); return u; }, [rounded]);
  useEffect(() => { const c = motionAnimate(motionVal, value, { duration: 0.8, ease: "easeOut" }); return c.stop; }, [value, motionVal]);
  return <>{display}</>;
}

function getDaysUntil(dateStr: string): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export default function CalendarPage() {
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const canManage = profile?.role === "super_admin" || profile?.role === "admin";

  const schoolId =
    schoolScope.selectedSchoolId ??
    profile?.school_id ??
    (profile?.school as { id?: string } | undefined)?.id ??
    null;

  const { events, eventsByDate, upcomingEvents, loading, error, year, month, setYear, setMonth, refetch } =
    useCalendarEvents(schoolId);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  // AI suggestions removed
  const [dayPanelDate, setDayPanelDate] = useState<string | null>(null);
  const [dayPanelEvents, setDayPanelEvents] = useState<CalendarEvent[]>([]);

  const thisMonthCount = events.length;
  const holidayCount = events.filter((e) => ["holiday", "religious", "national"].includes(e.type)).length;
  const examCount = events.filter((e) => e.type === "exam").length;
  const thisWeekCount = upcomingEvents.filter((e) => { const d = getDaysUntil(e.date); return d >= 0 && d <= 7; }).length;

  const filteredEventsByDate = typeFilter
    ? Object.fromEntries(Object.entries(eventsByDate).map(([d, evs]) => [d, evs.filter((e) => e.type === typeFilter)]))
    : eventsByDate;

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  }

  function handleDayClick(date: string, dayEvents: CalendarEvent[]) {
    const filtered = typeFilter ? dayEvents.filter((e) => e.type === typeFilter) : dayEvents;
    setDayPanelDate(date);
    setDayPanelEvents(filtered);
  }

  const stats = [
    { label: "أحداث الشهر", value: thisMonthCount, color: "var(--primary)", icon: CalendarDays },
    { label: "عطل وإجازات", value: holidayCount,   color: "var(--success)",  icon: Sparkles },
    { label: "امتحانات",    value: examCount,       color: "var(--warning)",  icon: BookOpen },
    { label: "هذا الأسبوع", value: thisWeekCount,  color: "var(--danger)",   icon: Clock },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/calendar" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="التقويم المدرسي الذكي"
            subtitle="التقويم الدراسي العراقي مع العطل الرسمية والمناسبات الدينية والوطنية"
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-4">

              <AnimatePresence>
                {error && (
                  <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState scope={schoolScope} title="التقويم المدرسي" description="يرجى اختيار مدرسة لعرض التقويم" />
                </div>
              ) : (
                <>
                  {/* ── STATS ROW ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {stats.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <motion.div key={s.label}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 flex items-center gap-3"
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)` }}
                          >
                            <Icon size={20} style={{ color: s.color }} />
                          </div>
                          <div>
                            <p className="text-2xl font-black leading-none tabular-nums" style={{ color: s.color }}>
                              <AnimatedNumber value={s.value} />
                            </p>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] mt-0.5">{s.label}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* ── CALENDAR CARD ── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">

                    {/* Navigation bar */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
                      <button onClick={prevMonth}
                        className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all flex-shrink-0">
                        <ChevronRight size={16} />
                      </button>

                      <div className="flex-1 flex items-center gap-3">
                        <h2 className="text-xl font-black text-[var(--text-primary)]">{MONTHS_AR[month - 1]}</h2>
                        <span className="text-sm font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-lg">{year}</span>
                        {typeFilter && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                            style={{
                              background: EVENT_TYPE_CONFIG[typeFilter as keyof typeof EVENT_TYPE_CONFIG]?.bg,
                              color: EVENT_TYPE_CONFIG[typeFilter as keyof typeof EVENT_TYPE_CONFIG]?.color,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_TYPE_CONFIG[typeFilter as keyof typeof EVENT_TYPE_CONFIG]?.color }} />
                            {EVENT_TYPE_CONFIG[typeFilter as keyof typeof EVENT_TYPE_CONFIG]?.label}
                          </motion.span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => void refetch()}
                          className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all">
                          <RefreshCw size={14} />
                        </button>
                        {canManage && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              const today = new Date().toISOString().split("T")[0]!;
                              setSelectedDate(today);
                              setSelectedEvents(eventsByDate[today] ?? []);
                            }}
                            className="h-9 px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
                            style={{ background: "var(--primary)", boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent)" }}
                          >
                            <Plus size={13} />
                            <span className="hidden sm:inline">إضافة حدث</span>
                          </motion.button>
                        )}
                      </div>

                      <button onClick={nextMonth}
                        className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-all flex-shrink-0">
                        <ChevronLeft size={16} />
                      </button>
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto custom-scrollbar border-b border-[var(--border)]"
                      style={{ background: "color-mix(in srgb, var(--surface-soft) 60%, transparent)" }}>
                      <button
                        onClick={() => setTypeFilter(null)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                        style={!typeFilter
                          ? { background: "var(--primary)", color: "white" }
                          : { background: "var(--card-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                      >
                        الكل
                      </button>
                      {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
                        <button key={type}
                          onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border"
                          style={{
                            background: typeFilter === type ? cfg.color : cfg.bg,
                            color: typeFilter === type ? "white" : cfg.color,
                            borderColor: cfg.border,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: typeFilter === type ? "white" : cfg.color }} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    {loading ? (
                      <div className="flex items-center justify-center h-[540px]">
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                          />
                          <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">جارٍ التحميل</p>
                        </div>
                      </div>
                    ) : (
                      <CalendarGrid
                        year={year}
                        month={month}
                        eventsByDate={filteredEventsByDate}
                        onDayClick={handleDayClick}
                        selectedDate={dayPanelDate}
                      />
                    )}
                  </div>

                  {/* ── DAY DETAIL PANEL ── */}
                  <AnimatePresence>
                    {dayPanelDate && (
                      <motion.div
                        key={`day-${dayPanelDate}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="rounded-2xl border bg-[var(--card-bg)] overflow-hidden"
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))" }}
                      >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]"
                          style={{ background: "color-mix(in srgb, var(--primary) 4%, var(--surface-soft))" }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
                              style={{ background: "var(--primary)", boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)" }}
                            >
                              <span className="text-[10px] font-bold opacity-80 leading-none">
                                {MONTHS_SHORT[new Date(dayPanelDate).getMonth()]?.substring(0, 3)}
                              </span>
                              <span className="text-xl font-black leading-tight">
                                {new Date(dayPanelDate).getDate()}
                              </span>
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-primary)]">
                                {new Date(dayPanelDate).toLocaleDateString("ar-IQ-u-nu-latn", { weekday: "long", month: "long", day: "numeric" })}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] font-bold mt-0.5">
                                {dayPanelEvents.length === 0
                                  ? "لا توجد أحداث في هذا اليوم"
                                  : `${dayPanelEvents.length} ${dayPanelEvents.length === 1 ? "حدث" : "أحداث"}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canManage && (
                              <motion.button
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                  setSelectedDate(dayPanelDate);
                                  setSelectedEvents(dayPanelEvents);
                                }}
                                className="h-8 px-3 rounded-xl text-xs font-black text-white flex items-center gap-1.5"
                                style={{ background: "var(--primary)" }}
                              >
                                <Plus size={12} />
                                إضافة
                              </motion.button>
                            )}
                            <button
                              onClick={() => { setDayPanelDate(null); setDayPanelEvents([]); }}
                              className="h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-black text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition"
                            >
                              إغلاق
                            </button>
                          </div>
                        </div>

                        {/* Events grid */}
                        <div className={`p-5 ${dayPanelEvents.length > 0 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "flex items-center justify-center py-12"}`}>
                          {dayPanelEvents.length === 0 ? (
                            <div className="text-center">
                              <div className="w-16 h-16 rounded-3xl mx-auto mb-3 flex items-center justify-center"
                                style={{ background: "var(--surface-muted)" }}>
                                <CalendarDays size={28} className="text-[var(--text-muted)]" />
                              </div>
                              <p className="text-sm font-black text-[var(--text-secondary)]">لا توجد أحداث</p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {canManage ? "اضغط إضافة لجدولة حدث في هذا اليوم" : "لم يتم جدولة أي أحداث"}
                              </p>
                            </div>
                          ) : dayPanelEvents.map((ev, idx) => {
                            const cfg = EVENT_TYPE_CONFIG[ev.type];
                            return (
                              <motion.div key={ev.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-xl p-4 border"
                                style={{ background: cfg.bg, borderColor: cfg.border, borderInlineStart: `4px solid ${cfg.color}` }}
                              >
                                <span
                                  className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full mb-2"
                                  style={{ background: `color-mix(in srgb, ${cfg.color} 18%, white)`, color: cfg.color }}
                                >
                                  {cfg.label}
                                </span>
                                <p className="font-black text-[var(--text-primary)] text-sm leading-snug">{ev.title}</p>
                                {ev.hijri_date && (
                                  <p className="text-[11px] mt-1 font-bold" style={{ color: cfg.color }}>{ev.hijri_date}</p>
                                )}
                                {ev.description && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{ev.description}</p>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── AI PANEL ── */}

                  {/* ── UPCOMING EVENTS ── */}
                  {upcomingEvents.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-[var(--text-primary)]">الأحداث القادمة</h3>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          {upcomingEvents.length} حدث
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {upcomingEvents.slice(0, 8).map((ev, index) => {
                          const cfg = EVENT_TYPE_CONFIG[ev.type];
                          const d = getDaysUntil(ev.date);
                          const dateObj = new Date(ev.date);
                          return (
                            <motion.button
                              key={ev.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.04 }}
                              onClick={() => {
                                const evs = eventsByDate[ev.date] ?? [];
                                setDayPanelDate(ev.date);
                                setDayPanelEvents(typeFilter ? evs.filter((e) => e.type === typeFilter) : evs);
                              }}
                              className="text-start rounded-xl border bg-[var(--card-bg)] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                              style={{ borderColor: `color-mix(in srgb, ${cfg.color} 20%, var(--border))` }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div
                                  className="w-12 h-12 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                                  style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
                                >
                                  <span className="text-[10px] font-black leading-none" style={{ color: cfg.color }}>
                                    {MONTHS_SHORT[dateObj.getMonth()]?.substring(0, 3)}
                                  </span>
                                  <span className="text-xl font-black leading-tight" style={{ color: cfg.color }}>
                                    {dateObj.getDate()}
                                  </span>
                                </div>
                                <span
                                  className="text-[10px] font-black px-2 py-1 rounded-lg"
                                  style={{ background: cfg.bg, color: cfg.color }}
                                >
                                  {d === 0 ? "اليوم" : d === 1 ? "غداً" : `بعد ${d} يوم`}
                                </span>
                              </div>
                              <p className="text-sm font-black text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors leading-snug">
                                {ev.title}
                              </p>
                              <span
                                className="inline-flex items-center mt-2.5 text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                              >
                                {cfg.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {selectedDate !== null && (
        <EventModal
          date={selectedDate}
          events={selectedEvents}
          canManage={canManage}
          schoolId={schoolId}
          onClose={() => { setSelectedDate(null); setSelectedEvents([]); }}
          onCreated={() => { void refetch(); setSelectedDate(null); setSelectedEvents([]); }}
        />
      )}
    </ProtectedRoute>
  );
}
