"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentWithFees, StudentActionItem } from "./_types";
import { useStudentsData } from "./_hooks/useStudentsData";
import { useStudentsModals } from "./_hooks/useStudentsModals";
import { useStudentsOperations } from "./_hooks/useStudentsOperations";
import { useStudentsPrint } from "./_hooks/useStudentsPrint";
import { getStudentActions } from "./_utils/getStudentActions";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRuntimeBranding } from "@/hooks/brand";
import { getLocaleFromPath } from "@/lib/locale-routing";
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
import { ImportExcelModal } from "./_components/ImportExcelModal";
import { AccountCardModal } from "./_components/AccountCardModal";

export default function StudentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const { profile, can, isReadOnlyPath } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();

  const canAddStudents = can("add_students");
  const canEditStudents = can("edit_students");
  const canDeleteStudents = can("delete_students");
  const canManageStudents = canAddStudents || canEditStudents || canDeleteStudents;
  const canManageStudentAccounts = profile?.role === "super_admin" || profile?.role === "admin";
  const isReadOnlyView = isReadOnlyPath("/students") || !canManageStudents;

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
  });

  const modals = useStudentsModals();

  const operations = useStudentsOperations({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    canEditStudents,
    canDeleteStudents,
    canManageStudentAccounts,
    activeTab,
    setActiveTab,
    locale,
    runtimeBranding,
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
      setShowImport: modals.setShowImport,
      setAddStep: modals.setAddStep,
      setForm: modals.setForm,
      setEditForm: modals.setEditForm,
      setAccountCard: modals.setAccountCard,
      setSelectedStudent: modals.setSelectedStudent,
      setActiveMenu: modals.setActiveMenu,
      form: modals.form,
      editForm: modals.editForm,
      selectedStudent: modals.selectedStudent,
      fileRef: modals.fileRef,
      openEdit: modals.openEdit,
    },
    reload,
  });

  const print = useStudentsPrint({
    locale,
    runtimeBranding,
    setError: modals.setError,
  });

  // Computed values
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

  // Get actions for dropdown menu
  const buildGetActions = useCallback(
    (s: StudentWithFees): StudentActionItem[] =>
      getStudentActions({
        student: s,
        activeTab,
        isReadOnlyView,
        canEditStudents,
        canDeleteStudents,
        canManageStudentAccounts,
        onPrint: print.handlePrint,
        onChangeStatus: operations.changeStatus,
        onOpenEdit: modals.openEdit,
        onOpenCredentials: operations.openStudentCredentialsCard,
        onInitDelete: (student) => {
          modals.setSelectedStudent(student);
          modals.setShowDeleteConfirm(true);
        },
        setActiveMenu: modals.setActiveMenu,
      }),
    [
      activeTab,
      isReadOnlyView,
      canEditStudents,
      canDeleteStudents,
      canManageStudentAccounts,
      modals,
      operations,
      print,
    ]
  );

  const exportAllStudentsExcel = useCallback(async () => {
    const fullDataset = await loadStudentsDataset();
    if (fullDataset.length === 0) {
      modals.setError("تعذر تحميل بيانات التصدير الكاملة");
      return;
    }
    operations.exportExcel(fullDataset);
    modals.setSuccess(`${fullDataset.length} طالب مصدر بنجاح (الكل)`);
    setTimeout(() => modals.setSuccess(""), 3000);
  }, [loadStudentsDataset, modals, operations]);

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <>
        <StudentsPageStyles />
        <div className="layout">
          <AppSidebar currentPath="/students" showFloatingToggle />
          <div className="main">
            <div className="content app-shell-content">
              {modals.success && (
                <div className="ok">
                  <div>{modals.success}</div>
                  {modals.accountCard && (
                    <div style={{ marginTop: ".45rem", display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
                      <button
                        className="bc"
                        style={{ padding: ".45rem .8rem" }}
                        onClick={() => print.openAccountCardWindow(modals.accountCard!, true)}
                      >
                        طباعة بيانات الدخول
                      </button>
                      <button
                        className="bc"
                        style={{ padding: ".45rem .8rem" }}
                        onClick={() => print.copyAccountCardCredentials(modals.accountCard, modals.setSuccess)}
                      >
                        نسخ اسم المستخدم/المرور
                      </button>
                    </div>
                  )}
                </div>
              )}
              {modals.error && <div className="err">{modals.error}</div>}
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />
              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="بيانات الطلاب"
                  description="لن يتم تحميل الطلاب أو الأقساط أو عمليات الإضافة قبل اختيار مدرسة صريحة لهذا القسم."
                />
              ) : (
                <>
                  <StudentsTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    studentsMeta={studentsMeta}
                  />
                  {activeTab === "active" && <StudentsStats studentsMeta={studentsMeta} />}
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
                    onPrintAllCards={() => {}}
                    onAddStudent={() => modals.setShowModal(true)}
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
                </>
              )}
            </div>
          </div>
        </div>

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
            modals.setAddStep(1);
          }}
          onSubmit={operations.handleAdd}
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
          onPrint={print.openAccountCardWindow}
          onCopy={() => print.copyAccountCardCredentials(modals.accountCard, modals.setSuccess)}
          onClose={() => modals.setAccountCard(null)}
        />
      </>
    </ProtectedRoute>
  );
}
