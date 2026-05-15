"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Card, CardContent } from "@/components/ui/card";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useSchedule, type ScheduleGrid } from "./_hooks/useSchedule";
import { useTimeSlotsSettings, type TimeSlot, type WorkingDay } from "./_hooks/useTimeSlotsSettings";
import { useKeyboardShortcuts } from "./_hooks/useKeyboardShortcuts";
import { ScheduleGrid as ScheduleGridView } from "./_components/ScheduleGrid";
import { MobileScheduleView } from "./_components/MobileScheduleView";
import { ScheduleCellModal } from "./_components/ScheduleCellModal";
import { TimeSlotsModal } from "./_components/TimeSlotsModal";
import { WorkingDaysToggle } from "./_components/WorkingDaysToggle";
import { TeacherView } from "./_components/TeacherView";
import { OverviewView } from "./_components/OverviewView";
import { ConflictBanner } from "./_components/ConflictBanner";
import { CloneModal } from "./_components/CloneModal";
import { cn } from "@/lib/brand/brand-utils";
import { Save, RotateCcw, Settings, CalendarDays, GraduationCap, School, Users, Printer, Download, Copy, CheckCircle2 } from "@/lib/icons";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect as useEffectRaw, useRef } from "react";

type ClassItem = { id: string; name: string };
type SectionItem = { id: string; class_id: string; name: string };

type DashboardStructureResponse = {
  classes?: ClassItem[];
  sections?: SectionItem[];
};

type ScheduleEntry = {
  day_of_week: string;
  time_slot_id: string | null;
  period_number: number;
  subject: string;
  teacher_name: string | null;
  class_name: string;
  section: string | null;
  is_locked: boolean;
};

type ViewMode = "class" | "teacher" | "overview";

// ── Animated counter (like NotificationStatsCards) ──────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsubscribe = rounded.on("change", setDisplay);
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.7, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  return <span>{display}</span>;
}

