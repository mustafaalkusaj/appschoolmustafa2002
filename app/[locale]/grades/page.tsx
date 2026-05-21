"use client";

import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import * as XLSX from "xlsx";

import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { getLocaleFromPath } from "@/lib/locale-routing";

import { useGradesData } from "./_hooks/useGradesData";
import { GradesStats } from "./_components/GradesStats";
import { GradesFilters } from "./_components/GradesFilters";
import { GradesTable } from "./_components/GradesTable";
import { GradeEntryModal } from "./_components/GradeEntryModal";
import type { GradeEntryPayload } from "./_components/GradeEntryModal";
import { GradeDetailPanel } from "./_components/GradeDetailPanel";
import { TeacherSubmissionsPanel } from "./_components/TeacherSubmissionsPanel";
import { TeacherGradesTab } from "./_components/TeacherGradesTab";
import { EditGradeModal } from "./_components/EditGradeModal";
import type { EditGradePayload } from "./_components/EditGradeModal";
import { GradeTypeAddModal } from "./_components/GradeTypeAddModal";
import type { GradeFilters, GradeEntry, GradeType } from "./_types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getCurrentSemester(): 1 | 2 {
  const month = new Date().getMonth() + 1;
  return month >= 9 || month <= 1 ? 1 : 2;
}

