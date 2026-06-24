"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { StudentWithFees, StudentActionItem } from "./_types";
import { useStudentsData } from "./_hooks/useStudentsData";
import { useStudentsModals } from "./_hooks/useStudentsModals";
import { useStudentsOperations } from "./_hooks/useStudentsOperations";
import { useStudentsPrint } from "./_hooks/useStudentsPrint";
import { getStudentActions } from "./_utils/getStudentActions";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useBranchScope } from "@/hooks/useBranchScope";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { printHtmlDocument } from "@/lib/print/branding";
import { buildBulkLoginCardsHtml, type BulkCardItem } from "./_utils";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, LayoutGrid } from "lucide-react";
import { formatNumber } from "@/lib/formatting";
import { StudentsInsights } from "./_components/StudentsInsights";
import { StudentQuickView } from "./_components/StudentQuickView";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import { Archive } from "@/lib/icons";

// Components
import { StudentsPageStyles } from "./_components/StudentsPageStyles";
import { StudentsTabs } from "./_components/StudentsTabs";
import { StudentsToolbar } from "./_components/StudentsToolbar";
import { StudentsTable } from "./_components/StudentsTable";
import { StudentDropdownMenu } from "./_components/StudentDropdownMenu";
import { AddStudentModal } from "./_components/AddStudentModal";
import { EditStudentModal } from "./_components/EditStudentModal";
import { DeleteConfirmModal } from "./_components/DeleteConfirmModal";
import { TransferStudentModal } from "./_components/TransferStudentModal";
import { ImportExcelModal } from "./_components/ImportExcelModal";
import { AccountCardModal } from "./_components/AccountCardModal";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { AcademicYearModal } from "./_components/AcademicYearModal";
import { QuickPayModal } from "./_components/QuickPayModal";
import { ChangeClassModal } from "./_components/ChangeClassModal";
import { ExportFieldsModal, type ExportFieldKey } from "./_components/ExportFieldsModal";

