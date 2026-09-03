"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Printer, Loader2, Filter } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { printHtmlDocument, wrapPrintDocument } from "@/lib/print/branding";

interface AttendanceRow {
  class_name: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

interface GradeRow {
  class_name: string;
  subject: string;
  avg_score: number;
  max_score: number;
  students_count: number;
}

export default function TeacherReportsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const res = await fetchJsonWithAuthorizedSession(
        `/api/teacher/reports?${params.toString()}`,
      );
      if (res.response.ok) {
        const d = (res.payload as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        setAttendance((d?.attendance_summary as AttendanceRow[]) ?? []);
        setGrades((d?.grades_summary as GradeRow[]) ?? []);
        const cn = (d?.class_names as string[]) ?? [];
        setClassNames(cn);
        if (!selectedClass && cn.length > 0) setSelectedClass(cn[0]);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredAttendance = selectedClass
    ? attendance.filter((r) => r.class_name === selectedClass)
    : attendance;

  const filteredGrades = selectedClass
    ? grades.filter((r) => r.class_name === selectedClass)
    : grades;

  const totalStudentsAttendance = filteredAttendance.reduce((s, r) => s + r.total, 0);
  const totalPresent = filteredAttendance.reduce((s, r) => s + r.present, 0);
  const totalAbsent = filteredAttendance.reduce((s, r) => s + r.absent, 0);
  const overallRate =
    totalStudentsAttendance > 0
      ? Math.round(
          ((totalPresent + filteredAttendance.reduce((s, r) => s + r.late, 0)) /
            totalStudentsAttendance) *
            100,
        )
      : 0;

  const handlePrint = () => {
    const rows = filteredAttendance
      .map(
        (r) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd">${r.class_name}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.total}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;color:green">${r.present}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;color:red">${r.absent}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;color:orange">${r.late}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.excused}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold">${r.rate}%</td>
          </tr>`,
      )
      .join("");

    const gradeRows = filteredGrades
      .map(
        (r) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd">${r.class_name}</td>
            <td style="padding:8px;border:1px solid #ddd">${r.subject}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.avg_score}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.max_score}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${r.students_count}</td>
          </tr>`,
      )
      .join("");

    const content = `
      <h2 style="margin-bottom:16px">${t("تقرير الحضور", "Attendance Report")}</h2>
      <p style="margin-bottom:8px">${t("من", "From")}: ${dateFrom} — ${t("إلى", "To")}: ${dateTo}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:${isAr ? "right" : "left"}">${t("الصف", "Class")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("المجموع", "Total")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("حاضر", "Present")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("غائب", "Absent")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("متأخر", "Late")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("إجازة", "Excused")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("النسبة", "Rate")}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <h2 style="margin-bottom:16px">${t("تقرير الدرجات", "Grades Report")}</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;border:1px solid #ddd;text-align:${isAr ? "right" : "left"}">${t("الصف", "Class")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:${isAr ? "right" : "left"}">${t("المادة", "Subject")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("المعدل", "Average")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("الدرجة القصوى", "Max Score")}</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center">${t("عدد الطلاب", "Students")}</th>
          </tr>
        </thead>
        <tbody>${gradeRows}</tbody>
      </table>
    `;

    const html = wrapPrintDocument({
      title: t("تقارير المعلم", "Teacher Reports"),
      bodyHtml: content,
    });
    printHtmlDocument(html);
  };

  return (
    <TeacherShell
      currentPath="/teacher/reports"
      titleAr="التقارير"
      titleEn="Reports"
      subtitleAr="تقارير الحضور والدرجات"
      subtitleEn="Attendance & grades reports"
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium mb-1">
                <Filter className="inline-block w-4 h-4 me-1" />
                {t("الصف", "Class")}
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("جميع الصفوف", "All classes")}</option>
                {classNames.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[140px]">
              <label className="block text-sm font-medium mb-1">
                {t("من", "From")}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="min-w-[140px]">
              <label className="block text-sm font-medium mb-1">
                {t("إلى", "To")}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={handlePrint}
              disabled={loading || (filteredAttendance.length === 0 && filteredGrades.length === 0)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {t("طباعة", "Print")}
            </button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAttendance.length === 0 && filteredGrades.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-12 h-12 text-muted-foreground" />}
          title={t("لا توجد بيانات", "No data")}
          description={t(
            "لا توجد بيانات حضور أو درجات للفترة المحددة",
            "No attendance or grades data for the selected period",
          )}
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{totalStudentsAttendance}</div>
                <div className="text-sm text-muted-foreground">
                  {t("إجمالي السجلات", "Total Records")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">{totalPresent}</div>
                <div className="text-sm text-muted-foreground">
                  {t("حاضر", "Present")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-red-600">{totalAbsent}</div>
                <div className="text-sm text-muted-foreground">
                  {t("غائب", "Absent")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{overallRate}%</div>
                <div className="text-sm text-muted-foreground">
                  {t("نسبة الحضور", "Attendance Rate")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance table */}
          {filteredAttendance.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{t("تقرير الحضور", "Attendance Report")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-start font-medium">
                          {t("الصف", "Class")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("المجموع", "Total")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-green-600">
                          {t("حاضر", "Present")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-red-600">
                          {t("غائب", "Absent")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-orange-600">
                          {t("متأخر", "Late")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("إجازة", "Excused")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("النسبة", "Rate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendance.map((r) => (
                        <tr key={r.class_name} className="border-b">
                          <td className="px-4 py-3 font-medium">{r.class_name}</td>
                          <td className="px-4 py-3 text-center">{r.total}</td>
                          <td className="px-4 py-3 text-center text-green-600">{r.present}</td>
                          <td className="px-4 py-3 text-center text-red-600">{r.absent}</td>
                          <td className="px-4 py-3 text-center text-orange-600">{r.late}</td>
                          <td className="px-4 py-3 text-center">{r.excused}</td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span
                              className={
                                r.rate >= 80
                                  ? "text-green-600"
                                  : r.rate >= 60
                                    ? "text-orange-600"
                                    : "text-red-600"
                              }
                            >
                              {r.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grades table */}
          {filteredGrades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("تقرير الدرجات", "Grades Report")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-start font-medium">
                          {t("الصف", "Class")}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t("المادة", "Subject")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("المعدل", "Average")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("الدرجة القصوى", "Max")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("عدد الطلاب", "Students")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrades.map((r, i) => (
                        <tr key={`${r.class_name}-${r.subject}-${i}`} className="border-b">
                          <td className="px-4 py-3 font-medium">{r.class_name}</td>
                          <td className="px-4 py-3">{r.subject}</td>
                          <td className="px-4 py-3 text-center font-bold">
                            <span
                              className={
                                r.max_score > 0 && r.avg_score / r.max_score >= 0.7
                                  ? "text-green-600"
                                  : r.max_score > 0 && r.avg_score / r.max_score >= 0.5
                                    ? "text-orange-600"
                                    : "text-red-600"
                              }
                            >
                              {r.avg_score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{r.max_score}</td>
                          <td className="px-4 py-3 text-center">{r.students_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </TeacherShell>
  );
}