function exportGridToCSV(
  grid: ScheduleGrid,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
  className: string,
  section: string,
) {
  const activeDays = workingDays
    .filter((d) => d.is_active)
    .sort((a, b) => a.day_order - b.day_order);
  const activeSlots = timeSlots
    .filter((s) => s.is_active && s.slot_type === "period")
    .sort((a, b) => a.slot_order - b.slot_order);

  const header = [
    "اليوم",
    ...activeSlots.map((s) => `${s.name_ar} (${s.start_time}-${s.end_time})`),
  ];
  const rows = activeDays.map((day) => {
    const row = [day.name_ar];
    for (const slot of activeSlots) {
      const cell = grid[day.day_key]?.[slot.id];
      row.push(
        cell?.subject
          ? `${cell.subject}${cell.teacher_name ? ` / ${cell.teacher_name}` : ""}`
          : "",
      );
    }
    return row;
  });

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `جدول_${className}${section ? `_${section}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SchedulePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const isEn = locale === "en";
  const t = useTranslations("schedule");
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);

  // Resolved school ID for API calls
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Classes / sections for the dropdowns
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("class");

  // Teacher view state
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherEntries, setTeacherEntries] = useState<ScheduleEntry[]>([]);

  // Overview view state
  const [overviewDay, setOverviewDay] = useState("");
  const [overviewEntries, setOverviewEntries] = useState<ScheduleEntry[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState("");
  const [modalSlotId, setModalSlotId] = useState("");
  const [timeSlotsModalOpen, setTimeSlotsModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);

  const canEdit = canAny(["manage_schedule"]);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Resolve school ID whenever scope changes
  useEffect(() => {
    if (schoolScope.scopeLoading) return;
    void resolveSchoolIdForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    }).then(setSchoolId);
  }, [profile, schoolScope.selectedSchoolId, schoolScope.scopeLoading]);

  // Fetch classes/sections when schoolId is available
  const fetchClasses = useCallback(async (resolvedSchoolId: string) => {
    setLoadingClasses(true);
    try {
      const params = new URLSearchParams({ schoolId: resolvedSchoolId });
      const { response, payload } = await fetchJsonWithAuthorizedSession<DashboardStructureResponse>(
        `/api/web/dashboard/structure?${params}`,
      );
      if (response.ok && payload) {
        setClasses(payload.classes ?? []);
        setSections(payload.sections ?? []);
      } else {
        setClasses([]);
        setSections([]);
      }
    } catch {
      setClasses([]);
      setSections([]);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setClasses([]);
      setSections([]);
      return;
    }
    void fetchClasses(schoolId);
  }, [schoolId, fetchClasses]);

  // Fetch teachers list
  const fetchTeachers = useCallback(async (sid: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        teachers?: string[];
      }>(`/api/web/schedule/teachers?schoolId=${sid}`);
      if (response.ok && payload?.ok) setTeachersList(payload.teachers ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (schoolId) void fetchTeachers(schoolId);
  }, [schoolId, fetchTeachers]);

  // Fetch teacher schedule
  const fetchTeacherSchedule = useCallback(
    async (teacher: string) => {
      if (!schoolId || !teacher) return;
      try {
        const params = new URLSearchParams({ schoolId, teacherName: teacher });
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          schedule?: ScheduleEntry[];
        }>(`/api/web/schedule?${params}`);
        if (response.ok && payload?.ok) {
          setTeacherEntries(payload.schedule ?? []);
        }
      } catch {
        setTeacherEntries([]);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (viewMode === "teacher" && selectedTeacher) {
      void fetchTeacherSchedule(selectedTeacher);
    }
  }, [viewMode, selectedTeacher, fetchTeacherSchedule]);

  // Fetch overview entries
  const fetchOverview = useCallback(
    async (day: string) => {
      if (!schoolId || !day) return;
      try {
        const params = new URLSearchParams({ schoolId, mode: "overview", day });
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          schedule?: ScheduleEntry[];
        }>(`/api/web/schedule?${params}`);
        if (response.ok && payload?.ok) {
          setOverviewEntries(payload.schedule ?? []);
        }
      } catch {
        setOverviewEntries([]);
      }
    },
    [schoolId],
  );

  useEffect(() => {
    if (viewMode === "overview" && overviewDay) {
      void fetchOverview(overviewDay);
    }
  }, [viewMode, overviewDay, fetchOverview]);

  // Set default overview day from working days
  const timeSlotsSettings = useTimeSlotsSettings(schoolId);

  useEffect(() => {
    if (!overviewDay && timeSlotsSettings.workingDays.length > 0) {
      const firstActive = timeSlotsSettings.workingDays
        .filter((d) => d.is_active)
        .sort((a, b) => a.day_order - b.day_order)[0];
      if (firstActive) setOverviewDay(firstActive.day_key);
    }
  }, [timeSlotsSettings.workingDays, overviewDay]);

  // Schedule hook — receives dynamic timeSlots and workingDays
  const schedule = useSchedule(schoolId, timeSlotsSettings.slots, timeSlotsSettings.workingDays);

  // Sections filtered by selected class
  const filteredSections = schedule.selectedClass
    ? sections.filter((s) => {
        const cls = classes.find((c) => c.name === schedule.selectedClass);
        return cls ? s.class_id === cls.id : false;
      })
    : [];

  // Modal cell data — slotId is now a string key
  const modalCell =
    modalOpen && schedule.grid ? schedule.grid[modalDay]?.[modalSlotId] : null;

  // Derive slot label for modal header
  const modalSlot = timeSlotsSettings.slots.find((s) => s.id === modalSlotId);
  const modalSlotLabel = modalSlot ? modalSlot.name_ar : `الحصة ${modalSlotId}`;

  function openCell(day: string, slotId: string) {
    setModalDay(day);
    setModalSlotId(slotId);
    setModalOpen(true);
  }

  function handleSaveCell(subject: string, teacher: string) {
    schedule.updateCell(modalDay, modalSlotId, subject, teacher);
  }

  function handleClearCell() {
    schedule.clearCell(modalDay, modalSlotId);
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => {
      if (viewMode === "class") void schedule.saveSchedule();
    },
    onPrint: () => window.print(),
    onEscape: () => {
      setModalOpen(false);
      setTimeSlotsModalOpen(false);
      setCloneModalOpen(false);
    },
  });

  const controlClasses =
    "h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";

  // Tab definitions
  const tabs: { id: ViewMode; label: string; icon: React.ElementType; color: string }[] = [
    { id: "class",    label: "بالصف",       icon: Users,         color: "var(--primary)" },
    { id: "teacher",  label: "بالمعلم",     icon: GraduationCap, color: "var(--success)" },
    { id: "overview", label: "نظرة عامة",   icon: School,        color: "var(--warning)" },
  ];

  // Stats derived from grid
  const allCells = schedule.grid
    ? Object.values(schedule.grid).flatMap((day) => Object.values(day))
    : [];
  const filledCount     = allCells.filter((c) => c.subject).length;
  const emptyCount      = allCells.filter((c) => !c.subject).length;
  const totalPeriods    = allCells.length;
  const activeDaysCount = timeSlotsSettings.workingDays.filter((d) => d.is_active).length;

  const statsCards = [
    {
      label: "الخلايا المملوءة",
      value: filledCount,
      icon: CheckCircle2,
      color: "var(--success)",
    },
    {
      label: "الخلايا الفارغة",
      value: emptyCount,
      icon: CalendarDays,
      color: "var(--warning)",
    },
    {
      label: "إجمالي الحصص",
      value: totalPeriods,
      icon: School,
      color: "var(--primary)",
    },
    {
      label: "أيام الدراسة",
      value: activeDaysCount,
      icon: Users,
      color: "#06b6d4",
    },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/schedule" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={t("subtitle")}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

              {/* Feedback banners */}
              <AnimatePresence>
                {schedule.saveSuccess && (
                  <motion.div
                    key="save-success"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> {t("saved")}
                  </motion.div>
                )}
                {schedule.error && (
                  <motion.div
                    key="save-error"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm"
                  >
                    {schedule.error}
                  </motion.div>
                )}
              </AnimatePresence>

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <Card>
                  <CardContent className="p-8">
                    <SchoolScopeEmptyState
                      scope={schoolScope}
                      title={t("title")}
                      description={isEn ? "Select a school to view the schedule" : "اختر مدرسة لعرض الجدول"}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-5">

                  {/* ── Hero Banner ── */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #818cf8) 100%)",
                    }}
                  >
                    {/* Decorative circles */}
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
                          لوحة الإدارة · الجدول الدراسي
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          الجدول الدراسي
                        </h1>
                        <p className="text-white/70 text-sm">
                          إدارة وتنظيم جداول الحصص الدراسية للصفوف والمعلمين
                        </p>
                      </div>
                      <div
                        className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                      >
                        <CalendarDays size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* ── Stats Cards ── */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3"
                  >
                    {statsCards.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <motion.div
                          key={s.label}
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                        >
                          {/* Hover radial gradient */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                            style={{
                              background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${s.color} 8%, transparent), transparent 70%)`,
                            }}
                          />
                          <div className="relative z-10">
                            {/* Icon */}
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                              style={{
                                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                              }}
                            >
                              <Icon size={18} style={{ color: s.color }} />
                            </div>
                            {/* Number */}
                            <div
                              className="text-3xl font-black mb-1 tabular-nums"
                              style={{ color: s.color }}
                            >
                              <AnimatedNumber value={s.value} />
                            </div>
                            {/* Label */}
                            <p className="text-xs font-bold text-[var(--text-muted)]">{s.label}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* ── Tab Bar ── */}
                  <div className="no-print relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = viewMode === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setViewMode(tab.id)}
                          className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
                            isActive
                              ? "text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="schedule-tab-pill"
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

                  {/* ── Controls Card ── */}
                  <div className="no-print rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-4">

                    {/* Row: selectors + action buttons */}
                    <div className="flex flex-wrap items-end gap-3">

                      {/* Class mode selectors */}
                      {viewMode === "class" && (
                        <>
                          <div className="flex flex-col gap-1.5" style={{ minWidth: 170, flex: 1 }}>
                            <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
                              {t("selectClass")}
                            </label>
                            {loadingClasses ? (
                              <div className={cn(controlClasses, "flex items-center gap-2 text-[var(--text-muted)]")}>
                                <div className="h-3 w-3 border-2 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                                <span className="text-xs">{isEn ? "Loading..." : "جارٍ التحميل..."}</span>
                              </div>
                            ) : (
                              <select
                                className={controlClasses}
                                value={schedule.selectedClass}
                                onChange={(e) => {
                                  schedule.setSelectedClass(e.target.value);
                                  schedule.setSelectedSection("");
                                }}
                              >
                                <option value="">{isEn ? "— Select class —" : "— اختر الصف —"}</option>
                                {classes.map((cls) => (
                                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5" style={{ minWidth: 150, flex: 1 }}>
                            <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
                              {t("selectSection")}
                            </label>
                            <select
                              className={controlClasses}
                              value={schedule.selectedSection}
                              onChange={(e) => schedule.setSelectedSection(e.target.value)}
                              disabled={!schedule.selectedClass || filteredSections.length === 0}
                            >
                              <option value="">{t("allSections")}</option>
                              {filteredSections.map((sec) => (
                                <option key={sec.id} value={sec.name}>{sec.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {/* Teacher mode selector */}
                      {viewMode === "teacher" && (
                        <div className="flex flex-col gap-1.5" style={{ minWidth: 210, flex: 1 }}>
                          <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
                            اختر المعلم
                          </label>
                          <select
                            className={controlClasses}
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                          >
                            <option value="">— اختر المعلم —</option>
                            {teachersList.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Overview mode day selector */}
                      {viewMode === "overview" && (
                        <div className="flex flex-col gap-1.5" style={{ minWidth: 170, flex: 1 }}>
                          <label className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">
                            اختر اليوم
                          </label>
                          <select
                            className={controlClasses}
                            value={overviewDay}
                            onChange={(e) => {
                              setOverviewDay(e.target.value);
                              void fetchOverview(e.target.value);
                            }}
                          >
                            {timeSlotsSettings.workingDays
                              .filter((d) => d.is_active)
                              .map((d) => (
                                <option key={d.day_key} value={d.day_key}>{d.name_ar}</option>
                              ))}
                          </select>
                        </div>
                      )}

                      <div className="flex-[2]" />

                      {/* ── Actions group ── */}
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">

                        {/* Secondary actions pill */}
                        <div
                          className="flex items-center gap-0.5 p-1 rounded-2xl border border-[var(--border)]"
                          style={{ background: "var(--surface-soft)" }}
                        >
                          {canEdit && schoolId && (
                            <button
                              onClick={() => setTimeSlotsModalOpen(true)}
                              title={isEn ? "Schedule settings" : "إعدادات الجدول"}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--primary)] hover:shadow-sm"
                            >
                              <Settings size={14} />
                              <span className="hidden sm:inline">الإعدادات</span>
                            </button>
                          )}

                          <button
                            onClick={() => window.print()}
                            title="طباعة"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] hover:shadow-sm"
                          >
                            <Printer size={14} />
                            <span className="hidden sm:inline">طباعة</span>
                          </button>

                          {schedule.grid && viewMode === "class" && (
                            <button
                              onClick={() =>
                                exportGridToCSV(
                                  schedule.grid!,
                                  timeSlotsSettings.slots,
                                  timeSlotsSettings.workingDays,
                                  schedule.selectedClass,
                                  schedule.selectedSection,
                                )
                              }
                              title="تصدير CSV"
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] hover:shadow-sm"
                            >
                              <Download size={14} />
                              <span className="hidden sm:inline">تصدير CSV</span>
                            </button>
                          )}

                          {canEdit && viewMode === "class" && schedule.selectedClass && schedule.grid && (
                            <button
                              onClick={() => setCloneModalOpen(true)}
                              title="نسخ الجدول"
                              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] hover:shadow-sm"
                            >
                              <Copy size={14} />
                              <span className="hidden sm:inline">نسخ الجدول</span>
                            </button>
                          )}

                          {viewMode === "class" && (
                            <button
                              onClick={schedule.refresh}
                              disabled={!schedule.selectedClass || schedule.loading}
                              title={isEn ? "Reload" : "إعادة تحميل"}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border-none text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--primary)] hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>

                        {/* Save — primary CTA */}
                        {canEdit && viewMode === "class" && (
                          <motion.button
                            onClick={() => void schedule.saveSchedule()}
                            disabled={!schedule.grid || schedule.saving || !schedule.selectedClass}
                            whileHover={schedule.grid && schedule.selectedClass && !schedule.saving ? { scale: 1.03 } : undefined}
                            whileTap={schedule.grid && schedule.selectedClass && !schedule.saving ? { scale: 0.97 } : undefined}
                            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border-none text-sm font-black cursor-pointer transition-all"
                            style={{
                              background: schedule.grid && schedule.selectedClass && !schedule.saving
                                ? "linear-gradient(135deg, var(--primary), #818cf8)"
                                : "var(--surface-muted)",
                              color: schedule.grid && schedule.selectedClass && !schedule.saving
                                ? "#fff"
                                : "var(--text-muted)",
                              boxShadow: schedule.grid && schedule.selectedClass && !schedule.saving
                                ? "0 4px 18px rgba(99,102,241,0.4)"
                                : "none",
                              opacity: schedule.grid && schedule.selectedClass ? 1 : 0.6,
                            }}
                          >
                            {schedule.saving ? (
                              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                            {schedule.saving ? t("saving") : t("saveSchedule")}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Working days toggle — class mode only */}
                    {viewMode === "class" && timeSlotsSettings.workingDays.length > 0 && (
                      <div className="pt-4 border-t border-[var(--border)]">
                        <WorkingDaysToggle
                          workingDays={timeSlotsSettings.workingDays}
                          canEdit={canEdit}
                          onToggle={timeSlotsSettings.toggleDay}
                          onSave={() => void timeSlotsSettings.saveWorkingDays()}
                          saving={timeSlotsSettings.saving}
                        />
                      </div>
                    )}
                  </div>

                  {/* Schedule content area */}
                  <section className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {/* Class view */}
                        {viewMode === "class" && (
                          <>
                            {!schedule.selectedClass ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
                                <motion.div
                                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                                  className="text-[var(--primary)]/40"
                                >
                                  <CalendarDays size={48} strokeWidth={1.2} />
                                </motion.div>
                                <p className="text-sm font-bold">{t("selectClassFirst")}</p>
                              </div>
                            ) : schedule.loading || timeSlotsSettings.loading ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <motion.div
                                  className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                                />
                                <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                                  {isEn ? "Loading schedule..." : "جارٍ تحميل الجدول..."}
                                </span>
                              </div>
                            ) : !schedule.grid ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
                                <CalendarDays size={40} strokeWidth={1.2} className="text-[var(--text-muted)]/40" />
                                <p className="text-sm font-bold">{t("noSchedule")}</p>
                                {canEdit && (
                                  <p className="text-xs">{isEn ? "Click any cell to start adding." : "انقر على أي خلية للبدء."}</p>
                                )}
                              </div>
                            ) : (
                              <div className="p-4 sm:p-6 space-y-4">
                                <ConflictBanner
                                  grid={schedule.grid}
                                  timeSlots={timeSlotsSettings.slots}
                                  workingDays={timeSlotsSettings.workingDays}
                                />
                                {isMobile ? (
                                  <MobileScheduleView
                                    grid={schedule.grid}
                                    timeSlots={timeSlotsSettings.slots}
                                    workingDays={timeSlotsSettings.workingDays}
                                    canEdit={canEdit}
                                    onCellClick={openCell}
                                  />
                                ) : (
                                  <ScheduleGridView
                                    grid={schedule.grid}
                                    timeSlots={timeSlotsSettings.slots}
                                    workingDays={timeSlotsSettings.workingDays}
                                    canEdit={canEdit}
                                    onCellClick={openCell}
                                    onSwapCells={schedule.swapCells}
                                    onToggleLock={schedule.toggleLock}
                                  />
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Teacher view */}
                        {viewMode === "teacher" && (
                          <div className="p-4 sm:p-6">
                            {!selectedTeacher ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
                                <GraduationCap size={40} strokeWidth={1.2} className="text-[var(--text-muted)]/40" />
                                <p className="text-sm font-bold">اختر معلماً لعرض جدوله</p>
                              </div>
                            ) : (
                              <TeacherView
                                entries={teacherEntries}
                                timeSlots={timeSlotsSettings.slots}
                                workingDays={timeSlotsSettings.workingDays}
                              />
                            )}
                          </div>
                        )}

                        {/* Overview view */}
                        {viewMode === "overview" && (
                          <div className="p-4 sm:p-6">
                            {!overviewDay ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
                                <School size={40} strokeWidth={1.2} className="text-[var(--text-muted)]/40" />
                                <p className="text-sm font-bold">اختر يوماً لعرض الجدول العام</p>
                              </div>
                            ) : (
                              <OverviewView
                                entries={overviewEntries}
                                timeSlots={timeSlotsSettings.slots}
                              />
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </section>

                  {/* Legend — class mode only */}
                  {viewMode === "class" && schedule.grid && (
                    <div className="flex flex-wrap items-center gap-4 px-1">
                      <div className="flex items-center gap-1.5">
                        <div style={{
                          height: 16, width: 32, borderRadius: 5,
                          background: "rgba(59,130,246,0.07)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          borderTop: "3px solid #3b82f6",
                        }} />
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          {isEn ? "Assigned period" : "حصة مسجلة"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div style={{
                          height: 16, width: 32, borderRadius: 5,
                          background: "transparent",
                          border: "1.5px dashed var(--border-strong)",
                        }} />
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          {isEn ? "Empty period" : "حصة فارغة"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div style={{
                          height: 16, width: 32, borderRadius: 5,
                          background: "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(251,191,36,0.15) 4px,rgba(251,191,36,0.15) 8px)",
                          border: "1px solid rgba(251,191,36,0.25)",
                        }} />
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          {isEn ? "Break" : "استراحة"}
                        </span>
                      </div>
                      {canEdit && (
                        <span className="text-[11px] font-bold text-[var(--text-muted)] ms-auto">
                          {isEn ? "Click a cell to edit" : "انقر على الخلية للتعديل"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Cell edit modal */}
      <ScheduleCellModal
        open={modalOpen}
        day={modalDay}
        period={modalSlotLabel}
        initialSubject={modalCell?.subject ?? ""}
        initialTeacher={modalCell?.teacher_name ?? ""}
        onSave={handleSaveCell}
        onClear={handleClearCell}
        onClose={() => setModalOpen(false)}
      />

      {/* Time slots & working days settings modal */}
      {timeSlotsModalOpen && schoolId && (
        <TimeSlotsModal
          open={timeSlotsModalOpen}
          onClose={() => setTimeSlotsModalOpen(false)}
          schoolId={schoolId}
        />
      )}

      {/* Clone modal */}
      {cloneModalOpen && schoolId && (
        <CloneModal
          open={cloneModalOpen}
          onClose={() => setCloneModalOpen(false)}
          schoolId={schoolId}
          fromClass={schedule.selectedClass}
          fromSection={schedule.selectedSection}
          classes={classes}
          sections={sections}
          onSuccess={() => void schedule.refresh()}
        />
      )}
    </ProtectedRoute>
  );
}
