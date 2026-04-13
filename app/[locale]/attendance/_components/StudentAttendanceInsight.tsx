"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/formatting";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";
import { Search, Printer, Download, X, CalendarDays } from "@/lib/icons";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceStatusFilter = AttendanceStatus | "all";

type StudentSearchItem = {
  id: string;
  full_name: string;
  class_name: string;
  section: string | null;
};

type StudentAttendanceResponse = {
  ok: true;
  student: StudentSearchItem;
  range: { from: string; to: string };
  summary: { total: number; present: number; absent: number; late: number; excused: number };
  records: {
    items: Array<{ attendance_date: string; status: AttendanceStatus; note: string | null }>;
    totalCount: number;
    page: number;
    pageSize: number;
  };
};

function localIsoDate(date: Date) {
  const shift = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - shift).toISOString().slice(0, 10);
}

function statusLabel(locale: "ar" | "en", status: AttendanceStatus) {
  const labels = {
    ar: { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" },
    en: { present: "Present", absent: "Absent", late: "Late", excused: "Excused" },
  } as const;
  return labels[locale][status];
}

function normalizeQuery(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildPrintHtml(input: {
  locale: "ar" | "en";
  branding: { schoolName: string; logoUrl: string | null };
  student: StudentSearchItem;
  range: { from: string; to: string };
  summary: StudentAttendanceResponse["summary"];
  records: StudentAttendanceResponse["records"]["items"];
}) {
  const dir = input.locale === "ar" ? "rtl" : "ltr";
  const title = input.locale === "ar" ? "سجل حضور الطالب" : "Student Attendance Record";
  const summaryLabels =
    input.locale === "ar"
      ? { total: "الإجمالي", present: "حضور", absent: "غياب", late: "تأخر", excused: "بعذر" }
      : { total: "Total", present: "Present", absent: "Absent", late: "Late", excused: "Excused" };
  const tableLabels =
    input.locale === "ar"
      ? { date: "التاريخ", status: "الحالة", note: "ملاحظة" }
      : { date: "Date", status: "Status", note: "Note" };

  const safe = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const rows = input.records
    .map((row) => {
      return `
        <tr>
          <td>${safe(row.attendance_date)}</td>
          <td>${safe(statusLabel(input.locale, row.status))}</td>
          <td>${safe(row.note ?? "")}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
  <html lang="${input.locale}" dir="${dir}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safe(title)}</title>
      <style>
        @font-face {
          font-family: "Noto Sans Arabic";
          src: url("/fonts/noto-sans-arabic/NotoSansArabic-Variable.ttf") format("truetype");
          font-style: normal;
          font-weight: 100 900;
          font-display: swap;
        }
        :root { color-scheme: light; }
        body {
          font-family: "Noto Sans Arabic", system-ui, -apple-system, Segoe UI, sans-serif;
          font-optical-sizing: auto;
          font-variation-settings: "wdth" 100;
          margin: 24px;
          color: #0f172a;
        }
        .header {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(15,23,42,0.10);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .brand {
          display: flex;
          gap: 12px;
          align-items: center;
          min-width: 0;
        }
        .logo {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(15,23,42,0.12);
          object-fit: contain;
          background: #fff;
          padding: 6px;
        }
        .brand h1 { margin: 0; font-size: 16px; font-weight: 800; }
        .brand p { margin: 0; font-size: 12px; color: #475569; font-weight: 700; }
        .meta { text-align: end; font-size: 12px; color: #475569; font-weight: 700; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .card {
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 16px;
          padding: 12px 14px;
          background: #fff;
        }
        .card .k { font-size: 11px; color: #64748b; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .card .v { font-size: 14px; font-weight: 800; margin-top: 4px; }
        .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }
        .pill {
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          background: rgba(79,140,255,0.06);
        }
        table { width: 100%; border-collapse: collapse; border: 1px solid rgba(15,23,42,0.10); border-radius: 14px; overflow: hidden; }
        thead th {
          background: rgba(15,23,42,0.04);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .10em;
          color: #64748b;
          padding: 10px 12px;
          text-align: start;
          font-weight: 900;
        }
        tbody td { padding: 10px 12px; border-top: 1px solid rgba(15,23,42,0.08); font-size: 12px; vertical-align: top; }
        tbody tr:nth-child(even) td { background: rgba(15,23,42,0.02); }
        @media print {
          body { margin: 0; }
          .header { break-after: avoid; }
          table { break-inside: auto; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          ${
            input.branding.logoUrl
              ? `<img class="logo" src="${safe(input.branding.logoUrl)}" alt="${safe(input.branding.schoolName)}" />`
              : `<div class="logo" aria-hidden="true"></div>`
          }
          <div>
            <h1>${safe(input.branding.schoolName)}</h1>
            <p>${safe(title)}</p>
          </div>
        </div>
        <div class="meta">
          <div>${safe(input.student.full_name)}</div>
          <div>${safe(input.student.class_name)}${input.student.section ? ` · ${safe(input.student.section)}` : ""}</div>
          <div>${safe(input.range.from)} → ${safe(input.range.to)}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card"><div class="k">${safe(input.locale === "ar" ? "الطالب" : "Student")}</div><div class="v">${safe(input.student.full_name)}</div></div>
        <div class="card"><div class="k">${safe(input.locale === "ar" ? "الصف/الشعبة" : "Class/Section")}</div><div class="v">${safe(input.student.class_name)}${input.student.section ? ` · ${safe(input.student.section)}` : ""}</div></div>
      </div>

      <div class="summary">
        <div class="pill">${safe(summaryLabels.total)}: ${safe(input.summary.total)}</div>
        <div class="pill">${safe(summaryLabels.present)}: ${safe(input.summary.present)}</div>
        <div class="pill">${safe(summaryLabels.absent)}: ${safe(input.summary.absent)}</div>
        <div class="pill">${safe(summaryLabels.late)}: ${safe(input.summary.late)}</div>
        <div class="pill">${safe(summaryLabels.excused)}: ${safe(input.summary.excused)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${safe(tableLabels.date)}</th>
            <th>${safe(tableLabels.status)}</th>
            <th>${safe(tableLabels.note)}</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="3">${safe(input.locale === "ar" ? "لا توجد سجلات ضمن الفترة." : "No records in range.")}</td></tr>`}
        </tbody>
      </table>
    </body>
  </html>`;
}

export function StudentAttendanceInsight(props: {
  schoolId: string | null;
  className: string;
  section: string;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const branding = useRuntimeBranding();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StudentSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<StudentSearchItem | null>(null);
  const [rangeFrom, setRangeFrom] = useState(() => {
    const today = new Date();
    const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return localIsoDate(from);
  });
  const [rangeTo, setRangeTo] = useState(() => localIsoDate(new Date()));
  const [status, setStatus] = useState<AttendanceStatusFilter>("all");
  const [details, setDetails] = useState<StudentAttendanceResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [exportingClass, setExportingClass] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const resolvedSchoolId = props.schoolId;

  const sectionLabel = locale === "ar" ? "الشعبة" : "Section";
  const classLabel = locale === "ar" ? "الصف" : "Class";

  const labels = useMemo(() => {
    return locale === "ar"
      ? {
          title: "تحليل سجل الطالب",
          hint: "ابحث بالاسم أو جزء منه. عند اختيار الطالب ستظهر الإحصائيات والتواريخ مع خيارات الطباعة والتصدير.",
          search: "بحث عن طالب",
          placeholder: "اسم الطالب...",
          noResults: "لا توجد نتائج مطابقة.",
          dateRange: "الفترة الزمنية",
          from: "من",
          to: "إلى",
          status: "الحالة",
          all: "الكل",
          exportStudent: "تصدير CSV",
          print: "طباعة",
          close: "إغلاق",
          exportClass: "تصدير غيابات الصف (CSV)",
          exportClassHint: "يشمل الغياب والتأخر ضمن الفترة المحددة.",
          total: "الإجمالي",
          present: "حضور",
          absent: "غياب",
          late: "تأخر",
          excused: "بعذر",
          records: "السجل التفصيلي",
          note: "ملاحظة",
          date: "التاريخ",
          emptyDetails: "اختر طالبًا لعرض السجل.",
        }
      : {
          title: "Student Attendance Insights",
          hint: "Search by student name. Selecting a student shows summary counts, detailed dates, plus print/export actions.",
          search: "Student search",
          placeholder: "Student name...",
          noResults: "No matching results.",
          dateRange: "Date range",
          from: "From",
          to: "To",
          status: "Status",
          all: "All",
          exportStudent: "Export CSV",
          print: "Print",
          close: "Close",
          exportClass: "Export class absences (CSV)",
          exportClassHint: "Includes absent and late statuses within the selected range.",
          total: "Total",
          present: "Present",
          absent: "Absent",
          late: "Late",
          excused: "Excused",
          records: "Detailed records",
          note: "Note",
          date: "Date",
          emptyDetails: "Select a student to view the record.",
        };
  }, [locale]);

  const statusPills = useMemo(() => {
    const base =
      "px-3 py-2 rounded-full text-xs font-black border transition-all whitespace-nowrap tabular-nums";
    const active = "bg-[var(--primary)] text-white border-transparent shadow-[var(--shadow-primary)]";
    const inactive =
      "bg-[var(--surface-strong)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]";

    const options: Array<{ key: AttendanceStatusFilter; label: string }> = [
      { key: "all", label: labels.all },
      { key: "present", label: statusLabel(locale, "present") },
      { key: "absent", label: statusLabel(locale, "absent") },
      { key: "late", label: statusLabel(locale, "late") },
      { key: "excused", label: statusLabel(locale, "excused") },
    ];

    return { base, active, inactive, options };
  }, [labels.all, locale]);

  useEffect(() => {
    if (!resolvedSchoolId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = normalizeQuery(query);
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const url = new URL("/api/web/attendance/student-search", window.location.origin);
        url.searchParams.set("schoolId", resolvedSchoolId);
        url.searchParams.set("q", q);
        const response = await fetch(url.toString(), { credentials: "include" });
        const payload = (await response.json().catch(() => null)) as { items?: StudentSearchItem[] } | null;
        setItems(Array.isArray(payload?.items) ? payload!.items : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, resolvedSchoolId]);

  async function openStudent(student: StudentSearchItem) {
    setSelected(student);
    setDetails(null);
    setDetailsError("");
    setOpen(true);
    await refreshDetails(student.id, rangeFrom, rangeTo, status);
  }

  async function refreshDetails(studentId: string, from: string, to: string, nextStatus: AttendanceStatusFilter) {
    if (!resolvedSchoolId) return;
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const url = new URL(`/api/web/attendance/students/${encodeURIComponent(studentId)}`, window.location.origin);
      url.searchParams.set("schoolId", resolvedSchoolId);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      url.searchParams.set("status", nextStatus);
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "200");
      const response = await fetch(url.toString(), { credentials: "include" });
      const payload = (await response.json().catch(() => null)) as StudentAttendanceResponse | { error?: { message?: string } } | null;
      if (!payload || !("ok" in payload) || !(payload as StudentAttendanceResponse).ok) {
        setDetails(null);
        setDetailsError(payload && "error" in payload ? payload.error?.message ?? "Failed to load." : "Failed to load.");
        return;
      }
      setDetails(payload);
    } catch {
      setDetails(null);
      setDetailsError(locale === "ar" ? "تعذر تحميل السجل." : "Failed to load the record.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function exportStudentCsv() {
    if (!resolvedSchoolId || !selected) return;
    const url = new URL(`/api/web/attendance/students/${encodeURIComponent(selected.id)}/export`, window.location.origin);
    url.searchParams.set("schoolId", resolvedSchoolId);
    url.searchParams.set("from", rangeFrom);
    url.searchParams.set("to", rangeTo);
    url.searchParams.set("status", status);
    const response = await fetch(url.toString(), { credentials: "include" });
    const blob = await response.blob();
    const fileUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `attendance_${selected.full_name}_${rangeFrom}_to_${rangeTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(fileUrl);
  }

  async function printStudentRecord() {
    if (!details) return;
    const html = buildPrintHtml({
      locale,
      branding: {
        schoolName: branding.schoolName || (locale === "ar" ? "المدرسة الحالية" : "Current school"),
        logoUrl: branding.logoUrl ?? null,
      },
      student: details.student,
      range: details.range,
      summary: details.summary,
      records: details.records.items,
    });
    const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=720");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    
    // Trigger print from the parent context after it's fully loaded (approximate)
    // This complies with CSP better than injecting an inline script in a document.written page
    setTimeout(() => {
      try {
        w.print();
      } catch (e) {
        console.error("Print failed:", e);
      }
    }, 500);
  }

  async function exportClassAbsences() {
    if (!resolvedSchoolId || !props.className) return;
    setExportingClass(true);
    try {
      const url = new URL(`/api/web/attendance/export-absences`, window.location.origin);
      url.searchParams.set("schoolId", resolvedSchoolId);
      url.searchParams.set("className", props.className);
      if (props.section) url.searchParams.set("section", props.section);
      url.searchParams.set("from", rangeFrom);
      url.searchParams.set("to", rangeTo);
      const response = await fetch(url.toString(), { credentials: "include" });
      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `class_absences_${props.className}${props.section ? `_${props.section}` : ""}_${rangeFrom}_to_${rangeTo}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } finally {
      setExportingClass(false);
    }
  }

  return (
    <section
      data-testid="attendance-student-insights"
      className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-[var(--primary)]" />
              <h2 className="text-lg font-black text-[var(--text-primary)]">{labels.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                variant="ghost"
                size="sm"
                aria-label={labels.exportClass}
                onClick={exportClassAbsences}
                disabled={!resolvedSchoolId || !props.className || exportingClass}
                className={cn(
                  "border border-[var(--border)] bg-[var(--surface-soft)]",
                  (!props.className || exportingClass) && "opacity-60",
                )}
              >
                <Download className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-3xl">{labels.hint}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 items-end">
          <div className="lg:col-span-5">
            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
              {labels.search}
            </label>
            <div className="relative mt-1.5">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                data-testid="attendance-student-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.placeholder}
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] ps-10 pe-4 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
              />
              {loading && (
                <div className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              )}
            </div>

            {items.length > 0 && (
              <div
                data-testid="attendance-student-search-results"
                className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-sm)] overflow-hidden"
              >
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openStudent(item)}
                      data-testid="attendance-student-search-result"
                      className="w-full text-start px-4 py-3 hover:bg-[var(--surface-muted)] transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-sm text-[var(--text-primary)] truncate">{item.full_name}</div>
                        <div className="text-xs font-bold text-[var(--text-muted)] truncate">
                          {item.class_name}
                          {item.section ? ` · ${sectionLabel}: ${item.section}` : ""}
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {item.id.slice(0, 8)}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && normalizeQuery(query).length >= 2 && items.length === 0 && (
              <div className="mt-2 text-xs font-bold text-[var(--text-muted)]">{labels.noResults}</div>
            )}
          </div>

          <div className="lg:col-span-7 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                {labels.from}
              </label>
              <div className="relative mt-1.5">
                <CalendarDays size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] ps-10 pe-4 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                {labels.to}
              </label>
              <div className="relative mt-1.5">
                <CalendarDays size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] ps-10 pe-4 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                {labels.status}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {statusPills.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={cn(statusPills.base, option.key === status ? statusPills.active : statusPills.inactive)}
                    onClick={() => {
                      setStatus(option.key);
                      if (selected) void refreshDetails(selected.id, rangeFrom, rangeTo, option.key);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-xs font-bold text-[var(--text-muted)]">
                {labels.exportClassHint} {classLabel}: <span className="text-[var(--text-primary)]">{props.className || "—"}</span>
                {props.section ? (
                  <>
                    {" "}
                    {sectionLabel}: <span className="text-[var(--text-primary)]">{props.section}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="xl">
        <div data-testid="attendance-student-insights-modal" className="hidden" />
        <ModalHeader
          title={labels.title}
          description={selected ? `${selected.full_name} • ${selected.class_name}${selected.section ? ` • ${selected.section}` : ""}` : labels.emptyDetails}
          onClose={() => setOpen(false)}
        />

        <ModalBody className="space-y-4">
          {detailsError && (
            <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold">
              {detailsError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-5">
            <Card className="p-4 sm:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                {locale === "ar" ? "الطالب" : "Student"}
              </div>
              <div className="mt-1 text-base font-black text-[var(--text-primary)]">{details?.student.full_name ?? selected?.full_name ?? "—"}</div>
              <div className="mt-1 text-xs font-bold text-[var(--text-muted)]">
                {details?.student.class_name ?? selected?.class_name ?? "—"}
                {details?.student.section ? ` · ${details.student.section}` : selected?.section ? ` · ${selected.section}` : ""}
              </div>
            </Card>
            <Card className="p-4 sm:col-span-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    {labels.dateRange}
                  </div>
                  <div className="mt-1 text-sm font-black text-[var(--text-primary)] tabular-nums">
                    {details ? `${details.range.from} → ${details.range.to}` : `${rangeFrom} → ${rangeTo}`}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (selected) void refreshDetails(selected.id, rangeFrom, rangeTo, status);
                  }}
                  disabled={!selected || detailsLoading}
                >
                  {locale === "ar" ? "تحديث" : "Refresh"}
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            <Card className="p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{labels.total}</div>
              <div className="mt-1 text-lg font-black text-[var(--text-primary)] tabular-nums">
                {details ? formatNumber(details.summary.total) : "—"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{labels.present}</div>
              <div className="mt-1 text-lg font-black text-[var(--success)] tabular-nums">{details ? formatNumber(details.summary.present) : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{labels.absent}</div>
              <div className="mt-1 text-lg font-black text-[var(--danger)] tabular-nums">{details ? formatNumber(details.summary.absent) : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{labels.late}</div>
              <div className="mt-1 text-lg font-black text-[var(--warning)] tabular-nums">{details ? formatNumber(details.summary.late) : "—"}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{labels.excused}</div>
              <div className="mt-1 text-lg font-black text-[var(--info)] tabular-nums">{details ? formatNumber(details.summary.excused) : "—"}</div>
            </Card>
          </div>

          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--surface-muted)] border-b border-[var(--border)]">
              <div className="text-sm font-black text-[var(--text-primary)]">{labels.records}</div>
              {detailsLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-[var(--surface-strong)]">
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{labels.date}</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{labels.status}</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{labels.note}</th>
                  </tr>
                </thead>
                <tbody>
                  {(details?.records.items ?? []).map((row) => (
                    <tr key={`${row.attendance_date}-${row.status}-${row.note ?? ""}`} className="border-t border-[var(--border)]">
                      <td className="p-3 text-xs font-bold text-[var(--text-primary)] tabular-nums">{row.attendance_date}</td>
                      <td className="p-3 text-xs font-black">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 border",
                            row.status === "present" && "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
                            row.status === "absent" && "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
                            row.status === "late" && "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
                            row.status === "excused" && "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20",
                          )}
                        >
                          {statusLabel(locale, row.status)}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-bold text-[var(--text-secondary)]">{row.note || "—"}</td>
                    </tr>
                  ))}

                  {!detailsLoading && (details?.records.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-sm font-bold text-[var(--text-muted)]">
                        {locale === "ar" ? "لا توجد سجلات ضمن الفترة المحددة." : "No records in the selected range."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
            {labels.close}
          </Button>
          <Button variant="outline" onClick={() => void exportStudentCsv()} disabled={!selected}>
            <Download className="h-4 w-4" />
            {labels.exportStudent}
          </Button>
          <Button variant="primary" onClick={() => void printStudentRecord()} disabled={!details}>
            <Printer className="h-4 w-4" />
            {labels.print}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}