const PAGE_SIZE = 50;

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GradesPage() {
  const pathname = usePathname();
  getLocaleFromPath(pathname); // side-effect: locale detection for future use

  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);

  const canEnterGrades = can("enter_grades");
  const canConfirmGrades = can("confirm_grades");
  const canLockGrades = can("lock_grades");
  const canExportGrades = can("export_grades");

  const schoolId = schoolScope.selectedSchoolId ?? "";

  // ── Filter state ─────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState<GradeFilters>({
    academicYear: getCurrentAcademicYear(),
    semester: getCurrentSemester(),
    classId: "",
    sectionId: "",
    subjectId: "",
    gradeTypeId: "",
    status: "",
    search: "",
  });

  const patchFilters = useCallback((patch: Partial<GradeFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  // ── UI state ─────────────────────────────────────────────────────────────────

  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<GradeEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingEntry, setEditingEntry] = useState<GradeEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [activeTab, setActiveTab] = useState<"grades" | "teachers">("grades");
  const [showGradeTypeModal, setShowGradeTypeModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [locking, setLocking] = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────────

  const { entries, loading, subjects, gradeTypes, classes, sections, stats, reload } = useGradesData({
    schoolId,
    filters,
  });

  // Local search filter
  const filteredEntries = useMemo(() => {
    if (!filters.search) return entries;
    const q = filters.search.toLowerCase();
    return entries.filter(
      (e) =>
        e.student_name?.toLowerCase().includes(q) ||
        e.subject_name?.toLowerCase().includes(q)
    );
  }, [entries, filters.search]);

  // Pagination
  const totalCount = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Selection handlers ────────────────────────────────────────────────────────

  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(pagedEntries.map((e) => e.id)) : new Set());
    },
    [pagedEntries]
  );

  // ── Row click ─────────────────────────────────────────────────────────────────

  const handleRowClick = useCallback((entry: GradeEntry) => {
    setSelectedEntry(entry);
    setShowDetail(true);
  }, []);

  // ── Confirm single ────────────────────────────────────────────────────────────

  const handleConfirmEntry = useCallback(
    async (id: string) => {
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
          `/api/web/grades/confirm`,
          {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify({ school_id: schoolId, entryIds: [id] }),
          }
        );
        if (payload?.ok) {
          showSuccess("تم تأكيد الدرجة بنجاح");
          reload();
          if (selectedEntry?.id === id) {
            setSelectedEntry((prev) => prev ? { ...prev, status: "confirmed" } : null);
          }
        } else {
          showError("تعذر تأكيد الدرجة");
        }
      } catch {
        showError("حدث خطأ أثناء تأكيد الدرجة");
      }
    },
    [schoolId, showSuccess, showError, reload, selectedEntry]
  );

  // ── Delete single ─────────────────────────────────────────────────────────────

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean }>(
          `/api/web/grades/${id}?schoolId=${schoolId}`,
          { method: "DELETE" }
        );
        if (payload?.ok) {
          showSuccess("تم حذف الدرجة بنجاح");
          setShowDetail(false);
          setSelectedEntry(null);
          reload();
        } else {
          showError("تعذر حذف الدرجة");
        }
      } catch {
        showError("حدث خطأ أثناء حذف الدرجة");
      }
    },
    [schoolId, showSuccess, showError, reload]
  );

  // ── Edit single ───────────────────────────────────────────────────────────────

  const handleOpenEdit = useCallback((entry: GradeEntry) => {
    setEditingEntry(entry);
    setEditError("");
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(
    async (entryId: string, data: EditGradePayload) => {
      setSavingEdit(true);
      setEditError("");
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; message?: string }>(
          `/api/web/grades/${entryId}`,
          {
            method: "PATCH",
            headers: withJsonHeaders(),
            body: JSON.stringify({ school_id: schoolId, ...data }),
          }
        );
        if (payload?.ok) {
          showSuccess("تم تعديل الدرجة بنجاح");
          setShowEditModal(false);
          setEditingEntry(null);
          reload();
        } else {
          setEditError(payload?.message ?? "تعذر تعديل الدرجة");
        }
      } catch {
        setEditError("حدث خطأ أثناء حفظ التعديل");
      } finally {
        setSavingEdit(false);
      }
    },
    [schoolId, showSuccess, reload]
  );

  // ── Bulk confirm ──────────────────────────────────────────────────────────────

  const handleBulkConfirm = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkConfirming(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
        `/api/web/grades/confirm`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, entryIds: Array.from(selectedIds) }),
        }
      );
      if (payload?.ok) {
        showSuccess(`تم تأكيد ${payload.count} درجة بنجاح`);
        setSelectedIds(new Set());
        reload();
      } else {
        showError("تعذر تأكيد الدرجات المحددة");
      }
    } catch {
      showError("حدث خطأ أثناء التأكيد الجماعي");
    } finally {
      setBulkConfirming(false);
    }
  }, [selectedIds, schoolId, showSuccess, showError, reload]);

  // ── Export ────────────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!schoolId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ schoolId, academicYear: filters.academicYear, semester: String(filters.semester) });
      if (filters.classId) params.set("classId", filters.classId);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);
      if (filters.subjectId) params.set("subjectId", filters.subjectId);

      const response = await fetch(`/api/web/grades/export?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grades-${filters.academicYear}-s${filters.semester}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("تعذر تصدير الدرجات");
    } finally {
      setExporting(false);
    }
  }, [schoolId, filters, showError]);

  // ── Local Excel export ────────────────────────────────────────────────────────

  const handleExportLocalExcel = useCallback(() => {
    const statusMap: Record<string, string> = { draft: "مسودة", confirmed: "مؤكدة", locked: "مقفولة" };
    const data = filteredEntries.map((e, idx) => ({
      "#": idx + 1,
      "الطالب": e.student_name ?? "",
      "المادة": e.subject_name ?? "",
      "الصف": e.class_name ?? "",
      "الشعبة": e.section_name ?? "",
      "نوع الامتحان": e.grade_type_name ?? "",
      "الدرجة": e.score,
      "من": e.max_score,
      "النسبة": `${Math.round(e.percentage)}%`,
      "التقدير": e.grade_label ?? "",
      "الحالة": statusMap[e.status] ?? e.status,
      "ملاحظة": e.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 4 }, { wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `الدرجات ${filters.academicYear}`);
    XLSX.writeFile(wb, `درجات_${filters.academicYear}_ف${filters.semester}.xlsx`);
  }, [filteredEntries, filters]);

  // ── Print grades ──────────────────────────────────────────────────────────────

  const handlePrintGrades = useCallback(() => {
    const statusMap: Record<string, string> = { draft: "مسودة", confirmed: "مؤكدة", locked: "مقفولة" };
    const rows = filteredEntries.map((e, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${e.student_name ?? "—"}</td>
        <td>${e.subject_name ?? "—"}</td>
        <td>${e.class_name ?? ""}${e.section_name ? ` · ${e.section_name}` : ""}</td>
        <td>${e.grade_type_name ?? "—"}</td>
        <td dir="ltr">${e.score} / ${e.max_score}</td>
        <td>${Math.round(e.percentage)}%</td>
        <td><span class="badge badge-${e.status}">${statusMap[e.status] ?? e.status}</span></td>
        <td>${e.note ?? ""}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>سجلات الدرجات — ${filters.academicYear}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans Arabic',system-ui,sans-serif;background:#fff;color:#1e293b;padding:16mm;direction:rtl;font-size:11px}
  h1{font-size:18px;font-weight:900;color:#4f46e5;margin-bottom:4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#4f46e5;color:#fff;padding:7px 8px;text-align:right;font-weight:800;font-size:9px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700}
  .badge-draft{background:#f1f5f9;color:#64748b}
  .badge-confirmed{background:#dcfce7;color:#16a34a}
  .badge-locked{background:#fee2e2;color:#dc2626}
  @page{size:A4;margin:10mm}
  @media print{body{padding:0}}
</style>
</head>
<body>
<h1>سجلات الدرجات والأعمال</h1>
<div class="meta">السنة الدراسية: ${filters.academicYear} · الفصل: ${filters.semester} · عدد السجلات: ${filteredEntries.length}</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>الطالب</th><th>المادة</th><th>الصف</th><th>نوع الامتحان</th><th>الدرجة</th><th>النسبة</th><th>الحالة</th><th>ملاحظة</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>window.addEventListener("load",()=>{window.print();})</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, [filteredEntries, filters]);

  // ── Lock ──────────────────────────────────────────────────────────────────────

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState("");

  const handleLockSubmit = useCallback(async () => {
    if (!lockReason.trim()) return;
    setLocking(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
        `/api/web/grades/lock`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            academicYear: filters.academicYear,
            semester: filters.semester,
            classId: filters.classId || undefined,
            sectionId: filters.sectionId || undefined,
            subjectId: filters.subjectId || undefined,
            reason: lockReason.trim(),
          }),
        }
      );
      if (payload?.ok) {
        showSuccess(`تم قفل ${payload.count} درجة بنجاح`);
        setShowLockModal(false);
        setLockReason("");
        reload();
      } else {
        showError("تعذر قفل الدرجات");
      }
    } catch {
      showError("حدث خطأ أثناء قفل الدرجات");
    } finally {
      setLocking(false);
    }
  }, [lockReason, schoolId, filters, showSuccess, showError, reload]);

  // ── Add grade ─────────────────────────────────────────────────────────────────

  const handleAddGrade = useCallback(
    async (data: GradeEntryPayload) => {
      setSavingGrade(true);
      setSaveError("");
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; entry: GradeEntry; gate?: string }>(
          `/api/web/grades`,
          {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (payload?.ok) {
          showSuccess("تم حفظ الدرجة بنجاح");
          setShowAddModal(false);
          reload();
        } else {
          setSaveError(payload?.gate === "locked" ? "الدرجات مقفولة ولا يمكن الإضافة" : "تعذر حفظ الدرجة");
        }
      } catch {
        setSaveError("حدث خطأ أثناء حفظ الدرجة");
      } finally {
        setSavingGrade(false);
      }
    },
    [showSuccess, reload]
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/grades" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="الدرجات والأعمال"
            subtitle="إدخال ومتابعة درجات الطلاب"
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              {/* ── Toasts ─────────────────────────────────────────────────── */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm"
                  >
                    {success}
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── School scope banner ────────────────────────────────────── */}
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title="الدرجات والأعمال"
                    description="اختر مدرسة لعرض وإدارة الدرجات"
                  />
                </div>
              ) : (
                <div className="space-y-6">

                  {/* ── Hero banner ──────────────────────────────────────── */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                  >
                    <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                    <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                          لوحة الإدارة · الدرجات والأعمال
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          الدرجات والأعمال
                        </h1>
                        <p className="text-white/70 text-sm">
                          إدخال درجات الطلاب وتأكيدها وقفلها لكل مادة وفصل دراسي
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {filteredEntries.length > 0 && (
                          <>
                            <button
                              onClick={handleExportLocalExcel}
                              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold transition-all active:scale-95"
                              style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.28)", color: "white", backdropFilter: "blur(4px)" }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              Excel
                            </button>
                            <button
                              onClick={handlePrintGrades}
                              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold transition-all active:scale-95"
                              style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.28)", color: "white", backdropFilter: "blur(4px)" }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                              طباعة
                            </button>
                          </>
                        )}
                        <div
                          className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl"
                          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                        >
                          <GraduationCap size={38} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Stats ────────────────────────────────────────────── */}
                  <GradesStats stats={stats} loading={loading} />

                  {/* ── Tab bar ──────────────────────────────────────────── */}
                  <div className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5">
                    <button
                      onClick={() => setActiveTab("grades")}
                      className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all ${activeTab === "grades" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}
                    >
                      سجلات الدرجات
                    </button>
                    <button
                      onClick={() => setActiveTab("teachers")}
                      className={`flex-1 h-9 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === "teachers" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"}`}
                    >
                      درجات المدرسين
                      {filteredEntries.length > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === "teachers" ? "bg-white/20 text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>
                          {filteredEntries.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {activeTab === "grades" && (
                    <>
                  {/* ── Teacher Submissions (summary) ─────────────────────── */}
                  <TeacherSubmissionsPanel entries={filteredEntries} loading={loading} />

                  {/* ── Filters ──────────────────────────────────────────── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                    <GradesFilters
                      filters={filters}
                      onChange={patchFilters}
                      classes={classes}
                      sections={sections}
                      subjects={subjects}
                      gradeTypes={gradeTypes}
                      onExport={canExportGrades ? handleExport : () => {}}
                      onAddEntry={() => setShowAddModal(true)}
                      exporting={exporting}
                      canEnterGrades={canEnterGrades}
                      onLock={() => setShowLockModal(true)}
                      locking={locking}
                    />
                  </div>

                  {/* ── Table ────────────────────────────────────────────── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                    <div className="space-y-4">
                      {/* Section header */}
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-[var(--border)] pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">سجلات الدرجات</h2>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            {loading ? "جاري التحميل..." : `${totalCount} سجل`}
                          </p>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          {schoolScope.selectedSchool?.name ?? ""}
                        </div>
                      </div>

                      <GradesTable
                        entries={pagedEntries}
                        loading={loading}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        onRowClick={handleRowClick}
                        onConfirm={canConfirmGrades ? handleConfirmEntry : () => {}}
                        onDelete={canEnterGrades ? handleDeleteEntry : () => {}}
                        onEdit={canEnterGrades ? handleOpenEdit : () => {}}
                        page={page}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        onPageChange={setPage}
                      />
                    </div>
                  </div>
                    </>
                  )}

                  {/* ── Teacher Grades Tab ────────────────────────────────── */}
                  {activeTab === "teachers" && (
                    <div className="space-y-3">
                      {/* Toolbar */}
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--text-muted)]">
                          درجات مُدخلة عبر التطبيق — اضغط على المدرس لعرض تفاصيل درجاته
                        </p>
                        {canEnterGrades && (
                          <button
                            onClick={() => setShowGradeTypeModal(true)}
                            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-soft)] transition-colors whitespace-nowrap"
                          >
                            + إضافة نوع امتحان
                          </button>
                        )}
                      </div>
                      <TeacherGradesTab
                        entries={filteredEntries}
                        loading={loading}
                        canEdit={canEnterGrades}
                        canConfirm={canConfirmGrades}
                        onEdit={handleOpenEdit}
                        onConfirm={handleConfirmEntry}
                        onDelete={handleDeleteEntry}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* ── Bulk action floating bar ──────────────────────────────────────── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-6 start-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl px-5 py-3"
            >
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {selectedIds.size} درجة محددة
              </span>
              <div className="w-px h-5 bg-[var(--border)]" />
              {canConfirmGrades && (
                <button
                  onClick={handleBulkConfirm}
                  disabled={bulkConfirming}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-black text-white bg-[var(--primary)] shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {bulkConfirming ? "جاري التأكيد..." : "تأكيد الكل"}
                </button>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="h-9 px-3 rounded-xl text-xs font-bold text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                إلغاء التحديد
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grade Detail Panel ────────────────────────────────────────────── */}
        <GradeDetailPanel
          entry={selectedEntry}
          show={showDetail}
          onClose={() => { setShowDetail(false); setSelectedEntry(null); }}
          onConfirm={canConfirmGrades ? handleConfirmEntry : () => {}}
          onDelete={canEnterGrades ? handleDeleteEntry : () => {}}
          canEnterGrades={canEnterGrades}
          schoolId={schoolId}
        />

        {/* ── Grade Entry Modal ─────────────────────────────────────────────── */}
        <GradeEntryModal
          show={showAddModal}
          onClose={() => { setShowAddModal(false); setSaveError(""); }}
          onSubmit={handleAddGrade}
          saving={savingGrade}
          error={saveError}
          classes={classes}
          sections={sections}
          subjects={subjects}
          gradeTypes={gradeTypes}
          schoolId={schoolId}
          defaultFilters={filters}
        />

        {/* ── Edit Grade Modal ─────────────────────────────────────────────── */}
        <EditGradeModal
          entry={editingEntry}
          show={showEditModal}
          schoolId={schoolId}
          onClose={() => { setShowEditModal(false); setEditingEntry(null); setEditError(""); }}
          onSubmit={handleSaveEdit}
          saving={savingEdit}
          error={editError}
        />

        {/* ── Grade Type Add Modal ──────────────────────────────────────────── */}
        <GradeTypeAddModal
          show={showGradeTypeModal}
          schoolId={schoolId}
          onClose={() => setShowGradeTypeModal(false)}
          onCreated={() => setShowGradeTypeModal(false)}
        />

        {/* ── Lock Modal ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showLockModal && (
            <>
              <motion.div
                key="lock-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={() => setShowLockModal(false)}
              />
              <motion.div
                key="lock-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <span className="text-xl">🔒</span>
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-primary)]">قفل سجلات الدرجات</h3>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    بعد القفل لن يمكن تعديل هذه الدرجات. يرجى إدخال سبب القفل للمتابعة.
                  </p>
                  <textarea
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-primary)] resize-none outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition"
                    rows={3}
                    placeholder="سبب القفل..."
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value)}
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowLockModal(false); setLockReason(""); }}
                      className="px-4 py-2 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleLockSubmit}
                      disabled={locking || !lockReason.trim()}
                      className="px-5 py-2 rounded-xl text-sm font-black bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {locking ? "جاري القفل..." : "🔒 قفل الدرجات"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