export default function StudentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = useTranslations("students");
  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const archiveMode = useArchiveMode();

  const canAddStudents = can("add_students");
  const canEditStudents = can("edit_students");
  const isAdminRole = profile?.role === "super_admin" || profile?.role === "admin";
  const canDeleteStudents = isAdminRole && can("delete_students");
  const canManageStudents = canAddStudents || canEditStudents || canDeleteStudents;
  const canManageStudentAccounts = isAdminRole;
  const isReadOnlyView = !canManageStudents;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSearch("");
    setFilterClass("");
    setFilterSection("");
    setPage(1);
    setDebouncedSearch("");
  }, [activeTab]);

  // Resolve branch from: runtime branding subdomain > profile fixed branch > URL ?branch= param
  const effectiveBranchId =
    runtimeBranding.branchId ??
    profile?.branch_id ??
    branchScope.selectedBranchId ??
    null;

  const {
    pagedStudents,
    totalCount,
    totalPages,
    backgroundReload,
    addStudentOptimistically,
    updateStudentOptimistically,
    removeStudentOptimistically,
    pagedLoading,
    pagedError,
    reload,
    studentsMeta,
    classFees,
    datasetLoading,
    loadStudentsDataset,
  } = useStudentsData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    activeTab,
    debouncedSearch,
    filterClass,
    filterSection,
    pageSize,
    page,
    currentBranchId: effectiveBranchId ?? undefined,
  });

  const modals = useStudentsModals();

  const operations = useStudentsOperations({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    classFees,
    canEditStudents,
    canDeleteStudents,
    canManageStudentAccounts,
    activeTab,
    setActiveTab,
    locale,
    runtimeBranding,
    currentBranchId: effectiveBranchId,
    modals: {
      setError: modals.setError,
      setSuccess: modals.setSuccess,
      setSaving: modals.setSaving,
      setImporting: modals.setImporting,
      setImportError: modals.setImportError,
      setImportPreview: modals.setImportPreview,
      setShowModal: modals.setShowModal,
      setShowEdit: modals.setShowEdit,
      setShowDeleteConfirm: modals.setShowDeleteConfirm,
      setShowTransferConfirm: modals.setShowTransferConfirm,
      setShowImport: modals.setShowImport,
      setAddStep: modals.setAddStep,
      setForm: modals.setForm,
      setEditForm: modals.setEditForm,
      setAccountCard: modals.setAccountCard,
      setRevealedPassword: modals.setRevealedPassword,
      setSelectedStudent: modals.setSelectedStudent,
      setActiveMenu: modals.setActiveMenu,
      form: modals.form,
      editForm: modals.editForm,
      selectedStudent: modals.selectedStudent,
      fileRef: modals.fileRef,
      openEdit: modals.openEdit,
    },
    reload,
    backgroundReload,
    addStudentOptimistically,
    updateStudentOptimistically,
    removeStudentOptimistically,
  });

  const print = useStudentsPrint({
    locale,
    runtimeBranding,
    setError: modals.setError,
  });

  const classes = studentsMeta.classOptions ?? [];
  const sectionsList = studentsMeta.sectionOptions;

  // Map archive students to StudentWithFees shape when in archive mode
  const archiveStudentsAsStudents: StudentWithFees[] = archiveMode.isArchiveMode && archiveMode.archiveData
    ? archiveMode.archiveData.students.map((s) => ({
        id: s.id,
        school_id: "",
        full_name: s.full_name,
        class_name: s.class_name,
        section: null,
        phone: s.phone ?? null,
        phone2: null,
        address: null,
        total_fee: s.total_fee,
        paid_fee: s.paid_fee,
        remaining_fee: s.remaining_fee,
        discount_value: 0,
        status: ((s.status ?? "archived") as StudentWithFees["status"]),
        created_at: "",
        updated_at: null,
      }))
    : [];

  const effectivePaged = archiveMode.isArchiveMode && archiveMode.archiveData
    ? archiveStudentsAsStudents
    : pagedStudents;

  const filtered = effectivePaged.filter((s) => {
    const matchSearch = s.full_name?.includes(search) || s.class_name?.includes(search);
    const matchClass = filterClass ? s.class_name === filterClass : true;
    const matchSection = filterSection ? s.section === filterSection : true;
    return matchSearch && matchClass && matchSection;
  });

  const buildGetActions = useCallback(
    (s: StudentWithFees): StudentActionItem[] =>
      getStudentActions({
        student: s,
        activeTab,
        locale,
        isReadOnlyView,
        canEditStudents,
        canDeleteStudents,
        canManageStudentAccounts,
        onPrint: print.handlePrint,
        onInitTransfer: operations.initTransfer,
        onInitSuspend: operations.initSuspend,
        onInitRestore: operations.initRestore,
        onOpenEdit: modals.openEdit,
        onOpenCredentials: operations.openStudentCredentialsCard,
        onInitDelete: (student) => {
          modals.setSelectedStudent(student);
          modals.setShowDeleteConfirm(true);
        },
        onQuickPay: (student) => {
          modals.setSelectedStudent(student);
          modals.setShowQuickPay(true);
        },
        onCopyData: (student) => {
          const parts = [student.full_name, student.class_name, student.section, student.phone].filter(Boolean);
          navigator.clipboard.writeText(parts.join(" · ")).catch(() => {});
          modals.setSuccess(locale === "en" ? "Student data copied." : "تم نسخ بيانات الطالب");
          setTimeout(() => modals.setSuccess(""), 2000);
        },
        onWhatsApp: (student) => {
          const rawPhone = student.phone?.replace(/\D/g, "") ?? "";
          if (rawPhone) {
            window.open(`https://wa.me/${rawPhone}`, "_blank", "noopener,noreferrer");
          }
        },
        onViewPayments: (student) => {
          setQuickViewStudent(student);
        },
        onChangeClass: (student) => {
          modals.setSelectedStudent(student);
          modals.setShowChangeClass(true);
        },
        setActiveMenu: modals.setActiveMenu,
      }),
    [activeTab, locale, isReadOnlyView, canEditStudents, canDeleteStudents, canManageStudentAccounts, modals, operations, print]
  );

  const exportAllStudentsExcel = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExportWithFields = useCallback(async (fields: Set<ExportFieldKey>) => {
    setExportLoading(true);
    try {
      const fullDataset = await loadStudentsDataset();
      if (fullDataset.length === 0) {
        modals.setError(locale === "en" ? "Could not load the full export dataset." : "تعذر تحميل بيانات التصدير الكاملة");
        return;
      }
      await operations.exportExcel(fullDataset, fields);
      setShowExportModal(false);
      modals.setSuccess(
        locale === "en"
          ? `${fullDataset.length} students exported successfully.`
          : `${fullDataset.length} طالب مصدر بنجاح`,
      );
      setTimeout(() => modals.setSuccess(""), 3000);
    } finally {
      setExportLoading(false);
    }
  }, [loadStudentsDataset, locale, modals, operations]);

  const handleResetCardPassword = useCallback(async () => {
    const card = modals.accountCard;
    if (!card || !profile) return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) return;
    const authUserId = modals.selectedStudent?.auth_user_id ?? card.auth_user_id;
    if (!authUserId) {
      modals.setError(locale === "en" ? "Cannot reset: no linked account found." : "تعذر إعادة التعيين: لا يوجد حساب مرتبط.");
      return;
    }
    setResettingPassword(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; accountCard?: typeof card; temporary_password?: string; error?: { message?: string } }>(
        `/api/dashboard/users/${authUserId}/reset-password`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_id: schoolId }) },
      );
      if (response.ok && payload?.accountCard) {
        modals.setAccountCard(payload.accountCard);
        modals.setRevealedPassword(payload.temporary_password ?? null);
      } else {
        modals.setError(payload?.error?.message || (locale === "en" ? "Failed to reset password." : "تعذر إعادة تعيين كلمة المرور."));
      }
    } catch {
      modals.setError(locale === "en" ? "Network error while resetting password." : "خطأ بالشبكة أثناء إعادة تعيين كلمة المرور.");
    } finally {
      setResettingPassword(false);
    }
  }, [modals, profile, schoolScope.selectedSchoolId, locale]);

  const printAllStudentCards = useCallback(async () => {
    if (!profile) return;
    modals.setPrintingCards(true);
    modals.setError("");
    try {
      const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
      if (!schoolId) {
        modals.setError(locale === "en" ? "No school selected." : "لم يتم تحديد المدرسة.");
        return;
      }
      const params = new URLSearchParams({ schoolId });
      if (effectiveBranchId) params.set("branchId", effectiveBranchId);

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; cards?: BulkCardItem[]; error?: { message?: string } }>(
        `/api/dashboard/students/bulk-cards?${params.toString()}`,
      );

      if (!response.ok || !payload?.cards) {
        modals.setError(payload?.error?.message || (locale === "en" ? "Could not load student cards." : "تعذر تحميل بطاقات الطلاب."));
        return;
      }

      if (payload.cards.length === 0) {
        modals.setError(locale === "en" ? "No students with active accounts found." : "لا يوجد طلاب بحسابات نشطة.");
        return;
      }

      const html = await buildBulkLoginCardsHtml(payload.cards, {
        locale,
        schoolName: runtimeBranding.schoolName,
        logoUrl: runtimeBranding.logoUrl,
        primaryColor: runtimeBranding.primaryColor,
        secondaryColor: runtimeBranding.secondaryColor,
        cardBgUrl: runtimeBranding.cardBgUrl,
      });
      printHtmlDocument(html);
    } catch {
      modals.setError(locale === "en" ? "Failed to prepare cards." : "حدث خطأ أثناء تجهيز البطاقات.");
    } finally {
      modals.setPrintingCards(false);
    }
  }, [profile, schoolScope.selectedSchoolId, effectiveBranchId, locale, modals, runtimeBranding]);

  const [_resettingPasswords, setResettingPasswords] = useState(false);
  const bulkResetConfirmedRef = useRef(false);
  const [showAcademicYearModal, setShowAcademicYearModal] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [quickViewStudent, setQuickViewStudent] = useState<StudentWithFees | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const _bulkResetPasswords = useCallback(async () => {
    if (!profile) return;
    if (!bulkResetConfirmedRef.current) {
      const confirmed = window.confirm(
        locale === "en"
          ? "This will reset passwords for ALL students with accounts. Students will need to use their new passwords to log in. Continue?"
          : "سيتم إعادة تعيين كلمات مرور جميع الطلاب الذين لديهم حسابات. سيحتاج الطلاب لاستخدام الكلمة الجديدة للدخول. هل تريد المتابعة؟"
      );
      if (!confirmed) return;
    }
    bulkResetConfirmedRef.current = false;
    setResettingPasswords(true);
    modals.setError("");
    try {
      const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
      if (!schoolId) {
        modals.setError(locale === "en" ? "No school selected." : "لم يتم تحديد المدرسة.");
        return;
      }
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; count?: number; error?: { message?: string } }>(
        "/api/dashboard/students/bulk-reset-passwords",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_id: schoolId,
            ...(effectiveBranchId ? { branch_id: effectiveBranchId } : {}),
          }),
        }
      );
      if (!response.ok) {
        modals.setError(payload?.error?.message || (locale === "en" ? "Failed to reset passwords." : "تعذر إعادة تعيين كلمات المرور."));
        return;
      }
      const count = payload?.count ?? 0;
      modals.setSuccess(
        locale === "en"
          ? `Passwords reset for ${count} students.`
          : `تمت إعادة تعيين كلمات مرور ${count} طالب بنجاح.`
      );
      setTimeout(() => modals.setSuccess(""), 4000);
    } catch {
      modals.setError(locale === "en" ? "Failed to reset passwords." : "حدث خطأ أثناء إعادة التعيين.");
    } finally {
      setResettingPasswords(false);
    }
  }, [profile, schoolScope.selectedSchoolId, effectiveBranchId, locale, modals]);

  const loadingFallback = (
    <div className="flex min-h-screen bg-[var(--surface-soft)] items-center justify-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-[var(--border)]" />
        <div className="h-3 w-24 rounded bg-[var(--border)]" />
      </div>
    </div>
  );

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]} fallback={loadingFallback}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <StudentsPageStyles />
        <AppSidebar currentPath="/students" />
        
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title={t("title")} 
            subtitle={locale === "en" ? "Manage and track student records" : "إدارة ومتابعة بيانات سجلات الطلاب"}
            scope={schoolScope} 
            fixed 
          />
          
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <motion.div
              className="p-4 sm:p-6 space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Success Alert */}
              {modals.success && (
                <Card className="border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_5%,transparent)]">
                  <CardContent className="p-4">
                    <div className="font-semibold text-[var(--success)]">{modals.success}</div>
                    {modals.accountCard && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => print.openAccountCardWindow(modals.accountCard!, true, modals.revealedPassword)}
                        >
                          {t("modals.printCredentials")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => print.copyAccountCardCredentials(modals.accountCard, modals.setSuccess, modals.revealedPassword)}
                        >
                          {t("modals.copyCredentials")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Error Alert */}
              {modals.error && (
                <Card className="border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_5%,transparent)]">
                  <CardContent className="p-4">
                    <div className="font-semibold text-[var(--danger)]">{modals.error}</div>
                  </CardContent>
                </Card>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {archiveMode.isArchiveMode && archiveMode.archiveData && (
                <div className="px-0 pt-0">
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
                    <Archive className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-black text-amber-800">وضع الأرشيف — سنة {archiveMode.archiveData.year}</p>
                      <p className="text-xs text-amber-700 mt-0.5">تعرض {archiveMode.archiveData.students.length} طالب من أرشيف سنة {archiveMode.archiveData.year}</p>
                    </div>
                  </div>
                </div>
              )}

              {schoolScope.shouldBlockContent ? (
                <Card>
                  <CardContent className="p-8">
                    <SchoolScopeEmptyState
                      scope={schoolScope}
                      title={t("title")}
                      description={t("emptyState.description")}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-5">
                  {/* Hero Banner */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                  >
                    <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                    <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">لوحة الإدارة · الطلاب</p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">إدارة الطلاب</h1>
                        <p className="text-white/70 text-sm">تسجيل ومتابعة الطلاب والرسوم والحضور</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
                            <Users size={12} />
                            {formatNumber(studentsMeta.summary.totalStudents)} طالب
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <Users size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <StudentsTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    studentsMeta={studentsMeta}
                  />

                  {/* AI Insights Strip */}
                  <StudentsInsights studentsMeta={studentsMeta} />

                  {/* Main Content Section */}
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-5">
                      {/* Compact Mode Toggle */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setCompactMode((v) => !v)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            compactMode
                              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                              : "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
                          }`}
                          title="تبديل كثافة الجدول"
                        >
                          <LayoutGrid size={14} />
                          {compactMode ? "عرض موسّع" : "عرض مضغوط"}
                        </button>
                      </div>
                      <StudentsToolbar
                        search={search}
                        setSearch={setSearch}
                        filterClass={filterClass}
                        setFilterClass={setFilterClass}
                        filterSection={filterSection}
                        setFilterSection={setFilterSection}
                        classes={classes}
                        sectionsList={sectionsList}
                        activeTab={activeTab}
                        isReadOnlyView={isReadOnlyView}
                        canManageStudentAccounts={canManageStudentAccounts}
                        datasetLoading={datasetLoading}
                        printingCards={modals.printingCards}
                        filtered={filtered}
                        onExportCurrentPage={() => operations.exportExcel(filtered)}
                        onExportAll={exportAllStudentsExcel}
                        onPrintFiltered={() => print.printFilteredStudents(filtered)}
                        onPrintAllCards={printAllStudentCards}
                        onPromoteYear={() => setShowAcademicYearModal(true)}
                        onAddStudent={() => {
                          if (!effectiveBranchId) {
                            modals.setError(locale === "ar"
                              ? "لم يتم تحديد الفرع الحالي، يرجى إعادة اختيار الفرع"
                              : "No branch selected. Please select a branch first.");
                            return;
                          }
                          modals.resetForm();
                          modals.setShowModal(true);
                        }}
                        onBulkImport={() => setShowBulkImport(true)}
                      />
                      <StudentsTable
                        pagedStudents={archiveMode.isArchiveMode ? archiveStudentsAsStudents : pagedStudents}
                        pagedLoading={archiveMode.isArchiveMode ? false : pagedLoading}
                        pagedError={archiveMode.isArchiveMode ? "" : pagedError}
                        totalCount={archiveMode.isArchiveMode ? (archiveMode.archiveData?.students.length ?? 0) : totalCount}
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        activeTab={activeTab}
                        error={modals.error}
                        canManageStudentAccounts={canManageStudentAccounts}
                        getActions={buildGetActions}
                        openMenu={modals.openMenu}
                        onPageChange={setPage}
                        compactMode={compactMode}
                        selectedStudents={selectedStudents}
                        onSelectStudent={(id) => {
                          setSelectedStudents((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                        onQuickView={setQuickViewStudent}
                      />
                  </div>
                </div>
              )}
            </motion.div>
          </main>
        </div>

        {/* Modals */}
        <StudentDropdownMenu
          activeMenu={modals.activeMenu}
          selectedStudent={modals.selectedStudent}
          menuPos={modals.menuPos}
          getActions={buildGetActions}
        />
        <AddStudentModal
          show={modals.showModal}
          isReadOnlyView={isReadOnlyView}
          canManageStudentAccounts={canManageStudentAccounts}
          addStep={modals.addStep}
          setAddStep={modals.setAddStep}
          form={modals.form}
          setForm={modals.setForm}
          classFees={classFees}
          saving={modals.saving}
          error={modals.error}
          onClose={() => {
            modals.setShowModal(false);
            modals.resetForm();
          }}
          onSubmit={operations.handleAdd}
          schoolId={schoolScope.selectedSchoolId}
        />
        <EditStudentModal
          show={modals.showEdit}
          isReadOnlyView={isReadOnlyView}
          selectedStudent={modals.selectedStudent}
          editForm={modals.editForm}
          setEditForm={modals.setEditForm}
          classFees={classFees}
          saving={modals.saving}
          error={modals.error}
          onClose={() => modals.setShowEdit(false)}
          onSubmit={operations.handleEdit}
          schoolId={schoolScope.selectedSchoolId}
        />
        <DeleteConfirmModal
          show={modals.showDeleteConfirm}
          isReadOnlyView={isReadOnlyView}
          canDeleteStudents={canDeleteStudents}
          selectedStudent={modals.selectedStudent}
          onConfirm={operations.handleDeleteConfirmed}
          onCancel={() => {
            modals.setShowDeleteConfirm(false);
            modals.setSelectedStudent(null);
          }}
        />
        <TransferStudentModal
          show={modals.showTransferConfirm}
          isReadOnlyView={isReadOnlyView}
          canEditStudents={canEditStudents}
          selectedStudent={modals.selectedStudent}
          classFees={classFees}
          onConfirm={operations.confirmTransfer}
          onCancel={() => {
            modals.setShowTransferConfirm(false);
            modals.setSelectedStudent(null);
          }}
          loading={modals.saving}
        />
        <ImportExcelModal
          show={modals.showImport}
          isReadOnlyView={isReadOnlyView}
          canManageStudentAccounts={canManageStudentAccounts}
          importPreview={modals.importPreview}
          importError={modals.importError}
          importing={modals.importing}
          fileRef={modals.fileRef}
          onFileChange={operations.handleFileChange}
          onImport={operations.handleImport}
          onDownloadTemplate={operations.downloadTemplate}
          onClose={() => {
            modals.setShowImport(false);
            modals.setImportPreview([]);
            modals.setImportError("");
          }}
        />
        <AccountCardModal
          accountCard={modals.accountCard}
          revealedPassword={modals.revealedPassword}
          onPrint={(card, autoPrint) => print.openAccountCardWindow(card, autoPrint, modals.revealedPassword)}
          onCopy={() => print.copyAccountCardCredentials(modals.accountCard, modals.setSuccess, modals.revealedPassword)}
          onClose={() => {
            modals.setAccountCard(null);
            modals.setRevealedPassword(null);
          }}
          onResetPassword={handleResetCardPassword}
          resettingPassword={resettingPassword}
        />
        <BulkImportModal
          show={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={reload}
          schoolId={schoolScope.selectedSchoolId}
          branchId={effectiveBranchId}
        />

        <QuickPayModal
          show={modals.showQuickPay}
          student={modals.selectedStudent}
          schoolId={schoolScope.selectedSchoolId}
          branchId={effectiveBranchId}
          onClose={() => modals.setShowQuickPay(false)}
          onSuccess={() => {
            modals.setSuccess(locale === "en" ? "Payment recorded successfully." : "تم تسجيل الدفعة بنجاح");
            setTimeout(() => modals.setSuccess(""), 3000);
            void backgroundReload();
          }}
        />
        <ChangeClassModal
          show={modals.showChangeClass}
          student={modals.selectedStudent}
          classFees={classFees}
          onClose={() => modals.setShowChangeClass(false)}
          onSuccess={(updated) => {
            updateStudentOptimistically(updated.id, { class_name: updated.class_name, section: updated.section });
            modals.setSuccess(locale === "en" ? "Class updated successfully." : "تم تغيير الصف بنجاح");
            setTimeout(() => modals.setSuccess(""), 3000);
          }}
        />
        <ExportFieldsModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportWithFields}
          loading={exportLoading}
        />
        <AcademicYearModal
          isOpen={showAcademicYearModal}
          schoolId={schoolScope.selectedSchoolId ?? ""}
          branchId={effectiveBranchId}
          onClose={() => { setShowAcademicYearModal(false); void reload(); }}
          fetchWithAuth={(url, options) =>
            fetchJsonWithAuthorizedSession(url, options)
          }
        />

        {/* Student Quick View Panel */}
        <StudentQuickView
          student={quickViewStudent}
          schoolId={schoolScope.selectedSchoolId}
          onClose={() => setQuickViewStudent(null)}
        />

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedStudents.size > 0 && (
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl z-50"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22 }}
            >
              <span className="font-semibold text-sm">{selectedStudents.size} طالب محدد</span>
              <button
                type="button"
                className="text-white/80 hover:text-white text-sm underline underline-offset-2"
                onClick={() => setSelectedStudents(new Set())}
              >
                إلغاء التحديد
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
