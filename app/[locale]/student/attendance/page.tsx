"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  subject_name: string | null;
  note: string | null;
}

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  present: { ar: "حاضر", en: "Present", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  absent: { ar: "غائب", en: "Absent", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  late: { ar: "متأخر", en: "Late", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  excused: { ar: "إجازة", en: "Excused", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
};

export default function StudentAttendancePage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/attendance")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setRecords(d?.records ?? []);
          setSummary(d?.summary ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell
      currentPath="/student/attendance"
      titleAr="حضوري"
      titleEn="My Attendance"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <MiniStat label={isAr ? "إجمالي الأيام" : "Total Days"} value={summary.total_days} />
                <MiniStat label={isAr ? "حضور" : "Present"} value={summary.present} />
                <MiniStat label={isAr ? "غياب" : "Absent"} value={summary.absent} />
                <MiniStat label={isAr ? "تأخر" : "Late"} value={summary.late} />
                <MiniStat label={isAr ? "نسبة الحضور" : "Rate"} value={`${summary.rate}%`} />
              </div>
            )}

            {records.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-muted-foreground">
                <p className="text-4xl mb-2">📋</p>
                <p>{isAr ? "لا توجد سجلات حضور" : "No attendance records"}</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "المادة" : "Subject"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "الحالة" : "Status"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "ملاحظة" : "Note"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {records.map((r) => {
                        const st = STATUS_LABELS[r.status] ?? STATUS_LABELS.present;
                        return (
                          <tr key={r.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">{r.date}</td>
                            <td className="px-4 py-3">{r.subject_name ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                {isAr ? st.ar : st.en}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{r.note ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{String(value)}</p>
    </div>
  );
}
