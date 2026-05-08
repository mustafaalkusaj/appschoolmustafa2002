"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentWithFees, StudentActionItem } from "./_types";
import type { BranchOption } from "./_components/AddStudentModal";
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
import { supabase } from "@/lib/supabase";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

// Components
import { StudentsPageStyles } from "./_components/StudentsPageStyles";
import { StudentsTabs } from "./_components/StudentsTabs";
import { StudentsStats } from "./_components/StudentsStats";
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

export default function StudentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = useTranslations("students");
  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);
  const runtimeBranding = useRuntimeBranding();


  const canAddStudents = can("add_students");
  const canEditStudents = can("edit_students");
  const canDeleteStudents = can("delete_students");
  const canManageStudents = canAddStudents || canEditStudents || canDeleteStudents;
  const canManageStudentAccounts = profile?.role === "super_admin" || profile?.role === "admin";
  const isReadOnlyView = !canManageStudents;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Branches for multi-branch users who don't have a pre-selected branch from context
  const [branchesForForm, setBranchesForForm] = useState<BranchOption[]>([]);
  // Show branch selector only when no branch is pre-selected from any context
  // (subdomain branding, profile fixed branch, or sidebar branch scope selection)
  const showBranchSelector = !runtimeBranding.branchId && !profile?.branch_id && !branchScope.selectedBranchId;

  useEffect(() => {
    if (!showBranchSelector || !profile || !schoolScope.selectedSchoolId) return;
    const schoolId = schoolScope.selectedSchoolId;
    void (async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });
      const rows = (data ?? []) as { id: string; name: string }[];
      setBranchesForForm(rows.map((b) => ({ id: b.id, name: b.name })));
    })();
  }, [showBranchSelector, profile, schoolScope.selectedSchoolId]);

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
    currentBranchId: runtimeBranding.branchId ?? branchScope.selectedBranchId ?? undefined,
  });

  const modals = useStudentsModals();

  // Use runtimeBranding.branchId if available; then profile fixed branch;
  // then the sidebar-selected branch (for multi-branch admins who pick from sidebar);
  // finally branchesForForm[0] when there is exactly one branch.
  const effectiveBranchId =
    runtimeBranding.branchId ??
    profile?.branch_id ??
    branchScope.selectedBranchId ??
    (branchesForForm.length === 1 ? branchesForForm[0].id : null);

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

  const classes = Array.from(
    new Set(classFees.map((item) => item.class_name?.trim()).filter(Boolean))
  ) as string[];
  const sectionsList = studentsMeta.sectionOptions;
  const filtered = pagedStudents.filter((s) => {
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
        setActiveMenu: modals.setActiveMenu,
      }),
    [activeTab, locale, isReadOnlyView, canEditStudents, canDeleteStudents, canManageStudentAccounts, modals, operations, print]
  );

  const exportAllStudentsExcel = useCallback(async () => {
    const fullDataset = await loadStudentsDataset();
    if (fullDataset.length === 0) {
      modals.setError(locale === "en" ? "Could not load the full export dataset." : "تعذر تحميل بيانات التصدير الكاملة");
      return;
    }
    operations.exportExcel(fullDataset);
    modals.setSuccess(
      locale === "en"
        ? `${fullDataset.length} students exported successfully.`
        : `${fullDataset.length} طالب مصدر بنجاح (الكل)`,
    );
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [loadStudentsDataset, locale, modals, operations]);

  const printAllStudentCards = useCallback(async () => {
    const fullDataset = await loadStudentsDataset();
    if (fullDataset.length === 0) {
      modals.setError(locale === "en" ? "Could not load the students for printing." : "تعذر تحميل بيانات الطلاب للطباعة");
      return;
    }
    modals.setError("");
    print.printFilteredStudents(fullDataset);
  }, [loadStudentsDataset, locale, modals, print]);

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
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
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
                <div className="space-y-6">
                  {/* Tabs Section */}
                  <Card>
                    <CardContent className="p-6">
                      <StudentsTabs
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        studentsMeta={studentsMeta}
                      />
                    </CardContent>
                  </Card>

                  {/* Stats Section - Only show for active tab */}
                  {activeTab === "active" && (
                    <StudentsStats studentsMeta={studentsMeta} />
                  )}

                  {/* Main Content Section */}
                  <Card>
                    <CardContent className="p-6 space-y-6">
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
                        onAddStudent={() => {
                          modals.resetForm();
                          modals.setShowModal(true);
                        }}
                        onBulkImport={() => setShowBulkImport(true)}
                      />
                      <StudentsTable
                        pagedStudents={pagedStudents}
                        pagedLoading={pagedLoading}
                        pagedError={pagedError}
                        totalCount={totalCount}
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        activeTab={activeTab}
                        error={modals.error}
                        canManageStudentAccounts={canManageStudentAccounts}
                        getActions={buildGetActions}
                        openMenu={modals.openMenu}
                        onPageChange={setPage}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
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
          branches={branchesForForm}
          showBranchSelector={showBranchSelector && branchesForForm.length > 1}
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
        />
        <BulkImportModal
          show={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImportComplete={reload}
        />
      </div>
    </ProtectedRoute>
  );
}
