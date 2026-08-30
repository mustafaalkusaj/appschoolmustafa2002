"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";
import { Download, Printer, Search, Loader2 } from "lucide-react";

interface StudentAccount {
  fullName: string;
  className: string;
  username: string;
  password: string;
}

function StudentAccountsContent() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const schoolId = schoolScope.selectedSchoolId;

  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/student-accounts?schoolId=${schoolId}`,
      );
      const data = await res.json();
      if (!data.ok) {
        const msg = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(msg ?? "فشل في تحميل البيانات");
      }
      setStudents(data.students ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q),
    );
  }, [students, search]);

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const handleExcelDownload = useCallback(() => {
    const header = "الاسم الكامل\tالصف\tاسم المستخدم\tكلمة المرور";
    const rows = filtered.map(
      (s) => `${s.fullName}\t${s.className ?? ""}\t${s.username}\t${s.password}`,
    );
    const content = "﻿" + [header, ...rows].join("\n");
    const blob = new Blob([content], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-accounts-${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const rows = filtered
      .map(
        (s, i) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
            <td style="padding:8px;border:1px solid #ddd">${s.fullName}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center">${s.className ?? ""}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;direction:ltr">${s.username}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;direction:ltr">${s.password || "—"}</td>
          </tr>`,
      )
      .join("");

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>حسابات الطلبة</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; direction: rtl; }
    h1 { text-align: center; margin-bottom: 20px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px; border: 1px solid #333; background: #f0f0f0; font-weight: bold; }
    td { font-size: 14px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>حسابات الطلبة</h1>
  <p style="text-align:center;color:#666">عدد الطلبة: ${filtered.length} | تاريخ الطباعة: ${new Date().toLocaleDateString("ar-IQ")}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الاسم الكامل</th>
        <th>الصف</th>
        <th>اسم المستخدم</th>
        <th>كلمة المرور</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="mr-3 text-gray-600">جاري تحميل حسابات الطلبة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 text-lg">{error}</p>
        <button
          onClick={fetchStudents}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            حسابات الطلبة
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إجمالي الطلبة: {students.length} | الصفوف: {classes.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExcelDownload}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            تحميل Excel
          </button>
          <button
            onClick={handlePrint}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="بحث بالاسم أو الصف أو اسم المستخدم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-96 pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {students.length === 0
            ? "لا توجد حسابات طلبة"
            : "لا توجد نتائج تطابق البحث"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-12">
                  #
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  الاسم الكامل
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  الصف
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  اسم المستخدم
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  كلمة المرور
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((s, i) => (
                <tr
                  key={`${s.username}-${i}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 text-gray-500 text-center">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {s.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {s.className ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs" dir="ltr">
                    {s.username}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {s.password ? (
                      <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                        {s.password}
                      </span>
                    ) : (
                      <span className="text-gray-400">غير متوفرة</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.some((s) => !s.password) && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          بعض الطلبة لا تتوفر لديهم كلمة مرور محفوظة. يمكن إعادة تعيين كلمة المرور من صفحة إدارة الطلبة.
        </div>
      )}
    </div>
  );
}

export default function StudentAccountsPage() {
  return (
    <ProtectedRoute roles={["admin", "super_admin"]}>
      <StudentAccountsContent />
    </ProtectedRoute>
  );
}
