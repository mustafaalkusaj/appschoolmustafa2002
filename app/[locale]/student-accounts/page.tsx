"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";
import { Download, Printer, Search, Loader2, QrCode } from "lucide-react";

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
  const [filterClass, setFilterClass] = useState("");

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

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    let list = students;
    if (filterClass) {
      list = list.filter((s) => s.className === filterClass);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.className?.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q),
      );
    }
    return list;
  }, [students, search, filterClass]);

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

  const handlePrintCards = useCallback(async () => {
    if (filtered.length === 0) return;

    const QRCodeLib = (await import("qrcode")).default;

    const qrMap: Record<string, string> = {};
    await Promise.all(
      filtered.map(async (s) => {
        const key = s.username;
        if (!key) return;
        try {
          const payload = JSON.stringify({ username: s.username, password: s.password });
          qrMap[key] = await QRCodeLib.toDataURL(payload, {
            width: 120,
            margin: 1,
            color: { dark: "#1e1b4b", light: "#ffffff" },
          });
        } catch { /* skip */ }
      }),
    );

    const cardHtml = (s: StudentAccount, idx: number) => {
      const qrSrc = qrMap[s.username] ?? "";
      const initials = s.fullName
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

      return `
        <div class="card">
          <div class="wm">حساب طالب</div>
          <div class="hdr">
            <div class="hdr-num">${idx + 1}</div>
            <div class="hdr-text">
              <div class="card-label">بطاقة حساب طالب</div>
            </div>
          </div>
          <div class="avatar-wrap">
            <div class="avatar-ini">${initials}</div>
          </div>
          <div class="body">
            <div class="info">
              <div class="name">${s.fullName}</div>
              <div class="class-badge">${s.className ?? ""}</div>
            </div>
            ${qrSrc ? `<div class="qr-wrap"><img class="qr" src="${qrSrc}" alt="QR"/><div class="qr-label">مسح للدخول</div></div>` : ""}
          </div>
          <div class="creds">
            <div class="cred"><div class="cl">اسم المستخدم</div><div class="cv">${s.username}</div></div>
            <div class="cred"><div class="cl" style="color:#7c3aed">كلمة المرور</div><div class="cv">${s.password || "—"}</div></div>
          </div>
        </div>`;
    };

    const pairs: StudentAccount[][] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      pairs.push(filtered.slice(i, i + 2));
    }

    const cardFont = "'Noto Sans Arabic','Segoe UI',system-ui,sans-serif";

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>بطاقات حسابات الطلبة</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${cardFont};background:#f1f5f9;direction:rtl}
  .page{display:flex;flex-direction:row;gap:8mm;padding:12mm;page-break-after:always;break-after:page;justify-content:center;align-items:center;min-height:calc(100vh - 24mm)}
  .page:last-child{page-break-after:auto;break-after:auto}
  .card{width:130mm;height:100mm;background:#fff;border:1px solid #c7d2fe;border-radius:14px;font-family:${cardFont};direction:rtl;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden;position:relative;box-shadow:0 4px 24px rgba(99,102,241,0.10);flex-shrink:0}
  .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;font-size:40px;font-weight:900;color:#6366f1;opacity:0.04;transform:rotate(-25deg);white-space:nowrap;user-select:none;letter-spacing:4px}
  .hdr{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#9333ea 100%);padding:10px 14px 22px;display:flex;align-items:center;gap:10px;position:relative;z-index:1;flex-shrink:0}
  .hdr-num{width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;flex-shrink:0}
  .hdr-text{flex:1;min-width:0}
  .card-label{font-size:11px;font-weight:800;color:#fff;opacity:0.95}
  .avatar-wrap{position:relative;z-index:2;margin-top:-18px;display:flex;justify-content:center;flex-shrink:0}
  .avatar-ini{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#4f46e5 0%,#9333ea 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:900;border:3px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.25)}
  .body{flex:1;display:flex;gap:8px;padding:4px 12px 6px;position:relative;z-index:1;min-height:0}
  .info{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px}
  .name{font-size:13px;font-weight:900;color:#1e1b4b;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  .class-badge{display:inline-block;font-size:9px;font-weight:700;color:#6366f1;background:#ede9fe;border-radius:4px;padding:2px 8px}
  .qr-wrap{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px}
  .qr{width:60px;height:60px;border:2px solid #e0e7ff;border-radius:8px;display:block}
  .qr-label{font-size:6px;color:#94a3b8;font-weight:600;letter-spacing:0.3px}
  .creds{background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-top:1px solid #e0e7ff;padding:6px 12px;display:grid;grid-template-columns:1fr 1fr;gap:5px;flex-shrink:0;position:relative;z-index:1}
  .cred{background:#fff;border:1px solid #e0e7ff;border-radius:6px;padding:3px 7px}
  .cl{font-size:7px;font-weight:800;color:#6366f1;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px}
  .cv{font-size:10px;font-weight:700;color:#1e1b4b;font-family:'Courier New',monospace;direction:ltr;text-align:start;letter-spacing:0.5px}
  @media print{body{background:#fff}.card{box-shadow:none}}
  @page{size:A4 landscape;margin:0}
</style>
</head>
<body>
${pairs.map((pair) => `<div class="page">${pair.map((s) => cardHtml(s, filtered.indexOf(s))).join("")}</div>`).join("\n")}
<script>window.addEventListener("load",function(){window.print();})<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, [filtered]);

  const handlePrintTable = useCallback(() => {
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <span className="mr-3 text-[var(--text-muted)]">جاري تحميل حسابات الطلبة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-[var(--danger)] text-lg">{error}</p>
        <button
          onClick={fetchStudents}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            حسابات الطلبة
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            إجمالي الحسابات: {students.length} | الصفوف: {classes.length}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExcelDownload}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            تحميل Excel
          </button>
          <button
            onClick={handlePrintTable}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-soft)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            طباعة جدول
          </button>
          <button
            onClick={handlePrintCards}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-opacity"
          >
            <QrCode className="h-4 w-4" />
            طباعة بطاقات QR
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الصف أو اسم المستخدم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--card-bg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--card-bg)] text-[var(--text-primary)] min-w-[160px]"
        >
          <option value="">جميع الصفوف</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      {(search || filterClass) && (
        <p className="text-xs text-[var(--text-muted)] mb-3">
          عرض {filtered.length} من {students.length} طالب
        </p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          {students.length === 0
            ? "لا توجد حسابات طلبة نشطة"
            : "لا توجد نتائج تطابق البحث"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)] w-12">#</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">الاسم الكامل</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">الصف</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">اسم المستخدم</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--text-secondary)]">كلمة المرور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((s, i) => (
                <tr
                  key={`${s.username}-${i}`}
                  className="hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--text-muted)] text-center">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.fullName}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{s.className ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs" dir="ltr">{s.username}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {s.password ? (
                      <span className="bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)] px-2 py-1 rounded">
                        {s.password}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">غير متوفرة</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.some((s) => !s.password) && (
        <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] border border-[color-mix(in_srgb,var(--warning)_20%,transparent)] rounded-lg text-sm text-[var(--warning)]">
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
