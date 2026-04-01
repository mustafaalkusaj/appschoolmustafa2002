"use client";

// Teachers Management Page - Main orchestrator component

import { CheckCircle2, CircleOff } from "@/lib/icons";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useTeachersData } from "./_hooks/useTeachersData";
import {
  TeachersActions,
  TeachersStats,
  TeachersFilters,
  TeachersTable,
  TeacherFormModal,
  TeacherImportModal,
  AccountCardModal,
} from "./_components";

export default function TeachersManagementPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const currentSchoolId = profile?.role === "super_admin" ? schoolScope.selectedSchoolId : profile?.school_id ?? null;

  const {
    // State
    classes,
    sections,
    subjects,
    users: _users,
    loading,
    saving,
    togglingId,
    cardLoadingId,
    searchInput,
    query,
    statusFilter,
    classFilter,
    sectionFilter,
    subjectFilter,
    page,
    totalCount,
    success,
    error,
    fieldErrors,
    showCreateModal: _showCreateModal,
    editingUser,
    accountCard,
    revealedPassword,
    showImportModal,
    importing,
    importPreview,
    importPayloads,
    importErrors,
    form,
    // Computed
    filteredUsers,
    stats,
    availableStudentSections: _availableStudentSections,
    availableTeacherSections,
    showingModal,
    teacherAssignment: _teacherAssignment,
    teacherSections: _teacherSections,
    // Actions
    setSearchInput,
    setStatusFilter,
    setClassFilter,
    setSectionFilter,
    setSubjectFilter,
    setPage,
    setSuccess: _setSuccess,
    setError: _setError,
    openCreateModal,
    openEditModal,
    closeModal,
    closeAccountCard,
    closeImportModal,
    setShowImportModal,
    updateTeacherAssignment,
    updateFormField,
    updateStudentField,
    resetTableFilters,
    openAccountCardForUser,
    handleResetTemporaryPassword,
    handleSubmit,
    handleToggle,
    handleDelete,
    handleExportUsers,
    handleImportFileChange,
    handleImportUsers,
    downloadUsersTemplate,
    openPrintableWindow,
    handleCopyCredentials,
    fetchUsers,
  } = useTeachersData(currentSchoolId, profile, schoolScope.scopeLoading);

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="layout">
        <AppSidebar currentPath="/teachers" showFloatingToggle />

        <div className="main">
          <div className="content app-shell-content space-y-5">
            {/* Success message */}
            {success ? (
              <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(47,182,122,0.18)] bg-[rgba(47,182,122,0.1)] px-4 py-3 text-[var(--success)]">
                <CheckCircle2 size={18} className="mt-1 shrink-0" />
                <p className="text-sm font-bold leading-7">{success}</p>
              </div>
            ) : null}

            {/* Error message */}
            {error ? (
              <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.1)] px-4 py-3 text-[var(--danger)]">
                <CircleOff size={18} className="mt-1 shrink-0" />
                <p className="text-sm font-bold leading-7">{error}</p>
              </div>
            ) : null}

            <SchoolScopeBanner scope={schoolScope} showSelector={false} />

            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState
                scope={schoolScope}
                title="إدارة حسابات الأساتذة"
                description="يجب اختيار مدرسة صريحة أولاً قبل إنشاء أو تعديل حسابات الأساتذة."
              />
            ) : (
              <>
                {/* Actions section */}
                <TeachersActions
                  onAddTeacher={() => openCreateModal("teacher")}
                  onImport={() => setShowImportModal(true)}
                  onExport={() => void handleExportUsers()}
                  onDownloadTemplate={() => void downloadUsersTemplate()}
                />

                {/* Stats section */}
                <TeachersStats stats={stats} />

                {/* Table section */}
                <section className="ui-surface rounded-[30px] p-5">
                  <div className="mb-5 flex flex-col gap-4 border-b border-[var(--border)] pb-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-black text-[var(--text-secondary)]">
                        <span>يعرض {filteredUsers.length} في هذه الصفحة من أصل {totalCount || filteredUsers.length} أستاذ مطابق</span>
                      </div>
                      <h2 className="text-xl font-black text-[var(--text-primary)]">حسابات الأساتذة الحالية</h2>
                      <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                        راجع حسابات الأساتذة الحالية وابحث بسرعة ثم نفّذ الإجراء المناسب من نفس الجدول.
                      </p>
                    </div>
                  </div>

                  <TeachersFilters
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    classFilter={classFilter}
                    setClassFilter={setClassFilter}
                    sectionFilter={sectionFilter}
                    setSectionFilter={setSectionFilter}
                    subjectFilter={subjectFilter}
                    setSubjectFilter={setSubjectFilter}
                    classes={classes}
                    sections={sections}
                    subjects={subjects}
                    availableTeacherSections={availableTeacherSections}
                    onResetFilters={resetTableFilters}
                    onRefresh={() => void fetchUsers()}
                    onExport={() => void handleExportUsers()}
                    onImport={() => setShowImportModal(true)}
                    loading={loading}
                    query={query}
                    normalizedClassFilter={classFilter.trim()}
                    normalizedSectionFilter={sectionFilter.trim()}
                    normalizedSubjectFilter={subjectFilter.trim()}
                  />

                  <TeachersTable
                    users={filteredUsers}
                    loading={loading}
                    totalCount={totalCount}
                    page={page}
                    pageSize={25}
                    onPageChange={setPage}
                    togglingId={togglingId}
                    cardLoadingId={cardLoadingId}
                    onEdit={openEditModal}
                    onOpenAccountCard={(user) => void openAccountCardForUser(user)}
                    onResetPassword={(user) => void handleResetTemporaryPassword(user)}
                    onToggle={(user) => void handleToggle(user)}
                    onDelete={(user) => void handleDelete(user)}
                  />
                </section>
              </>
          )}
          </div>
        </div>

        {/* Form Modal */}
        <TeacherFormModal
          showing={showingModal}
          editingUser={editingUser}
          form={form}
          fieldErrors={fieldErrors}
          saving={saving}
          classes={classes}
          subjects={subjects}
          sections={sections}
          onClose={closeModal}
          onSubmit={handleSubmit}
          updateTeacherAssignment={updateTeacherAssignment}
          updateFormField={updateFormField}
          updateStudentField={updateStudentField}
        />

        {/* Import Modal */}
        <TeacherImportModal
          showing={showImportModal}
          importing={importing}
          importPreview={importPreview}
          importPayloads={importPayloads}
          importErrors={importErrors}
          onClose={closeImportModal}
          onImport={() => void handleImportUsers()}
          onFileChange={(e) => void handleImportFileChange(e)}
          onDownloadTemplate={() => void downloadUsersTemplate()}
        />

        {/* Account Card Modal */}
        <AccountCardModal
          accountCard={accountCard}
          revealedPassword={revealedPassword}
          onClose={closeAccountCard}
          onCopy={() => void handleCopyCredentials()}
          onPrint={openPrintableWindow}
        />
      </div>
    </ProtectedRoute>
  );
}
