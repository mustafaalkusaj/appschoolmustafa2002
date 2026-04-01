"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";

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
      <div className="payments-page">
        <div className="layout">
          <AppSidebar currentPath="/payments" showFloatingToggle />
          <div className="main">
            <div className="content app-shell-content">
              {success && <div className="ok">{success}</div>}
              {error && <div className="err">{error}</div>}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="فواتير الطلاب"
                  description="لن يتم تحميل الطلاب أو الدفعات أو الأرشيف قبل اختيار مدرسة واضحة لهذا القسم."
                />
              ) : (
                <>
                  <PaymentsStats summary={metaHook.summary} loading={metaHook.metaLoading} />

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

                  <PaymentsToolbar
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    totalCount={studentsHook.totalCount}
                    loading={studentsHook.loading}
                  />

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
                </>
              )}
            </div>
          </div>
        </div>

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

        <ArchiveDetailModal
          archive={archiveOpsHook.selectedArchive}
          show={archiveOpsHook.showArchiveDetail}
          onClose={archiveOpsHook.closeArchiveDetail}
          archiveExportingId={archiveOpsHook.archiveExportingId}
          onExport={handleArchiveExport}
        />

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

        <ConfirmDialog
          open={Boolean(paymentOpsHook.pendingDeletePaymentId)}
          title="حذف الدفعة"
          description={
            selectedStudent
              ? `سيتم حذف دفعة الطالب ${selectedStudent.full_name} وإعادة احتساب الرصيد المتبقي.`
              : "سيتم حذف الدفعة المحددة وإعادة احتساب الرصيد المتبقي."
          }
          confirmLabel="نعم، احذف الدفعة"
          cancelLabel="إلغاء"
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
