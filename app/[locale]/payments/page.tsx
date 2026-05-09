"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Card } from "@/components/ui/card";
import { useRuntimeBranding } from "@/hooks/brand";

import {
  PaymentsStats,
  PaymentsFilters,
  PaymentsToolbar,
  PaymentsTable,
  PaymentsArchive,
  StudentDetailPanel,
  ArchiveDetailModal,
  PaymentModal,
  ArchiveModeBanner,
} from "./_components";
import { AcademicYearModal } from "../students/_components/AcademicYearModal";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { usePaymentsPage } from "./_hooks";
import { getArchivePayments } from "./_hooks/useArchiveOperations";
import "./_components/payments.css";

export default function PaymentsPage() {
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const [pendingArchiveConfirm, setPendingArchiveConfirm] = React.useState(false);
  const [showPromoteYearModal, setShowPromoteYearModal] = React.useState(false);
  const {
    canAddPayments,
    canDeletePayments,
    schoolScope,
    success,
    error,
    searchInput,
    setSearchInput,
    exporting,
    quickFilter,
    setQuickFilter,
    filterClass,
    setFilterClass,
    filterSort,
    setFilterSort,
    filterDir,
    setFilterDir,
    metaHook,
    studentsHook,
    paymentOpsHook,
    archiveOpsHook,
    isArchiveMode,
    activeArchiveYear,
    activeArchive,
    activateArchiveYear,
    exitArchiveMode,
    effectiveSummary,
    effectiveStudents,
    effectivePaymentCounts,
    effectiveLoading,
    effectiveTotalCount,
    effectiveTotalPages,
    effectiveClasses,
    selectedStudent,
    showDetail,
    setShowDetail,
    openStudentDetail,
    openArchiveStudentDetail,
    handleExportExcel,
    printReceipt,
    printStatement,
    handleArchiveExport,
    handleDeletePayment,
    handlePaymentSubmit,
    openPaymentForStudent,
  } = usePaymentsPage({
    currentBranchId: runtimeBranding.branchId,
  });

  // Payments shown in detail panel — archive mode uses snapshot, otherwise live data
  const detailPayments = React.useMemo(() => {
    if (!selectedStudent) return [];
    if (isArchiveMode && activeArchive) {
      return getArchivePayments(activeArchive).filter((p) => p.student_id === selectedStudent.id);
    }
    return paymentOpsHook.paymentsByStudent[selectedStudent.id] ?? [];
  }, [isArchiveMode, activeArchive, selectedStudent, paymentOpsHook.paymentsByStudent]);

  // Calculate actual paid fee from payment records
  const actualPaidFee = paymentOpsHook.payStudent
    ? paymentOpsHook.paymentsByStudent[paymentOpsHook.payStudent.id]?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ?? 0
    : undefined;

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--bg-base)]">
        <AppSidebar currentPath="/payments" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("payments.title")}
            subtitle={t("payments.subtitle")}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Success/Error Messages */}
              {success && (
                <div className="bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] rounded-[var(--radius-lg)] p-4 font-semibold border border-[color-mix(in_srgb,var(--success)_20%,transparent)]">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] rounded-[var(--radius-lg)] p-4 font-semibold border border-[color-mix(in_srgb,var(--danger)_20%,transparent)]">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <Card className="p-6">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("payments.emptyState.title")}
                    description={t("payments.emptyState.description")}
                  />
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Archive Mode Banner */}
                  {isArchiveMode && activeArchive && (
                    <ArchiveModeBanner
                      year={activeArchive.archive_year}
                      archiveDate={activeArchive.archive_date}
                      onExit={exitArchiveMode}
                    />
                  )}

                  {/* Stats Section */}
                  <PaymentsStats
                    summary={effectiveSummary}
                    loading={isArchiveMode ? false : metaHook.metaLoading}
                  />

                  {/* Filters Section */}
                  <Card className="p-6">
                    <PaymentsFilters
                      quickFilter={quickFilter}
                      setQuickFilter={setQuickFilter}
                      filterClass={filterClass}
                      setFilterClass={setFilterClass}
                      filterSort={filterSort}
                      setFilterSort={setFilterSort}
                      filterDir={filterDir}
                      setFilterDir={setFilterDir}
                      classes={effectiveClasses}
                      onExport={isArchiveMode && activeArchive
                        ? () => handleArchiveExport(activeArchive)
                        : handleExportExcel}
                      onAddPayment={() => paymentOpsHook.openPaymentModal()}
                      exporting={exporting}
                      resolvedSchoolId={effectiveSummary.totalStudents > 0 || effectiveClasses.length > 0}
                      canAddPayments={isArchiveMode ? false : canAddPayments}
                    />
                  </Card>

                  {/* Table Section */}
                  <Card className="p-6">
                    <div className="space-y-6">
                      {/* Section Header */}
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-[var(--border)] pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {isArchiveMode
                              ? `أرشيف سنة ${activeArchiveYear}`
                              : t("payments.sections.currentLedgerTitle")}
                          </h2>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            {isArchiveMode
                              ? `${effectiveTotalCount} طالب · للقراءة فقط`
                              : t("payments.sections.currentLedgerDescription")}
                          </p>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                          {schoolScope.selectedSchool?.name || t("payments.sections.activeRecords")}
                        </div>
                      </div>

                      {/* Toolbar */}
                      <PaymentsToolbar
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        totalCount={effectiveTotalCount}
                        loading={effectiveLoading}
                      />

                      {/* Table */}
                      <PaymentsTable
                        students={effectiveStudents}
                        paymentCountsByStudent={effectivePaymentCounts}
                        loading={effectiveLoading}
                        page={studentsHook.page}
                        totalPages={effectiveTotalPages}
                        totalCount={effectiveTotalCount}
                        onPageChange={studentsHook.setPage}
                        onStudentClick={isArchiveMode ? openArchiveStudentDetail : openStudentDetail}
                        onAddPayment={isArchiveMode ? undefined : paymentOpsHook.openPaymentModal}
                      />
                    </div>
                  </Card>

                  {/* Archive Section */}
                  <Card className="p-6">
                    <PaymentsArchive
                      archives={metaHook.archives}
                      archiveNotice={metaHook.archiveNotice}
                      archiveYear={archiveOpsHook.archiveYear}
                      setArchiveYear={archiveOpsHook.setArchiveYear}
                      archiving={archiveOpsHook.archiving}
                      paymentYears={metaHook.paymentYears}
                      canDeletePayments={canDeletePayments}
                      onArchive={() => setPendingArchiveConfirm(true)}
                      onViewDetail={archiveOpsHook.openArchiveDetail}
                      onExportArchive={handleArchiveExport}
                      archiveExportingId={archiveOpsHook.archiveExportingId}
                      onViewYear={activateArchiveYear}
                      activeArchiveYear={activeArchiveYear}
                      currentStudents={studentsHook.students}
                      canPromoteYear={canDeletePayments}
                      onPromoteYear={() => setShowPromoteYearModal(true)}
                    />
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Student Detail Panel (Drawer) */}
        <StudentDetailPanel
          student={selectedStudent}
          payments={detailPayments}
          paymentsLoading={!isArchiveMode && paymentOpsHook.paymentsLoadingStudentId === selectedStudent?.id}
          paymentCount={selectedStudent ? (effectivePaymentCounts[selectedStudent.id] ?? 0) : 0}
          show={showDetail}
          onClose={() => setShowDetail(false)}
          onAddPayment={openPaymentForStudent}
          onDeletePayment={(paymentId) => paymentOpsHook.setPendingDeletePaymentId(paymentId)}
          onPrintReceipt={printReceipt}
          onPrintStatement={(student) => printStatement(student, detailPayments)}
          canAddPayments={isArchiveMode ? false : canAddPayments}
          canDeletePayments={isArchiveMode ? false : canDeletePayments}
        />

        {/* Archive Detail Modal */}
        <ArchiveDetailModal
          archive={archiveOpsHook.selectedArchive}
          show={archiveOpsHook.showArchiveDetail}
          onClose={archiveOpsHook.closeArchiveDetail}
          archiveExportingId={archiveOpsHook.archiveExportingId}
          onExport={handleArchiveExport}
        />

        {/* Payment Modal */}
        <PaymentModal
          show={paymentOpsHook.showPayModal}
          payStudent={paymentOpsHook.payStudent}
          payForm={paymentOpsHook.payForm}
          setPayForm={paymentOpsHook.setPayForm}
          saving={paymentOpsHook.saving}
          onClose={paymentOpsHook.closePaymentModal}
          onSubmit={handlePaymentSubmit}
          error={error}
          actualPaidFee={actualPaidFee}
          studentSearch={paymentOpsHook.studentSearch}
          setStudentSearch={paymentOpsHook.setStudentSearch}
          studentSearchResults={paymentOpsHook.studentSearchResults}
          studentSearchLoading={paymentOpsHook.studentSearchLoading}
          showDropdown={paymentOpsHook.showDropdown}
          setShowDropdown={paymentOpsHook.setShowDropdown}
          searchRef={paymentOpsHook.searchRef}
          onSelectStudent={paymentOpsHook.selectStudentForPayment}
        />

        {/* Archive Confirmation Dialog */}
        <ConfirmDialog
          open={pendingArchiveConfirm}
          title={`أرشفة حسابات سنة ${archiveOpsHook.archiveYear || "—"}؟`}
          description="ستُحفظ دفعات السنة في أرشيف دائم وسيُرحَّل الطلاب للصف التالي. هذه العملية لا يمكن التراجع عنها."
          confirmLabel="أرشفة وترحيل"
          tone="primary"
          busy={archiveOpsHook.archiving}
          onClose={() => setPendingArchiveConfirm(false)}
          onConfirm={() => {
            setPendingArchiveConfirm(false);
            void archiveOpsHook.archiveAccountsYear(metaHook.updateArchives, metaHook.refreshMeta);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={Boolean(paymentOpsHook.pendingDeletePaymentId)}
          title={t("payments.dialogs.deletePaymentTitle")}
          description={
            selectedStudent
              ? t("payments.dialogs.deletePaymentDescriptionWithStudent", {
                  student: selectedStudent.full_name,
                })
              : t("payments.dialogs.deletePaymentDescription")
          }
          confirmLabel={t("payments.dialogs.deletePaymentConfirm")}
          cancelLabel={t("common.cancel")}
          tone="danger"
          onClose={() => {
            paymentOpsHook.setPendingDeletePaymentId(null);
          }}
          onConfirm={async () => {
            const targetId = paymentOpsHook.pendingDeletePaymentId;
            paymentOpsHook.setPendingDeletePaymentId(null);
            if (targetId) {
              await handleDeletePayment(targetId);
            }
          }}
        />

        {/* Promote Year Modal */}
        <AcademicYearModal
          isOpen={showPromoteYearModal}
          schoolId={schoolScope.selectedSchoolId ?? ""}
          branchId={runtimeBranding.branchId ?? null}
          onClose={() => setShowPromoteYearModal(false)}
          fetchWithAuth={(url, options) => fetchJsonWithAuthorizedSession(url, options)}
        />
      </div>
    </ProtectedRoute>
  );
}
