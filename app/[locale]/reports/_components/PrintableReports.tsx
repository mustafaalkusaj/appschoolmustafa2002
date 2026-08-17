"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, Users, DollarSign, Loader2, CalendarDays, Search } from "@/lib/icons";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRuntimeBranding } from "@/hooks/brand";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { motion } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────

type StudentOption = { id: string; full_name: string; class_name: string | null };

type ClassOption = { class_name: string; section_name: string | null };

/**
 * `toISOString()` is UTC. Baghdad is UTC+3, so before 03:00 local it hands back
 * yesterday — the default report window opened on the wrong day.
 */
function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function PrintableReports() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEn = locale === "en";
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const branchId = runtimeBranding.branchId;

  // Student grade report state
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [gradeLoading, setGradeLoading] = useState(false);

  // Class attendance report state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [attFrom, setAttFrom] = useState("");
  const [attTo, setAttTo] = useState("");
  const [attLoading, setAttLoading] = useState(false);

  // Financial summary state
  const [finFrom, setFinFrom] = useState("");
  const [finTo, setFinTo] = useState("");
  const [finLoading, setFinLoading] = useState(false);

  // Option loading used to fail silently, leaving empty dropdowns with no clue why.
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // ── Load students and classes ──────────────────────────────────────────────

  const loadOptions = useCallback(async () => {
    if (!profile) return;
    const schoolId = await resolveSchoolIdForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });
    if (!schoolId) return;

    const params = new URLSearchParams({ schoolId, type: "students" });
    // Without the branch the student list — and the class list derived from it —
    // spans the whole school while the rest of the page is branch-scoped.
    if (branchId) params.set("branchId", branchId);
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      students?: Array<{ id: string; full_name: string; class_name: string | null }>;
      error?: { message?: string };
    }>(`/api/web/reports/dataset?${params.toString()}`);

    if (!response.ok) {
      setOptionsError(payload?.error?.message ?? (isEn ? "Failed to load students." : "تعذر تحميل قائمة الطلاب."));
      return;
    }
    setOptionsError(null);

    const studentsList = payload?.students ?? [];
    setStudents(studentsList);

    // Derive unique classes from students
    const classSet = new Set<string>();
    for (const s of studentsList) {
      if (s.class_name) classSet.add(s.class_name);
    }
    const classOptions: ClassOption[] = Array.from(classSet).map((cn) => ({
      class_name: cn,
      section_name: null,
    }));
    setClasses(classOptions.sort((a, b) => a.class_name.localeCompare(b.class_name)));

    // Default date range: current month
    const now = new Date();
    const monthStart = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const today = toLocalIsoDate(now);
    setAttFrom(monthStart);
    setAttTo(today);
    setFinFrom(monthStart);
    setFinTo(today);
  }, [profile, schoolScope.selectedSchoolId, branchId, isEn]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void loadOptions();
  }, [loadOptions, profile, schoolScope.scopeLoading]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const getSchoolId = useCallback(async () => {
    if (!profile) return null;
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const openGradeReport = useCallback(async () => {
    if (!selectedStudentId) return;
    setGradeLoading(true);
    try {
      const schoolId = await getSchoolId();
      if (!schoolId) return;
      const params = new URLSearchParams({ studentId: selectedStudentId, schoolId, locale });
      if (branchId) params.set("branchId", branchId);
      window.open(`/api/web/reports/student-grades?${params.toString()}`, "_blank");
    } finally {
      setGradeLoading(false);
    }
  }, [selectedStudentId, getSchoolId, locale, branchId]);

  const openAttendanceReport = useCallback(async () => {
    if (!selectedClass || !attFrom || !attTo) return;
    setAttLoading(true);
    try {
      const schoolId = await getSchoolId();
      if (!schoolId) return;
      const params = new URLSearchParams({
        className: selectedClass,
        schoolId,
        from: attFrom,
        to: attTo,
        locale,
      });
      if (branchId) params.set("branchId", branchId);
      window.open(`/api/web/reports/class-attendance?${params.toString()}`, "_blank");
    } finally {
      setAttLoading(false);
    }
  }, [selectedClass, attFrom, attTo, getSchoolId, locale, branchId]);

  const openFinancialReport = useCallback(async () => {
    if (!finFrom || !finTo) return;
    setFinLoading(true);
    try {
      const schoolId = await getSchoolId();
      if (!schoolId) return;
      const params = new URLSearchParams({ schoolId, from: finFrom, to: finTo, locale });
      if (branchId) params.set("branchId", branchId);
      window.open(`/api/web/reports/financial-summary?${params.toString()}`, "_blank");
    } finally {
      setFinLoading(false);
    }
  }, [finFrom, finTo, getSchoolId, locale, branchId]);

  // ── Filtered students ──────────────────────────────────────────────────────

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.class_name ?? "").toLowerCase().includes(studentSearch.toLowerCase()),
      ).slice(0, 20)
    : [];

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // ── Render ─────────────────────────────────────────────────────────────────

  const cards = [
    {
      id: "grades",
      title: isEn ? "Student Grade Report" : "تقرير درجات الطالب",
      description: isEn
        ? "Generate a printable grade report for a specific student."
        : "إنشاء تقرير درجات قابل للطباعة لطالب محدد.",
      icon: FileText,
      color: "var(--primary)",
      content: (
        <div className="space-y-3">
          <div className="relative">
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]">
              <Search size={14} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder={isEn ? "Search student..." : "ابحث عن طالب..."}
                value={selectedStudent ? selectedStudent.full_name : studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setSelectedStudentId(null);
                }}
                className="flex-1 bg-transparent text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            {filteredStudents.length > 0 && !selectedStudentId && (
              <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-lg)]">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setStudentSearch("");
                    }}
                    className="w-full text-start px-4 py-2.5 text-sm hover:bg-[var(--surface-soft)] transition-colors"
                  >
                    <span className="font-bold text-[var(--text-primary)]">{s.full_name}</span>
                    {s.class_name && (
                      <span className="text-[var(--text-muted)] ms-2 text-xs">{s.class_name}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={openGradeReport}
            disabled={!selectedStudentId || gradeLoading}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {gradeLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {isEn ? "Generate Report" : "إنشاء التقرير"}
          </button>
        </div>
      ),
    },
    {
      id: "attendance",
      title: isEn ? "Class Attendance Report" : "تقرير حضور الصف",
      description: isEn
        ? "Generate an attendance report for a class within a date range."
        : "إنشاء تقرير حضور لصف معين خلال فترة زمنية.",
      icon: Users,
      color: "var(--success)",
      content: (
        <div className="space-y-3">
          <select
            value={selectedClass ?? ""}
            onChange={(e) => setSelectedClass(e.target.value || null)}
            className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none"
          >
            <option value="">{isEn ? "Select class..." : "اختر الصف..."}</option>
            {classes.map((c) => (
              <option key={c.class_name} value={c.class_name}>
                {c.class_name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">
                {isEn ? "From" : "من"}
              </label>
              <input
                type="date"
                value={attFrom}
                onChange={(e) => setAttFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">
                {isEn ? "To" : "إلى"}
              </label>
              <input
                type="date"
                value={attTo}
                onChange={(e) => setAttTo(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
          <button
            onClick={openAttendanceReport}
            disabled={!selectedClass || !attFrom || !attTo || attLoading}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "var(--success)" }}
          >
            {attLoading ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
            {isEn ? "Generate Report" : "إنشاء التقرير"}
          </button>
        </div>
      ),
    },
    {
      id: "financial",
      title: isEn ? "Financial Summary" : "التقرير المالي الشامل",
      description: isEn
        ? "Generate a comprehensive financial overview for a date range."
        : "إنشاء نظرة شاملة على الوضع المالي لفترة زمنية.",
      icon: DollarSign,
      color: "var(--warning)",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">
                {isEn ? "From" : "من"}
              </label>
              <input
                type="date"
                value={finFrom}
                onChange={(e) => setFinFrom(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">
                {isEn ? "To" : "إلى"}
              </label>
              <input
                type="date"
                value={finTo}
                onChange={(e) => setFinTo(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
          <button
            onClick={openFinancialReport}
            disabled={!finFrom || !finTo || finLoading}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "var(--warning)" }}
          >
            {finLoading ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
            {isEn ? "Generate Report" : "إنشاء التقرير"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shrink-0">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--info)" }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {isEn ? "Printable PDF Reports" : "تقارير قابلة للطباعة"}
          </span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--info)" }} />
        </div>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {optionsError && (
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-5 py-3.5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)] shrink-0">
            <span className="text-sm font-black">!</span>
          </div>
          <p className="text-sm font-black text-[var(--danger)]">{optionsError}</p>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-[var(--shadow-md)] transition-all duration-200 flex flex-col"
            >
              <div className="h-1 w-full shrink-0" style={{ background: card.color }} />
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `color-mix(in srgb, ${card.color} 14%, transparent)`,
                      color: card.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-[var(--text-primary)] leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{card.description}</p>
                  </div>
                </div>
                <div className="flex-1">{card.content}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
