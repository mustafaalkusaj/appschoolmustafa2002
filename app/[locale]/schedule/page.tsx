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
import { Save, RotateCcw, Settings, CalendarDays, GraduationCap, School, Users, Printer, Download, Copy, CheckCircle2, Archive } from "@/lib/icons";
import { useArchiveMode } from "@/hooks/useArchiveMode";
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

// ── Shared helpers ───────────────────────────────────────────────────────────
const PRINT_PALETTE = [
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  { bg: "#fefce8", text: "#a16207", border: "#fde68a" },
  { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  { bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8" },
  { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  { bg: "#f7fee7", text: "#3f6212", border: "#d9f99d" },
  { bg: "#fdf4ff", text: "#86198f", border: "#f5d0fe" },
];

function subjectPalette(subject: string) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) & 0xffffffff;
  return PRINT_PALETTE[Math.abs(h) % PRINT_PALETTE.length];
}

function sortedDays(workingDays: WorkingDay[]) {
  return workingDays.filter((d) => d.is_active).sort((a, b) => a.day_order - b.day_order);
}
function sortedSlots(timeSlots: TimeSlot[]) {
  return timeSlots.filter((s) => s.is_active).sort((a, b) => a.slot_order - b.slot_order);
}

// ── Print ─────────────────────────────────────────────────────────────────────
function printSchedule(
  grid: ScheduleGrid,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
  className: string,
  section: string,
  schoolName = "",
) {
  const activeDays  = sortedDays(workingDays);
  const activeSlots = sortedSlots(timeSlots);
  const title   = `جدول ${className}${section ? ` — ${section}` : ""}`;
  const dateStr = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  const allCells = activeSlots.flatMap((s) =>
    s.slot_type !== "break" ? activeDays.map((d) => grid[d.day_key]?.[s.id]) : [],
  );
  const filled = allCells.filter((c) => c?.subject).length;
  const total  = allCells.length;
  const pct    = total > 0 ? Math.round((filled / total) * 100) : 0;

  // Build subject → Set<teacher> map for legend
  const subjectMap = new Map<string, Set<string>>();
  for (const cell of allCells) {
    if (!cell?.subject) continue;
    if (!subjectMap.has(cell.subject)) subjectMap.set(cell.subject, new Set());
    if (cell.teacher_name) subjectMap.get(cell.subject)!.add(cell.teacher_name);
  }
  const legendItems = Array.from(subjectMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "ar"))
    .map(([subj, teachers]) => {
      const pal = subjectPalette(subj);
      const tchrStr = teachers.size ? Array.from(teachers).join("، ") : "";
      return `<div class="leg-item">
        <span class="leg-dot" style="background:${pal.text}"></span>
        <span class="leg-subj" style="color:${pal.text}">${subj}</span>
        ${tchrStr ? `<span class="leg-sep">·</span><span class="leg-tchr">${tchrStr}</span>` : ""}
      </div>`;
    }).join("");

  const headerCols = activeDays.map((d) => `<th>${d.name_ar}</th>`).join("");

  const bodyRows = activeSlots.map((slot, i) => {
    const isBreak = slot.slot_type === "break";
    const slotHtml = `<span class="sname">${slot.name_ar}</span>${slot.start_time ? `<span class="stime">${slot.start_time}–${slot.end_time}</span>` : ""}`;

    if (isBreak) {
      return `<tr class="break-row">
        <td class="slot-col">${slotHtml}</td>
        ${activeDays.map(() => `<td class="break-cell">☕ استراحة</td>`).join("")}
      </tr>`;
    }

    const cells = activeDays.map((day) => {
      const cell = grid[day.day_key]?.[slot.id];
      if (!cell?.subject) return `<td class="empty-cell"><span class="dash">—</span></td>`;
      const pal    = subjectPalette(cell.subject);
      const locked = cell.is_locked ? `<span class="lock-badge">مثبّت</span>` : "";
      return `<td style="background:${pal.bg};border-color:${pal.border}">
        ${locked}<span class="subj" style="color:${pal.text}">${cell.subject}</span>
        ${cell.teacher_name ? `<span class="tchr" style="color:${pal.text}">${cell.teacher_name}</span>` : ""}
      </td>`;
    }).join("");

    return `<tr class="${i % 2 === 0 ? "stripe" : ""}">
      <td class="slot-col">${slotHtml}</td>${cells}
    </tr>`;
  }).join("");

  // Build school initials for emblem
  const initials = (schoolName || "م").split(" ").slice(0, 2).map((w: string) => w[0]).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 8mm 7mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;color:#0f172a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ══════════════ HERO HEADER ══════════════ */
  .hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e293b 100%);border-radius:12px;margin-bottom:10px;padding:14px 18px}
  .hero::before{content:"";position:absolute;top:-30px;left:-30px;width:160px;height:160px;border-radius:50%;background:rgba(99,102,241,0.15)}
  .hero::after{content:"";position:absolute;bottom:-40px;right:60px;width:120px;height:120px;border-radius:50%;background:rgba(56,189,248,0.10)}
  .hero-inner{position:relative;z-index:1;display:flex;align-items:center;gap:14px}
  .emblem{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;flex-shrink:0;letter-spacing:-0.03em;box-shadow:0 4px 14px rgba(99,102,241,0.5)}
  .hero-text{flex:1}
  .hero-school{font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:3px}
  .hero-title{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.02em;line-height:1.15}
  .hero-sub{font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px}
  .hero-stats{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
  .stat-pill{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:3px 10px;font-size:9px;color:rgba(255,255,255,0.8)}
  .stat-pill strong{color:#fff;font-size:11px}
  .pbar-wrap{width:90px;height:5px;background:rgba(255,255,255,0.15);border-radius:3px;overflow:hidden}
  .pbar-fill{height:5px;background:linear-gradient(90deg,#6366f1,#38bdf8);border-radius:3px;width:${pct}%}
  .accent-line{height:2px;background:linear-gradient(90deg,#6366f1,#38bdf8,transparent);border-radius:1px;margin-top:10px;opacity:0.6}

  /* ══════════════ TABLE ══════════════ */
  table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;margin-bottom:10px;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.07)}
  thead tr th{background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);color:#fff;padding:8px 5px;text-align:center;font-size:10px;font-weight:800;border-bottom:2px solid #6366f1;letter-spacing:0.04em}
  thead tr th:first-child{border-radius:0 10px 0 0}
  thead tr th:last-child{border-radius:10px 0 0 0}
  tbody tr td{padding:6px 4px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9;text-align:center;vertical-align:middle;font-size:10px}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:last-child td:first-child{border-radius:0 0 0 10px}
  tbody tr:last-child td:last-child{border-radius:0 0 10px 0}

  /* Slot column */
  .slot-col{background:linear-gradient(180deg,#f8fafc,#f1f5f9);font-weight:700;white-space:nowrap;width:76px;min-width:76px;border-right:2px solid #e2e8f0!important;position:relative}
  .slot-col::before{content:"";position:absolute;right:0;top:20%;bottom:20%;width:2px;background:linear-gradient(180deg,transparent,#6366f1,transparent)}
  .sname{display:block;font-size:9.5px;font-weight:900;color:#334155;letter-spacing:0.02em}
  .stime{display:block;font-size:7.5px;color:#94a3b8;margin-top:2px;font-variant-numeric:tabular-nums}

  /* Break row */
  .break-row td{background:linear-gradient(90deg,#fffbeb,#fefce8)!important;border-color:#fde68a!important}
  .break-row .slot-col{background:linear-gradient(180deg,#fef3c7,#fde68a)!important}
  .break-row .slot-col::before{background:linear-gradient(180deg,transparent,#f59e0b,transparent)}
  .break-row .sname{color:#92400e}
  .break-row .stime{color:#b45309}
  .break-cell{color:#b45309;font-style:italic;font-size:9.5px;letter-spacing:0.01em}

  /* Striped row */
  .stripe td:not(.slot-col):not([style]){background:#fafbff}

  /* Empty cell */
  .empty-cell{background:#f8fafc!important}
  .dash{color:#dde1e9;font-size:18px;line-height:1}

  /* Filled cell */
  .subj{display:block;font-weight:900;font-size:10.5px;line-height:1.25;letter-spacing:-0.01em}
  .tchr{display:block;font-size:7.5px;margin-top:3px;font-weight:600;opacity:0.75}
  .lock-badge{display:inline-block;font-size:7px;background:rgba(245,158,11,0.15);color:#b45309;border-radius:3px;padding:0 3px;margin-right:2px;vertical-align:middle}

  /* ══════════════ LEGEND ══════════════ */
  .legend{border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);margin-bottom:8px}
  .legend-hdr{display:flex;align-items:center;gap:6px;margin-bottom:7px}
  .legend-icon{width:16px;height:16px;border-radius:4px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:900}
  .legend-lbl{font-size:9px;font-weight:900;color:#475569;letter-spacing:0.08em;text-transform:uppercase}
  .legend-grid{display:flex;flex-wrap:wrap;gap:5px}
  .leg-item{display:flex;align-items:center;gap:5px;background:#fff;border-radius:6px;padding:3px 8px 3px 4px;border:1px solid #e2e8f0;font-size:8.5px}
  .leg-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .leg-subj{font-weight:800;color:#1e293b}
  .leg-sep{color:#cbd5e1;font-size:8px}
  .leg-tchr{color:#64748b}

  /* ══════════════ FOOTER ══════════════ */
  .footer{display:flex;align-items:center;gap:8px;margin-top:2px}
  .footer-line{flex:1;height:1px;background:linear-gradient(90deg,#e2e8f0,transparent)}
  .footer-line.r{background:linear-gradient(270deg,#e2e8f0,transparent)}
  .footer-text{font-size:7.5px;color:#94a3b8;white-space:nowrap;text-align:center}
  .footer-dot{width:3px;height:3px;border-radius:50%;background:#6366f1;opacity:0.4}

  @media print{
    @page{margin:6mm 5mm}
    body{font-size:10px}
    .hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>

  <!-- ══ HERO ══ -->
  <div class="hero">
    <div class="hero-inner">
      <div class="emblem">${initials}</div>
      <div class="hero-text">
        <div class="hero-school">${schoolName || "المدرسة"}</div>
        <div class="hero-title">${title}</div>
        <div class="hero-sub">الجدول الدراسي &nbsp;·&nbsp; ${dateStr}</div>
      </div>
      <div class="hero-stats">
        <div class="stat-pill">📅 أيام الدراسة &nbsp;<strong>${activeDays.length}</strong></div>
        <div class="stat-pill">
          <strong>${filled}</strong>&nbsp;/&nbsp;${total}&nbsp; حصة مملوءة
        </div>
        <div style="display:flex;align-items:center;gap:5px">
          <div class="pbar-wrap"><div class="pbar-fill"></div></div>
          <span style="font-size:9px;color:rgba(255,255,255,0.6)">${pct}%</span>
        </div>
      </div>
    </div>
    <div class="accent-line"></div>
  </div>

  <!-- ══ TABLE ══ -->
  <table>
    <thead><tr><th>الحصة</th>${headerCols}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>

  <!-- ══ LEGEND ══ -->
  ${legendItems ? `
  <div class="legend">
    <div class="legend-hdr">
      <div class="legend-icon">م</div>
      <span class="legend-lbl">دليل المواد والأساتذة</span>
    </div>
    <div class="legend-grid">${legendItems}</div>
  </div>` : ""}

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div class="footer-line"></div>
    <div class="footer-dot"></div>
    <div class="footer-text">النظام المدرسي &nbsp;·&nbsp; طُبع بتاريخ ${dateStr}</div>
    <div class="footer-dot"></div>
    <div class="footer-line r"></div>
  </div>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url, "_blank", "width=1280,height=860");
  if (w) { w.focus(); setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 700); }
}

// ── CSV ───────────────────────────────────────────────────────────────────────
function exportGridToCSV(
  grid: ScheduleGrid,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
  className: string,
  section: string,
  schoolName = "",
) {
  const activeDays  = sortedDays(workingDays);
  const activeSlots = sortedSlots(timeSlots);
  const dateStr     = new Date().toLocaleDateString("ar-SA");

  // Separate subject + teacher columns per day
  const dayHeaders = activeDays.flatMap((d) => [`مادة — ${d.name_ar}`, `أستاذ — ${d.name_ar}`]);
  const header     = ["الحصة", "الوقت", ...dayHeaders];

  const dataRows = activeSlots.map((slot) => {
    const time = slot.start_time ? `${slot.start_time}–${slot.end_time}` : "";
    if (slot.slot_type === "break")
      return [slot.name_ar, time, ...activeDays.flatMap(() => ["— استراحة —", ""])];
    return [
      slot.name_ar,
      time,
      ...activeDays.flatMap((day) => {
        const cell = grid[day.day_key]?.[slot.id];
        if (!cell?.subject) return ["", ""];
        return [`${cell.subject}${cell.is_locked ? " 🔒" : ""}`, cell.teacher_name ?? ""];
      }),
    ];
  });

  // ── Stats block ──
  const periodSlots = activeSlots.filter((s) => s.slot_type !== "break");
  const allCells    = periodSlots.flatMap((s) => activeDays.map((d) => grid[d.day_key]?.[s.id]));
  const filled      = allCells.filter((c) => c?.subject).length;
  const pct         = allCells.length > 0 ? Math.round((filled / allCells.length) * 100) : 0;

  // Fill rate per day
  const dayStats = activeDays.map((day) => {
    const dayCells  = periodSlots.map((s) => grid[day.day_key]?.[s.id]);
    const dayFilled = dayCells.filter((c) => c?.subject).length;
    return `${day.name_ar}: ${dayFilled}/${dayCells.length}`;
  });

  // Subject frequency
  const subjectFreq = new Map<string, number>();
  const teacherLoad = new Map<string, number>();
  for (const cell of allCells) {
    if (!cell?.subject) continue;
    subjectFreq.set(cell.subject, (subjectFreq.get(cell.subject) ?? 0) + 1);
    if (cell.teacher_name) teacherLoad.set(cell.teacher_name, (teacherLoad.get(cell.teacher_name) ?? 0) + 1);
  }
  const topSubjects = Array.from(subjectFreq.entries()).sort((a, b) => b[1] - a[1]).map(([s, n]) => `${s}(${n})`);
  const topTeachers = Array.from(teacherLoad.entries()).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}(${n})`);

  const emptyRow: string[] = [];
  const stats = [
    emptyRow,
    ["── الإحصائيات ──"],
    [schoolName ? `المدرسة: ${schoolName}` : "", `الجدول: ${className}${section ? ` — ${section}` : ""}`, `تاريخ التصدير: ${dateStr}`],
    [`الحصص المملوءة: ${filled} / ${allCells.length} (${pct}%)`],
    ["نسبة الإكمال لكل يوم:", ...dayStats],
    ["المواد (تكراراً):", ...topSubjects],
    ["الأساتذة (حصصاً):", ...topTeachers],
  ];

  const meta = [
    [schoolName || "المدرسة", `جدول: ${className}${section ? ` — ${section}` : ""}`, `التصدير: ${dateStr}`, `الإكمال: ${pct}%`],
    emptyRow,
  ];

  const allRows = [...meta, header, ...dataRows, ...stats];
  const csv     = allRows.map((r) => r.map((v) => `"${String(v ?? "")}"`).join(",")).join("\n");
  const blob    = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href = url;
  a.download = `جدول_${className}${section ? `_${section}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Excel (exceljs — full styling) ───────────────────────────────────────────
async function exportToExcel(
  grid: ScheduleGrid,
  timeSlots: TimeSlot[],
  workingDays: WorkingDay[],
  className: string,
  section: string,
  schoolName = "",
) {
  const ExcelJS    = (await import("exceljs")).default;
  const activeDays  = sortedDays(workingDays);
  const activeSlots = sortedSlots(timeSlots);
  const title      = `جدول ${className}${section ? ` — ${section}` : ""}`;
  const dateStr    = new Date().toLocaleDateString("ar-SA");
  const colCount   = 2 + activeDays.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "النظام المدرسي";
  wb.created = new Date();

  // ════════════════════════════════════════════════
  // ── Sheet 1: الجدول ──
  // ════════════════════════════════════════════════
  const ws = wb.addWorksheet("الجدول", { views: [{ rightToLeft: true }] });
  ws.columns = [
    { width: 18 },
    { width: 13 },
    ...activeDays.map(() => ({ width: 24 })),
  ];

  // Row 1 — School name
  ws.addRow([schoolName || "المدرسة"]);
  ws.mergeCells(1, 1, 1, colCount);
  Object.assign(ws.getCell("A1"), {
    font:      { name: "Arial", bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } },
    alignment: { horizontal: "center", vertical: "middle", readingOrder: "rtl" },
  });
  ws.getRow(1).height = 20;

  // Row 2 — Schedule title
  ws.addRow([title]);
  ws.mergeCells(2, 1, 2, colCount);
  Object.assign(ws.getCell("A2"), {
    font:      { name: "Arial", bold: true, size: 14, color: { argb: "FFFFFFFF" } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } },
    alignment: { horizontal: "center", vertical: "middle", readingOrder: "rtl" },
  });
  ws.getRow(2).height = 32;

  // Row 3 — Date meta
  ws.addRow([`تاريخ التصدير: ${dateStr}`]);
  ws.mergeCells(3, 1, 3, colCount);
  Object.assign(ws.getCell("A3"), {
    font:      { name: "Arial", italic: true, size: 9, color: { argb: "FF94A3B8" } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
    alignment: { horizontal: "center", readingOrder: "rtl" },
  });
  ws.getRow(3).height = 15;

  // Row 4 — Column headers
  const hdr = ws.addRow(["الحصة", "الوقت", ...activeDays.map((d) => d.name_ar)]);
  hdr.eachCell((cell) => {
    cell.font      = { name: "Arial", bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border    = { bottom: { style: "medium", color: { argb: "FF1E293B" } } };
  });
  ws.getRow(4).height = 24;

  // Freeze top 4 rows + auto-filter on row 4
  ws.views = [{ state: "frozen", ySplit: 4, rightToLeft: true }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colCount } };

  // Data rows
  for (const slot of activeSlots) {
    const isBreak = slot.slot_type === "break";
    const time    = slot.start_time ? `${slot.start_time}–${slot.end_time}` : "";

    if (isBreak) {
      const br = ws.addRow([slot.name_ar, time, ...activeDays.map(() => "☕ استراحة")]);
      br.eachCell((cell) => {
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        cell.font      = { name: "Arial", italic: true, size: 10, color: { argb: "FF92400E" } };
        cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
        cell.border    = { bottom: { style: "thin", color: { argb: "FFFDE68A" } } };
      });
      br.height = 20;
      continue;
    }

    const rowData = [
      slot.name_ar,
      time,
      ...activeDays.map((day) => {
        const cell = grid[day.day_key]?.[slot.id];
        return cell?.subject
          ? `${cell.subject}${cell.teacher_name ? `\n${cell.teacher_name}` : ""}${cell.is_locked ? " 🔒" : ""}`
          : "";
      }),
    ];
    const row  = ws.addRow(rowData);
    row.height = 36;

    const nc = row.getCell(1);
    nc.font      = { name: "Arial", bold: true, size: 10, color: { argb: "FF334155" } };
    nc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    nc.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    nc.border    = { right: { style: "medium", color: { argb: "FFCBD5E1" } } };

    const tc = row.getCell(2);
    tc.font      = { name: "Arial", size: 9, color: { argb: "FF64748B" } };
    tc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    tc.alignment = { horizontal: "center", vertical: "middle" };

    activeDays.forEach((day, di) => {
      const cell   = grid[day.day_key]?.[slot.id];
      const xlCell = row.getCell(3 + di);
      xlCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };

      if (!cell?.subject) {
        xlCell.value = "—";
        xlCell.font  = { name: "Arial", color: { argb: "FFCBD5E1" }, size: 13 };
        xlCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
        xlCell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      } else {
        const pal  = subjectPalette(cell.subject);
        const bs   = { style: "thin" as const, color: { argb: "FF" + pal.border.replace("#", "") } };
        xlCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + pal.bg.replace("#", "") } };
        xlCell.font   = { name: "Arial", bold: true, size: 10, color: { argb: "FF" + pal.text.replace("#", "") } };
        xlCell.border = { top: bs, bottom: bs, left: bs, right: bs };
      }
    });
  }

  // ════════════════════════════════════════════════
  // ── Sheet 2: الإحصائيات ──
  // ════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("الإحصائيات", { views: [{ rightToLeft: true }] });
  ws2.columns = [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 16 }];

  const periodSlots = activeSlots.filter((s) => s.slot_type !== "break");

  // Subject frequency + teacher load maps
  const subjectFreq = new Map<string, number>();
  const teacherLoad = new Map<string, number>();
  for (const slot of periodSlots) {
    for (const day of activeDays) {
      const cell = grid[day.day_key]?.[slot.id];
      if (!cell?.subject) continue;
      subjectFreq.set(cell.subject, (subjectFreq.get(cell.subject) ?? 0) + 1);
      if (cell.teacher_name)
        teacherLoad.set(cell.teacher_name, (teacherLoad.get(cell.teacher_name) ?? 0) + 1);
    }
  }

  // Fill rate per day
  const dayFill = activeDays.map((day) => {
    const cells  = periodSlots.map((s) => grid[day.day_key]?.[s.id]);
    const filled = cells.filter((c) => c?.subject).length;
    return { day: day.name_ar, filled, total: cells.length };
  });
  const totalFilled = dayFill.reduce((acc, d) => acc + d.filled, 0);
  const totalSlots  = dayFill.reduce((acc, d) => acc + d.total, 0);

  // Helper: add a styled section header
  const addSectionHeader = (label: string, color: string) => {
    const r = ws2.addRow([label]);
    ws2.mergeCells(r.number, 1, r.number, 4);
    Object.assign(ws2.getCell(r.number, 1), {
      font:      { name: "Arial", bold: true, size: 11, color: { argb: "FFFFFFFF" } },
      fill:      { type: "pattern", pattern: "solid", fgColor: { argb: color } },
      alignment: { horizontal: "right", readingOrder: "rtl" },
    });
    r.height = 22;
  };

  const addTableHeader = (...cols: string[]) => {
    const r = ws2.addRow(cols);
    r.eachCell((cell) => {
      cell.font  = { name: "Arial", bold: true, size: 10, color: { argb: "FF334155" } };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      cell.border = { bottom: { style: "medium", color: { argb: "FFE2E8F0" } } };
      cell.alignment = { horizontal: "center" };
    });
    r.height = 18;
  };

  // ── Overview ──
  ws2.addRow([]);
  addSectionHeader("📊  نظرة عامة", "FF1E293B");
  addTableHeader("البيان", "القيمة");
  const overviewData = [
    ["المدرسة", schoolName || "—"],
    ["الجدول", title],
    ["تاريخ التصدير", dateStr],
    ["إجمالي الحصص", String(totalSlots)],
    ["الحصص المملوءة", String(totalFilled)],
    ["الحصص الفارغة", String(totalSlots - totalFilled)],
    ["نسبة الإكمال", totalSlots > 0 ? `${Math.round((totalFilled / totalSlots) * 100)}%` : "—"],
  ];
  for (const [k, v] of overviewData) {
    const r = ws2.addRow([k, v]);
    r.getCell(1).font = { name: "Arial", bold: true, size: 10 };
    r.getCell(2).alignment = { horizontal: "center" };
  }

  // ── Fill rate per day ──
  ws2.addRow([]);
  addSectionHeader("📅  معدل الإكمال لكل يوم", "FF334155");
  addTableHeader("اليوم", "مملوءة", "فارغة", "النسبة");
  for (const { day, filled, total } of dayFill) {
    const r = ws2.addRow([day, filled, total - filled, total > 0 ? `${Math.round((filled / total) * 100)}%` : "—"]);
    r.eachCell((cell, ci) => {
      cell.alignment = { horizontal: ci === 1 ? "right" : "center" };
      if (ci === 1) cell.font = { name: "Arial", bold: true, size: 10 };
    });
    const pctVal = total > 0 ? filled / total : 0;
    r.getCell(4).fill = {
      type: "pattern", pattern: "solid",
      fgColor: { argb: pctVal >= 0.8 ? "FFD1FAE5" : pctVal >= 0.5 ? "FFFEF9C3" : "FFFEE2E2" },
    };
  }

  // ── Subject frequency ──
  ws2.addRow([]);
  addSectionHeader("📚  المواد الدراسية", "FF475569");
  addTableHeader("المادة", "عدد الحصص", "", "");
  const sortedSubjects = Array.from(subjectFreq.entries()).sort((a, b) => b[1] - a[1]);
  for (const [subj, count] of sortedSubjects) {
    const r = ws2.addRow([subj, count]);
    r.getCell(1).font = { name: "Arial", bold: true, size: 10, color: { argb: "FF" + subjectPalette(subj).text.replace("#", "") } };
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + subjectPalette(subj).bg.replace("#", "") } };
    r.getCell(2).alignment = { horizontal: "center" };
  }

  // ── Teacher load ──
  if (teacherLoad.size > 0) {
    ws2.addRow([]);
    addSectionHeader("👨‍🏫  حمل الأساتذة", "FF64748B");
    addTableHeader("الأستاذ", "عدد الحصص", "", "");
    const sortedTeachers = Array.from(teacherLoad.entries()).sort((a, b) => b[1] - a[1]);
    for (const [teacher, count] of sortedTeachers) {
      const r = ws2.addRow([teacher, count]);
      r.getCell(1).font = { name: "Arial", size: 10 };
      r.getCell(2).alignment = { horizontal: "center" };
    }
  }

  // ── Download ──
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `جدول_${className}${section ? `_${section}` : ""}.xlsx`;
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
  const archiveMode = useArchiveMode();

  // Resolved school ID for API calls
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Classes / sections for the dropdowns
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("class");

  // Subjects list
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // Teacher view state
  const [teachersList, setTeachersList] = useState<{ id: string; full_name: string }[]>([]);
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

  // Fetch subjects list
  const fetchSubjects = useCallback(async (sid: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        subjects?: { id: string; name: string }[];
      }>(`/api/web/grades/subjects?schoolId=${sid}`);
      if (response.ok && payload?.ok) {
        setSubjectsList((payload.subjects ?? []).map((s) => s.name));
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (schoolId) void fetchSubjects(schoolId);
  }, [schoolId, fetchSubjects]);

  // Fetch teachers list from real teachers API
  const fetchTeachers = useCallback(async (sid: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        teachers?: { id: string; full_name: string }[];
      }>(`/api/web/teachers?schoolId=${sid}&pageSize=500`);
      if (response.ok && payload?.ok) setTeachersList(payload.teachers ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (schoolId && viewMode === "teacher") void fetchTeachers(schoolId);
  }, [schoolId, viewMode, fetchTeachers]);

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
    { id: "teacher",  label: "الأساتذة",    icon: GraduationCap, color: "var(--success)" },
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
            <div className="p-4 sm:p-6 space-y-6">

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

              {archiveMode.isArchiveMode && archiveMode.archiveData && (
                <div className="rounded-2xl flex items-center gap-3 px-5 py-3.5 border border-amber-500/30 mb-4"
                  style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)" }}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Archive size={15} className="text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">وضع الأرشيف — سنة {archiveMode.archiveData.year}</p>
                    <p className="text-sm font-black text-white">صفحة الجدول الدراسي لا تدعم عرض بيانات الأرشيف · يعرض الجدول الحالي فقط</p>
                  </div>
                  <button onClick={archiveMode.exitArchiveMode}
                    className="text-[11px] font-black text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                    خروج
                  </button>
                </div>
              )}

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
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)",
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
                            اختر الأستاذ
                          </label>
                          <select
                            className={controlClasses}
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                          >
                            <option value="">— اختر الأستاذ —</option>
                            {teachersList.map((t) => (
                              <option key={t.id} value={t.full_name}>{t.full_name}</option>
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
                            onClick={() => {
                              if (schedule.grid && viewMode === "class" && schedule.selectedClass) {
                                printSchedule(schedule.grid, timeSlotsSettings.slots, timeSlotsSettings.workingDays, schedule.selectedClass, schedule.selectedSection, profile?.school?.name ?? "");
                              } else {
                                window.print();
                              }
                            }}
                            title="طباعة"
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] hover:shadow-sm"
                          >
                            <Printer size={14} />
                            <span className="hidden sm:inline">طباعة</span>
                          </button>

                          {schedule.grid && viewMode === "class" && (
                            <>
                              <button
                                onClick={() =>
                                  exportGridToCSV(
                                    schedule.grid!,
                                    timeSlotsSettings.slots,
                                    timeSlotsSettings.workingDays,
                                    schedule.selectedClass,
                                    schedule.selectedSection,
                                    profile?.school?.name ?? "",
                                  )
                                }
                                title="تصدير CSV"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] hover:shadow-sm"
                              >
                                <Download size={14} />
                                <span className="hidden sm:inline">CSV</span>
                              </button>
                              <button
                                onClick={() =>
                                  void exportToExcel(
                                    schedule.grid!,
                                    timeSlotsSettings.slots,
                                    timeSlotsSettings.workingDays,
                                    schedule.selectedClass,
                                    schedule.selectedSection,
                                    profile?.school?.name ?? "",
                                  )
                                }
                                title="تصدير Excel"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--success)] hover:shadow-sm"
                              >
                                <Download size={14} />
                                <span className="hidden sm:inline">Excel</span>
                              </button>
                            </>
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
                  <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
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
                                <p className="text-sm font-bold">اختر أستاذاً لعرض جدوله</p>
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
        subjects={subjectsList}
        teachers={teachersList.map((t) => t.full_name)}
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
