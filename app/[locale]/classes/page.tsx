"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useBranchScope } from "@/hooks/useBranchScope";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { School, Layers, Banknote } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import { useClassesSections } from "../dashboard/_hooks/useClassesSections";
import { useDashboardData } from "../dashboard/_hooks/useDashboardData";
import { useFeeManagement } from "../dashboard/_hooks/useFeeManagement";
import type { ClassItem, SectionItem, ClassForm, SectionForm } from "../dashboard/_components/types";
import { ClassFeesTable, FeeModal } from "../dashboard/_components";
import { ClassFormModal } from "./_components/ClassFormModal";
import { SectionFormModal } from "./_components/SectionFormModal";
import { ClassesTable } from "./_components/ClassesTable";
import { UnifiedClassesTable } from "./_components/UnifiedClassesTable";
import { SectionsTable } from "./_components/SectionsTable";
import { ClassesStats } from "./_components/ClassesStats";
import { ClassStudentsList } from "./_components/ClassStudentsList";
import { ClassPromoteModal } from "./_components/ClassPromoteModal";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

export default function ClassesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = useTranslations("classes");
  const commonT = useTranslations("common");
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);
  const runtimeBranding = useRuntimeBranding();

  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);

  const effectiveBranchId =
    runtimeBranding.branchId ??
    profile?.branch_id ??
    branchScope.selectedBranchId ??
    null;

  const classesSections = useClassesSections({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped: !!effectiveBranchId,
    branchId: effectiveBranchId,
  });

  const dashboardData = useDashboardData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped: !!effectiveBranchId,
  });

  const availableClassNames = classesSections.classes.map((c) => c.name);

  const feeManagement = useFeeManagement({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    classFees: dashboardData.classFees || [],
    studentCountByClass: dashboardData.studentCountByClass || {},
    availableClassNames,
    onRefetch: dashboardData.refetch,
    branchScoped: !!effectiveBranchId,
  });

  // Local UI state
  const [activeView, setActiveView] = useState<"classes" | "sections">("classes");
  const [search, setSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>({ name: "", sections: [] });
  const [sectionForm, setSectionForm] = useState<SectionForm>({ class_id: "", name: "" });
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const isEn = locale === "en";

  // Filtered data
  const filteredClasses = classesSections.classes.filter((cls) =>
    search ? cls.name.toLowerCase().includes(search.toLowerCase()) : true
  );
  const filteredSections = classesSections.sections.filter((sec) => {
    const cls = classesSections.classes.find((c) => c.id === sec.class_id);
    const matchSearch = search
      ? sec.name.toLowerCase().includes(search.toLowerCase()) ||
        (cls?.name ?? "").toLowerCase().includes(search.toLowerCase())
      : true;
    const matchClass = selectedClassId ? sec.class_id === selectedClassId : true;
    return matchSearch && matchClass;
  });

  const selectedClass = selectedClassId
    ? classesSections.classes.find((c) => c.id === selectedClassId) ?? null
    : null;

  const handleSelectClass = (cls: ClassItem) => {
    if (selectedClassId === cls.id) {
      setSelectedClassId(null);
    } else {
      setSelectedClassId(cls.id);
      setActiveView("sections");
    }
  };

  // Handlers
  const openAddClass = useCallback(() => {
    classesSections.clearMutationFeedback();
    setEditingClass(null);
    setClassForm({ name: "", sections: [] });
    setShowClassForm(true);
    setShowSectionForm(false);
  }, [classesSections]);

  const openEditClass = useCallback((cls: ClassItem) => {
    classesSections.clearMutationFeedback();
    const clsSections = classesSections.sections.filter((s) => s.class_id === cls.id);
    setEditingClass(cls);
    setClassForm({ name: cls.name, sections: clsSections.map((s) => s.name) });
    setShowClassForm(true);
    setShowSectionForm(false);
  }, [classesSections]);

  const openAddSection = useCallback(() => {
    classesSections.clearMutationFeedback();
    setEditingSection(null);
    setSectionForm({ class_id: classesSections.classes[0]?.id ?? "", name: "" });
    setShowSectionForm(true);
    setShowClassForm(false);
  }, [classesSections]);

  const openEditSection = useCallback((sec: SectionItem) => {
    classesSections.clearMutationFeedback();
    setEditingSection(sec);
    setSectionForm({ class_id: sec.class_id, name: sec.name });
    setShowSectionForm(true);
    setShowClassForm(false);
  }, [classesSections]);

  const handleSaveClass = useCallback(async () => {
    await classesSections.handleSaveClass(classForm, editingClass, async () => {
      if (!editingClass && classForm.total_fee && Number(classForm.total_fee) > 0) {
        try {
          const res = await fetch("/api/web/dashboard/class-fees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save",
              school_id: schoolScope.selectedSchoolId,
              branch_id: effectiveBranchId || null,
              branch_scoped: !!effectiveBranchId,
              fee_id: null,
              class_name: classForm.name.trim(),
              total_fee: classForm.total_fee,
              installments: classForm.installments || "4",
              notes: "",
            }),
          });
          if (res.ok) dashboardData.refetch();
        } catch {}
      }
      setShowClassForm(false);
      setEditingClass(null);
      setClassForm({ name: "", sections: [] });
    });
  }, [classForm, editingClass, classesSections, schoolScope.selectedSchoolId, effectiveBranchId, dashboardData]);

  const handleSaveSection = useCallback(async () => {
    await classesSections.handleSaveSection(sectionForm, editingSection, () => {
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ class_id: "", name: "" });
    });
  }, [sectionForm, editingSection, classesSections]);

  const handleDeleteClass = useCallback(async (id: string) => {
    setConfirmDeleteClassId(null);
    await classesSections.handleDeleteClass(id);
  }, [classesSections]);

  const handleDeleteSection = useCallback(async (id: string) => {
    setConfirmDeleteSectionId(null);
    await classesSections.handleDeleteSection(id);
  }, [classesSections]);

  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError, setPromoteError] = useState("");

  const handlePromote = useCallback(async (targetClassName: string) => {
    if (!selectedClass) return;
    setPromoteLoading(true);
    setPromoteError("");
    try {
      const params = new URLSearchParams({ className: selectedClass.name });
      if (schoolScope.selectedSchoolId) params.set("schoolId", schoolScope.selectedSchoolId);
      if (effectiveBranchId) params.set("branchId", effectiveBranchId);
      const { payload } = await fetchJsonWithAuthorizedSession<{ students: { id: string }[] }>(
        `/api/web/students/list?${params.toString()}`
      );
      const ids = (payload?.students ?? []).map((s) => s.id);
      if (ids.length === 0) {
        setPromoteError(isEn ? "No students to promote in this class." : "لا يوجد طلاب للترقية في هذا الصف.");
        return;
      }
      await Promise.all(
        ids.map((id) =>
          fetchJsonWithAuthorizedSession(`/api/web/students/${id}`, {
            method: "PATCH",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              transfer_type: "class",
              target_class_name: targetClassName,
              school_id: schoolScope.selectedSchoolId,
              branch_id: effectiveBranchId ?? undefined,
            }),
          })
        )
      );
      setShowPromoteModal(false);
      setSelectedClassId(null);
      void classesSections.refetch();
    } catch {
      setPromoteError(isEn ? "Promotion failed, please try again." : "فشلت الترقية، حاول مرة أخرى.");
    } finally {
      setPromoteLoading(false);
    }
  }, [selectedClass, schoolScope.selectedSchoolId, effectiveBranchId, isEn, classesSections]);

  const handlePrint = useCallback(async () => {
    if (!selectedClass) return;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const params = new URLSearchParams({ className: selectedClass.name });
    if (schoolScope.selectedSchoolId) params.set("schoolId", schoolScope.selectedSchoolId);
    if (effectiveBranchId) params.set("branchId", effectiveBranchId);
    const { payload } = await fetchJsonWithAuthorizedSession<{
      students: { id: string; full_name: string; section: string | null; status: string }[];
    }>(`/api/web/students/list?${params.toString()}`);
    const students = payload?.students ?? [];
    const grouped = students.reduce<Record<string, typeof students>>((acc, s) => {
      const key = s.section ?? (isEn ? "No Section" : "بدون شعبة");
      (acc[key] ??= []).push(s);
      return acc;
    }, {});
    const dir = isEn ? "ltr" : "rtl";
    const align = isEn ? "left" : "right";
    const sectionBlocks = Object.entries(grouped).map(([sec, list]) =>
      `<div class="section"><div class="sh">${isEn ? "Section" : "شعبة"} ${esc(sec)} — ${list.length} ${isEn ? "students" : "طالب"}</div>` +
      `<table><thead><tr><th>#</th><th>${isEn ? "Name" : "الاسم"}</th><th>${isEn ? "Section" : "الشعبة"}</th><th>${isEn ? "Status" : "الحالة"}</th></tr></thead><tbody>` +
      list.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.full_name)}</td><td>${esc(s.section ?? "—")}</td><td>${esc(s.status)}</td></tr>`).join("") +
      `</tbody></table></div>`
    ).join("");
    const html = [
      `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><title>${esc(selectedClass.name)}</title>`,
      `<style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px;direction:${dir}}`,
      `h1{font-size:18px;margin-bottom:4px}.meta{color:#666;margin-bottom:20px;font-size:12px}`,
      `.section{margin-bottom:24px}.sh{font-weight:bold;font-size:14px;background:#f3f4f6;padding:6px 10px;border-radius:6px;margin-bottom:8px}`,
      `table{width:100%;border-collapse:collapse}th,td{border:1px solid #e5e7eb;padding:6px 10px;text-align:${align}}`,
      `th{background:#f9fafb;font-weight:bold}tr:nth-child(even){background:#f9fafb}`,
      `@media print{body{padding:0}}</style></head>`,
      `<body onload="window.print()">`,
      `<h1>${esc(selectedClass.name)}</h1>`,
      `<div class="meta">${students.length} ${isEn ? "students" : "طالب"} · ${Object.keys(grouped).length} ${isEn ? "sections" : "شعب"} · ${new Date().toLocaleDateString(isEn ? "en-US" : "ar-IQ-u-nu-latn")}</div>`,
      sectionBlocks,
      `</body></html>`,
    ].join("");
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      // Popup blocked — fallback: download as HTML file
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedClass.name}.html`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, [selectedClass, schoolScope.selectedSchoolId, effectiveBranchId, isEn]);

  const tabs: { id: "classes" | "sections"; label: string; icon: React.ElementType; color: string }[] = [
    { id: "classes",  label: isEn ? `Classes (${classesSections.classes.length})` : `الصفوف (${classesSections.classes.length})`,   icon: School,  color: "var(--primary)" },
    { id: "sections", label: isEn ? `Sections (${classesSections.sections.length})` : `الشعب (${classesSections.sections.length})`, icon: Layers, color: "var(--success)" },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/classes" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={isEn ? "Manage classes and sections" : "إدارة الصفوف والشعب الدراسية"}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              {/* Feedback */}
              <AnimatePresence>
                {classesSections.mutationSuccess && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm"
                  >
                    {classesSections.mutationSuccess}
                  </motion.div>
                )}
                {classesSections.mutationError && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm"
                  >
                    {classesSections.mutationError}
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
                      description={isEn ? "Select a school to manage classes" : "اختر مدرسة لإدارة الصفوف"}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">

                  {/* Hero Banner */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)",
                    }}
                  >
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
                          {isEn ? "Administration · Classes" : "لوحة الإدارة · الصفوف"}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          {isEn ? "Classes & Sections" : "الصفوف والشعب"}
                        </h1>
                        <p className="text-white/70 text-sm">
                          {isEn ? "Manage class groups, sections, and student assignments" : "إدارة الصفوف والشعب وتوزيع الطلاب"}
                        </p>
                      </div>
                      <div
                        className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                      >
                        <School size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <ClassesStats
                    classesCount={classesSections.classes.length}
                    sectionsCount={classesSections.sections.length}
                    studentsCount={classesSections.classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0)}
                    locale={locale}
                  />

                  {/* Tab Bar */}
                  <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeView === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveView(tab.id)}
                          className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
                            isActive
                              ? "text-white"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="classes-tab-pill"
                              className="absolute inset-0 rounded-xl"
                              style={{ background: tab.color }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            <Icon size={15} />
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Toolbar: Search + Add dropdown */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 flex items-center justify-between gap-3">
                    <Input
                      placeholder={isEn ? "Search..." : "بحث..."}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    {canManageClasses && (
                      <button
                        onClick={openAddClass}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs font-black text-white transition-all whitespace-nowrap"
                        style={{
                          background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, var(--success)))",
                          boxShadow: "0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent)",
                        }}
                      >
                        + {isEn ? "Add Class" : "إضافة صف"}
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeView}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="p-4 sm:p-6 space-y-6"
                      >
                        {activeView === "classes" ? (
                          <>
                            {/* Unified classes + fees table */}
                            {filteredClasses.length === 0 ? (
                              <EmptyState
                                title={isEn ? "No classes yet" : "لا توجد صفوف"}
                                description={isEn ? "Add your first class to get started" : "أضف أول صف للبدء"}
                              />
                            ) : (
                              <UnifiedClassesTable
                                classes={filteredClasses}
                                sections={classesSections.sections}
                                classFees={dashboardData.classFees}
                                canManage={canManageClasses}
                                selectedClassId={selectedClassId}
                                confirmDeleteClassId={confirmDeleteClassId}
                                confirmDeleteFeeId={feeManagement.deleteConfirm}
                                getClassStats={feeManagement.getClassStats}
                                onSelectClass={handleSelectClass}
                                onEditClass={openEditClass}
                                onDeleteClass={handleDeleteClass}
                                onConfirmDeleteClass={setConfirmDeleteClassId}
                                onCancelDeleteClass={() => setConfirmDeleteClassId(null)}
                                onEditFee={feeManagement.openEditFee}
                                onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
                                onConfirmDeleteFee={feeManagement.handleDeleteFee}
                                onCancelDeleteFee={() => feeManagement.setDeleteConfirm(null)}
                                locale={locale}
                              />
                            )}
                          </>
                        ) : (
                          <div className="space-y-4">
                            {selectedClass && (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-[var(--primary)]">{selectedClass.name}</span>
                                  <span className="text-xs text-[var(--text-muted)]">
                                    {filteredSections.length} {isEn ? "sections" : "شعبة"} · {selectedClass.studentCount ?? 0} {isEn ? "students" : "طالب"}
                                  </span>
                                  <a
                                    href={`/${locale}/students?class=${encodeURIComponent(selectedClass.name)}`}
                                    className="text-xs px-2 py-1 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
                                  >
                                    {isEn ? "View Students →" : "عرض الطلاب ←"}
                                  </a>
                                  <Button variant="outline" size="sm" onClick={handlePrint}>
                                    🖨️ {isEn ? "Print" : "طباعة"}
                                  </Button>
                                  {canManageClasses && (
                                    <Button variant="outline" size="sm" onClick={() => setShowPromoteModal(true)}>
                                      🎓 {isEn ? "Promote All" : "ترقية جماعية"}
                                    </Button>
                                  )}
                                </div>
                                <button
                                  onClick={() => setSelectedClassId(null)}
                                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-2"
                                >
                                  ✕ {isEn ? "Clear" : "مسح"}
                                </button>
                              </div>
                            )}
                            {filteredSections.length === 0 ? (
                              <EmptyState
                                title={isEn ? "No sections yet" : "لا توجد شعب"}
                                description={isEn ? "Add sections to your classes" : "أضف شعب للصفوف"}
                              />
                            ) : (
                              <SectionsTable
                                sections={filteredSections}
                                classes={classesSections.classes}
                                canManage={canManageClasses}
                                confirmDeleteId={confirmDeleteSectionId}
                                onEdit={openEditSection}
                                onDelete={handleDeleteSection}
                                onConfirmDelete={setConfirmDeleteSectionId}
                                onCancelDelete={() => setConfirmDeleteSectionId(null)}
                                locale={locale}
                              />
                            )}
                            {selectedClass && (
                              <div className="mt-4 border-t border-[var(--border)] pt-4">
                                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                                  {isEn ? "Students" : "الطلاب"}
                                </div>
                                <ClassStudentsList
                                  className={selectedClass.name}
                                  classes={classesSections.classes}
                                  sections={classesSections.sections}
                                  schoolId={schoolScope.selectedSchoolId}
                                  branchId={effectiveBranchId}
                                  canManage={canManageClasses}
                                  locale={locale}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modals */}
        <ClassFormModal
          show={showClassForm}
          editingClass={editingClass}
          classForm={classForm}
          setClassForm={setClassForm}
          saving={classesSections.mutationLoading}
          error={classesSections.mutationError}
          onSave={handleSaveClass}
          onClose={() => {
            setShowClassForm(false);
            setEditingClass(null);
            classesSections.clearMutationFeedback();
          }}
          locale={locale}
        />
        <SectionFormModal
          show={showSectionForm}
          editingSection={editingSection}
          sectionForm={sectionForm}
          setSectionForm={setSectionForm}
          classes={classesSections.classes}
          saving={classesSections.mutationLoading}
          error={classesSections.mutationError}
          onSave={handleSaveSection}
          onClose={() => {
            setShowSectionForm(false);
            setEditingSection(null);
            classesSections.clearMutationFeedback();
          }}
          locale={locale}
        />
        <FeeModal
          show={feeManagement.showFeeModal}
          editingFee={feeManagement.editingFee}
          feeForm={feeManagement.feeForm}
          feeLoading={feeManagement.feeLoading}
          feeError={feeManagement.feeError}
          feeSuccess={feeManagement.feeSuccess}
          studentCountByClass={dashboardData.studentCountByClass}
          availableClassNames={availableClassNames}
          onClose={feeManagement.closeFeeModal}
          onSave={feeManagement.handleSaveFee}
          onFormChange={feeManagement.setFeeForm}
        />

        {selectedClass && (
          <ClassPromoteModal
            show={showPromoteModal}
            sourceClass={selectedClass}
            studentCount={selectedClass.studentCount ?? 0}
            classes={classesSections.classes}
            loading={promoteLoading}
            error={promoteError}
            onConfirm={handlePromote}
            onClose={() => { setShowPromoteModal(false); setPromoteError(""); }}
            locale={locale}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
