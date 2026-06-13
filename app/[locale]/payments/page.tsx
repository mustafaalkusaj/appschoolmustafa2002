"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Wallet, Archive } from "@/lib/icons";
import { useRuntimeBranding } from "@/hooks/brand";
import { useCurrency } from "@/hooks/useCurrency";
import Link from "next/link";

import {
  PaymentsStats,
  PaymentsFilters,
  PaymentsToolbar,
  PaymentsTable,
  StudentDetailPanel,
  ArchiveDetailModal,
  PaymentModal,
  ArchiveModeBanner,
} from "./_components";
import { PaymentExportFieldsModal, type PaymentExportFieldKey } from "./_components/PaymentExportFieldsModal";
import { AcademicYearModal } from "../students/_components/AcademicYearModal";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { usePaymentsPage } from "./_hooks";
import { getArchivePayments } from "./_hooks/useArchiveOperations";
import "./_components/payments.css";

export default function PaymentsPage() {
  const t = useTranslations();
  const runtimeBranding = useRuntimeBranding();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const [pendingArchiveConfirm, setPendingArchiveConfirm] = React.useState(false);
  const [showPromoteYearModal, setShowPromoteYearModal] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
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
    minFee,
    setMinFee,
    maxFee,
    setMaxFee,
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

  const currency = useCurrency();

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
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/payments" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("payments.title")}
            subtitle={t("payments.subtitle")}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              <AnimatePresence>
                {success && (
                  <motion.div key="success" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm">
                    {success}
                  </motion.div>
                )}
                {error && (
                  <motion.div key="error" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("payments.emptyState.title")}
                    description={t("payments.emptyState.description")}
                  />
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Hero Banner */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                  >
                    <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                    <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                          {locale === "en" ? "Administration · Payments" : "لوحة الإدارة · إيرادات الأجور الدراسية"}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          {t("payments.title")}
                        </h1>
                        <p className="text-white/70 text-sm">{t("payments.subtitle")}</p>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <Wallet size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

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
                    currency={currency}
                  />

                  {/* Filters Section */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
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
                        : () => setShowExportModal(true)}
                      onAddPayment={() => paymentOpsHook.openPaymentModal()}
                      exporting={exporting}
                      resolvedSchoolId={effectiveSummary.totalStudents > 0 || effectiveClasses.length > 0}
                      canAddPayments={isArchiveMode ? false : canAddPayments}
                      minFee={minFee}
                      setMinFee={setMinFee}
                      maxFee={maxFee}
                      setMaxFee={setMaxFee}
                      locale={locale}
                    />
                  </div>

                  {/* Table Section */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
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
                        currency={currency}
                      />
                    </div>
                  </div>

                  {/* Archive Section — moved to Settings */}
                  <Link
                    href={`/${locale}/dashboard/settings?tab=archive`}
                    className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-5 hover:bg-[var(--surface-strong)] transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center flex-shrink-0">
                      <Archive className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)]">الأرشيف السنوي</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">تم نقل نظام الأرشفة إلى صفحة الإعدادات — اضغط للانتقال</p>
                    </div>
                    <span className="text-[var(--primary)] text-xs font-bold group-hover:underline">الإعدادات ←</span>
                  </Link>
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
          currency={currency}
        />

        {/* Archive Detail Modal */}
        <ArchiveDetailModal
          archive={archiveOpsHook.selectedArchive}
          show={archiveOpsHook.showArchiveDetail}
          onClose={archiveOpsHook.closeArchiveDetail}
          archiveExportingId={archiveOpsHook.archiveExportingId}
          onExport={handleArchiveExport}
          canEdit={canDeletePayments}
          saving={archiveOpsHook.savingArchive}
          onSave={(data) =>
            archiveOpsHook.saveArchiveEdits(
              archiveOpsHook.selectedArchive!,
              data,
              (updated) => metaHook.updateArchives(updated, false)
            )
          }
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

        {/* Payment Export Fields Modal */}
        <PaymentExportFieldsModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          exporting={exporting}
          locale={locale}
          onExport={async (fields: Set<PaymentExportFieldKey>) => {
            try {
              const { downloadExcelExport } = await import("@/lib/excel-client");
              const isEnLocal = locale === "en";

              const statusLabel = (s: string | null) => {
                if (!s) return "";
                const map: Record<string, string> = { paid: isEnLocal ? "Paid" : "مسدد", partial: isEnLocal ? "Partial" : "جزئي", unpaid: isEnLocal ? "Unpaid" : "غير مسدد" };
                return map[s] ?? s;
              };

              const allColumns: { header: string; key: string; width: number; fieldKey: PaymentExportFieldKey; numFmt?: string; semanticColor?: string }[] = [
                { header: isEnLocal ? "Student Name" : "اسم الطالب", key: "fullName", width: 32, fieldKey: "fullName" },
                { header: isEnLocal ? "Class" : "الصف", key: "className", width: 20, fieldKey: "className" },
                { header: isEnLocal ? "Section" : "الشعبة", key: "section", width: 12, fieldKey: "section" },
                { header: isEnLocal ? "Phone" : "رقم الهاتف", key: "phone", width: 18, fieldKey: "phone" },
                { header: isEnLocal ? "Address" : "العنوان", key: "address", width: 24, fieldKey: "address" },
                { header: isEnLocal ? "Total Fee" : "المبلغ الكلي", key: "totalFee", width: 18, fieldKey: "totalFee", numFmt: "#,##0" },
                { header: isEnLocal ? "Paid" : "المبلغ المدفوع", key: "paidFee", width: 18, fieldKey: "paidFee", numFmt: "#,##0", semanticColor: "paid" },
                { header: isEnLocal ? "Discount" : "التخفيض", key: "discount", width: 15, fieldKey: "discount", numFmt: "#,##0", semanticColor: "discount" },
                { header: isEnLocal ? "Remaining" : "المبلغ المتبقي", key: "remainingFee", width: 18, fieldKey: "remainingFee", numFmt: "#,##0", semanticColor: "remaining" },
                { header: isEnLocal ? "Status" : "حالة الدفع", key: "status", width: 14, fieldKey: "status" },
              ];

              const columns = allColumns
                .filter(c => fields.has(c.fieldKey))
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(({ fieldKey: _fk, ...rest }) => rest as { header: string; key: string; width: number; numFmt?: string; semanticColor?: "remaining" | "paid" | "discount" });

              await downloadExcelExport({
                filename: isEnLocal ? "payments.xlsx" : "فواتير_الطلاب.xlsx",
                sheets: [{
                  name: isEnLocal ? "Payments" : "فواتير أقساط الطلاب",
                  title: isEnLocal ? "Student Payments" : "فواتير أقساط الطلاب",
                  columns,
                  rows: effectiveStudents.map((s: Record<string, unknown>) => ({
                    fullName: (s.full_name as string) ?? "",
                    className: (s.class_name as string) ?? "",
                    section: (s.section as string) ?? "",
                    phone: (s.phone as string) ?? "",
                    address: (s.address as string) ?? "",
                    totalFee: (s.total_fee as number) ?? 0,
                    paidFee: (s.paid_fee as number) ?? 0,
                    discount: (s.discount_value as number) ?? 0,
                    remainingFee: (s.remaining_fee as number) ?? 0,
                    status: statusLabel((s.status as string) ?? null),
                  })),
                  totalsLabel: isEnLocal ? `Total (${effectiveStudents.length} students)` : `المجموع (${effectiveStudents.length} طالب)`,
                }],
              });
              setShowExportModal(false);
            } catch {
              // export error handled silently
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
