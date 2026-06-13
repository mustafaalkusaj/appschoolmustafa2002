"use client";
import { useEffect, useRef, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  teacher_id: string;
  teacher_name: string;
  subject: string | null;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

interface Props {
  teacherId: string;
  schoolId: string | null;
  locale: "ar" | "en";
}

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-green-100 text-green-800 border-green-200",
  absent:   "bg-red-100 text-red-700 border-red-200",
  late:     "bg-amber-100 text-amber-800 border-amber-200",
  excused:  "bg-blue-100 text-blue-800 border-blue-200",
  holiday:  "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  present: { ar: "حاضر",  en: "Present" },
  absent:  { ar: "غائب",  en: "Absent"  },
  late:    { ar: "متأخر", en: "Late"    },
  excused: { ar: "إذن",   en: "Excused" },
  holiday: { ar: "إجازة", en: "Holiday" },
};

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MAX_MONTHS_BACK = 6;

function getMonthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${year}-${pad(month + 1)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
  return { startDate, endDate };
}

export function AttendanceTab({ teacherId, schoolId, locale }: Props) {
  const isEn = locale === "en";
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchedKey = useRef("");

  const monthLabel = isEn ? ENGLISH_MONTHS[month] : ARABIC_MONTHS[month];

  // Earliest allowed month: MAX_MONTHS_BACK months ago
  const minDate = new Date(now.getFullYear(), now.getMonth() - MAX_MONTHS_BACK, 1);
  const isAtMin = year < minDate.getFullYear() || (year === minDate.getFullYear() && month <= minDate.getMonth());
  const isAtMax = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const fetchRecords = async (y: number, m: number) => {
    if (!schoolId) return;
    const key = `${y}-${m}`;
    if (fetchedKey.current === key) return;
    fetchedKey.current = key;

    setLoading(true);
    setError("");
    try {
      const { startDate, endDate } = getMonthBounds(y, m);
      const url =
        `/api/web/teacher-attendance/log` +
        `?schoolId=${encodeURIComponent(schoolId)}` +
        `&teacherId=${encodeURIComponent(teacherId)}` +
        `&startDate=${startDate}` +
        `&endDate=${endDate}`;

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        records: AttendanceRecord[];
      }>(url);

      if (response.ok && payload?.ok) {
        setRecords(payload.records ?? []);
      } else {
        setError(isEn ? "Failed to load attendance records." : "تعذر تحميل سجل الحضور.");
      }
    } catch {
      setError(isEn ? "Error loading records." : "خطأ في تحميل السجلات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchedKey.current = ""; // reset so re-fetch happens on month change
    void fetchRecords(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const handlePrev = () => {
    if (isAtMin) return;
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (isAtMax) return;
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Stats
  const stats = {
    present: records.filter((r) => r.status === "present").length,
    absent:  records.filter((r) => r.status === "absent").length,
    late:    records.filter((r) => r.status === "late").length,
    excused: records.filter((r) => r.status === "excused").length,
  };

  const formatTime = (t: string | null) => {
    if (!t) return null;
    // strip seconds if present (HH:MM:SS -> HH:MM)
    return t.length > 5 ? t.slice(0, 5) : t;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Month Navigator */}
      <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isAtMin}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={isEn ? "Previous month" : "الشهر السابق"}
          >
            {isEn ? "‹" : "›"}
          </button>

          <div className="text-center">
            <span className="font-semibold text-[var(--text-primary)]">
              {monthLabel} {year}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={isAtMax}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label={isEn ? "Next month" : "الشهر التالي"}
          >
            {isEn ? "›" : "‹"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--card-bg)] rounded-xl border border-green-200 p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-green-600">{stats.present}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {isEn ? "Present" : "حاضر"}
          </span>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-red-200 p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-red-600">{stats.absent}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {isEn ? "Absent" : "غائب"}
          </span>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-amber-200 p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-amber-600">{stats.late}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {isEn ? "Late" : "متأخر"}
          </span>
        </div>
        <div className="bg-[var(--card-bg)] rounded-xl border border-blue-200 p-3 flex flex-col items-center gap-1">
          <span className="text-2xl font-bold text-blue-600">{stats.excused}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {isEn ? "Excused" : "إذن"}
          </span>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">
              {isEn ? "Loading attendance..." : "جاري تحميل الحضور..."}
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-6 flex flex-col items-center gap-2">
          <p className="text-[var(--danger)] text-sm">{error}</p>
          <button
            type="button"
            onClick={() => { fetchedKey.current = ""; void fetchRecords(year, month); }}
            className="text-xs text-[var(--primary)] underline"
          >
            {isEn ? "Retry" : "إعادة المحاولة"}
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm p-8 flex flex-col items-center gap-3">
          <p className="text-[var(--text-muted)] text-sm">
            {isEn
              ? "No attendance records for this month."
              : "لا توجد سجلات حضور لهذا الشهر."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((record) => {
            const statusColor = STATUS_COLORS[record.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
            const statusLabel = STATUS_LABELS[record.status]
              ? (isEn ? STATUS_LABELS[record.status].en : STATUS_LABELS[record.status].ar)
              : record.status;
            const checkIn = formatTime(record.check_in_time);
            const checkOut = formatTime(record.check_out_time);

            return (
              <div
                key={record.id}
                className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">
                      {new Date(record.attendance_date + "T00:00:00").toLocaleDateString(
                        isEn ? "en-GB" : "ar-IQ-u-nu-latn",
                        { weekday: "short", year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {(checkIn || checkOut) && (
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      {checkIn && (
                        <span>
                          {isEn ? "In:" : "دخول:"} <span className="font-medium text-[var(--text-primary)]">{checkIn}</span>
                        </span>
                      )}
                      {checkOut && (
                        <span>
                          {isEn ? "Out:" : "خروج:"} <span className="font-medium text-[var(--text-primary)]">{checkOut}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {record.notes && (
                    <div className="text-xs text-[var(--text-muted)] mt-1">{record.notes}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
