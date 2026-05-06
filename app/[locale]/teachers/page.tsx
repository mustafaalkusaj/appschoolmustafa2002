"use client";

// Teachers Management Page - Main orchestrator component

import { useTranslations } from "next-intl";
import { CheckCircle2, CircleOff } from "@/lib/icons";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRuntimeBranding } from "@/hooks/brand";
import {
  AccountCardModal,
  TeacherFormModal,
  TeacherImportModal,
  TeachersActions,
  TeachersFilters,
  TeachersStats,
  TeachersTable,
} from "./_components";
import { useTeachersData } from "./_hooks/useTeachersData";

export default function TeachersManagementPage() {
  const { profile } = useRole();
  const t = useTranslations("teachers");
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const currentSchoolId = profile?.role === "super_admin" ? schoolScope.selectedSchoolId : profile?.school_id ?? null;

  const {
    // State
    classes,
    sections,
    subjects,
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
    availableTeacherSections,
    showingModal,
    // Actions
    setSearchInput,
    setStatusFilter,
    setClassFilter,
    setSectionFilter,
    setSubjectFilter,
    setPage,
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
  } = useTeachersData(currentSchoolId, profile, schoolScope.scopeLoading, runtimeBranding.branchId);

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/teachers" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title={t("title")} 
            subtitle={t("table.description")}
            scope={schoolScope} 
            fixed 
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
              {/* Messages */}
              {success && (
                <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4 text-[var(--success)] flex items-center gap-3">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <p className="text-sm font-bold">{success}</p>
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[var(--danger)] flex items-center gap-3">
                  <CircleOff size={18} className="shrink-0" />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("title")}
                    description={t("emptyState.description")}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Actions & Stats */}
                  <div className="grid gap-8">
                    <TeachersActions
                      onAddTeacher={() => openCreateModal("teacher")}
                      onImport={() => setShowImportModal(true)}
                      onExport={() => void handleExportUsers()}
                      onDownloadTemplate={() => void downloadUsersTemplate()}
                    />
                    <TeachersStats stats={stats} />
                  </div>

                  {/* Main Table Container */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="space-y-8">
                      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6">
                        <div className="flex flex-col gap-2">
                          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                            {t("table.showing", { count: filteredUsers.length, total: totalCount || filteredUsers.length })}
                          </div>
                          <h2 className="text-xl font-black text-[var(--text-primary)]">{t("table.title")}</h2>
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
                    </div>
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modals */}
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
