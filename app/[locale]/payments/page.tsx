"use client";

import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Card } from "@/components/ui/card";

import {
  PaymentsStats,
  PaymentsFilters,
  PaymentsToolbar,
  PaymentsTable,
  PaymentsArchive,
  StudentDetailPanel,
  ArchiveDetailModal,
  PaymentModal,
} from "./_components";
import { usePaymentsPage } from "./_hooks";
import "./_components/payments.css";

export default function PaymentsPage() {
  const t = useTranslations();
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
    selectedStudent,
    showDetail,
    setShowDetail,
    openStudentDetail,
    handleExportExcel,
    printReceipt,
    handleArchiveExport,
    handleDeletePayment,
    handlePaymentSubmit,
    openPaymentForStudent,
  } = usePaymentsPage();

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

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
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
                  {/* Stats Section */}
                  <PaymentsStats summary={metaHook.summary} loading={metaHook.metaLoading} />

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
                      classes={metaHook.classes}
                      onExport={handleExportExcel}
                      onAddPayment={() => paymentOpsHook.openPaymentModal()}
                      exporting={exporting}
                      resolvedSchoolId={metaHook.summary.totalStudents > 0 || metaHook.classes.length > 0 ? "resolved" : null}
                      canAddPayments={canAddPayments}
                    />
                  </Card>

                  {/* Table Section */}
                  <Card className="p-6">
                    <div className="space-y-6">
                      {/* Section Header */}
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-[var(--border)] pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {t("payments.sections.currentLedgerTitle")}
                          </h2>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            {t("payments.sections.currentLedgerDescription")}
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
                        totalCount={studentsHook.totalCount}
                        loading={studentsHook.loading}
                      />

                      {/* Table */}
                      <PaymentsTable
                        students={studentsHook.students}
                        paymentCountsByStudent={studentsHook.paymentCountsByStudent}
                        loading={studentsHook.loading}
                        page={studentsHook.page}
                        totalPages={studentsHook.totalPages}
                        totalCount={studentsHook.totalCount}
                        onPageChange={studentsHook.setPage}
                        onStudentClick={openStudentDetail}
                        onAddPayment={paymentOpsHook.openPaymentModal}
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
                      onArchive={() =>
                        archiveOpsHook.archiveAccountsYear(metaHook.updateArchives, metaHook.refreshMeta)
                      }
                      onViewDetail={archiveOpsHook.openArchiveDetail}
                      onExportArchive={handleArchiveExport}
                      archiveExportingId={archiveOpsHook.archiveExportingId}
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
          payments={selectedStudent ? paymentOpsHook.paymentsByStudent[selectedStudent.id] ?? [] : []}
          paymentsLoading={paymentOpsHook.paymentsLoadingStudentId === selectedStudent?.id}
          paymentCount={selectedStudent ? studentsHook.paymentCountsByStudent[selectedStudent.id] ?? 0 : 0}
          show={showDetail}
          onClose={() => setShowDetail(false)}
          onAddPayment={openPaymentForStudent}
          onDeletePayment={(paymentId) => paymentOpsHook.setPendingDeletePaymentId(paymentId)}
          onPrintReceipt={printReceipt}
          canAddPayments={canAddPayments}
          canDeletePayments={canDeletePayments}
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
          totalPaymentCount={metaHook.totalPaymentCount}
          onClose={paymentOpsHook.closePaymentModal}
          onSubmit={handlePaymentSubmit}
          error={error}
          studentSearch={paymentOpsHook.studentSearch}
          setStudentSearch={paymentOpsHook.setStudentSearch}
          studentSearchResults={paymentOpsHook.studentSearchResults}
          studentSearchLoading={paymentOpsHook.studentSearchLoading}
          showDropdown={paymentOpsHook.showDropdown}
          setShowDropdown={paymentOpsHook.setShowDropdown}
          searchRef={paymentOpsHook.searchRef}
          onSelectStudent={paymentOpsHook.selectStudentForPayment}
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
          onClose={() => paymentOpsHook.setPendingDeletePaymentId(null)}
          onConfirm={async () => {
            const targetId = paymentOpsHook.pendingDeletePaymentId;
            paymentOpsHook.setPendingDeletePaymentId(null);
            if (targetId) {
              await handleDeletePayment(targetId);
            }
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
