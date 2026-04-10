"use client";

import { useTranslations } from "next-intl";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import { loadXLSX } from "@/lib/xlsx-loader";
import { Archive, Calendar, CreditCard, Download, Eye } from "lucide-react";

interface PaymentsArchiveProps {
  archives: PaymentArchive[];
  archiveNotice: string;
  archiveYear: string;
  setArchiveYear: (year: string) => void;
  archiving: boolean;
  paymentYears: number[];
  canDeletePayments: boolean;
  onArchive: () => void;
  onViewDetail: (archive: PaymentArchive) => void;
  onExportArchive: (archive: PaymentArchive) => void;
  archiveExportingId: string | null;
}

export function PaymentsArchive({
  archives,
  archiveNotice,
  archiveYear,
  setArchiveYear,
  archiving,
  paymentYears,
  canDeletePayments,
  onArchive,
  onViewDetail,
  onExportArchive,
  archiveExportingId,
}: PaymentsArchiveProps) {
  const t = useTranslations();
  const archiveYearOptions = Array.from(
    new Set([...paymentYears, ...archives.map((a) => a.archive_year), new Date().getFullYear()])
  ).sort((a, b) => b - a);

  const archivedYearsCount = archives.length;
  const totalArchivedAmount = archives.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  const latestArchive = archives[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Archive className="h-5 w-5 text-[var(--primary)]" />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">{t("payments.archive.title")}</h3>
      </div>

      {/* Notice */}
      <p className="text-sm text-[var(--text-muted)]">
        {t("payments.archive.description")}
      </p>

      {/* Error notice */}
      {archiveNotice && (
        <div className="bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] rounded-[var(--radius-md)] p-3 text-sm font-semibold">
          {archiveNotice}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
              <Calendar className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t("payments.archive.stats.archivedYears")}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{formatNumber(archivedYearsCount)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]">
              <CreditCard className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t("payments.archive.stats.totalArchivedAmount")}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {t("common.currency")} {formatNumber(totalArchivedAmount)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)]">
              <Archive className="h-5 w-5 text-[var(--info)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t("payments.archive.stats.latestArchivedYear")}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {latestArchive ? latestArchive.archive_year : "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Archive Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={archiveYear}
          onChange={(e) => setArchiveYear(e.target.value)}
          className="sm:w-48"
        >
          {archiveYearOptions.map((year) => (
            <option key={year} value={year}>
              {t("payments.archive.yearOption", { year })}
            </option>
          ))}
        </Select>
        {canDeletePayments && (
          <Button variant="primary" onClick={onArchive} loading={archiving}>
            <AppIcon token="🗃️" size={14} />
            {archiving ? t("payments.archive.archiving") : t("payments.archive.archiveAction")}
          </Button>
        )}
      </div>

      {/* Archive List */}
      {archives.length === 0 ? (
        <EmptyState
          title={t("payments.archive.emptyTitle")}
          description={t("payments.archive.emptyDescription")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archives.map((archive) => (
            <Card key={archive.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[var(--primary)]">
                  {archive.archive_year}
                </span>
                <span className="text-sm font-bold text-[var(--success)]">
                  {t("common.currency")} {formatNumber(archive.total_amount || 0)}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {t("payments.archive.cardSummary", {
                  students: archive.total_students ?? 0,
                  payments: archive.total_payments ?? 0,
                })}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t("payments.archive.archiveDate", {
                  date: formatDate(archive.archive_date),
                })}
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onViewDetail(archive)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4" />
                  {t("payments.archive.view")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportArchive(archive)}
                  disabled={archiveExportingId === archive.id}
                  loading={archiveExportingId === archive.id}
                  className="flex-1"
                >
                  <Download className="h-4 w-4" />
                  {t("payments.archive.export")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export async function exportArchiveExcel(
  archive: PaymentArchive,
  setExportingId: (id: string | null) => void
) {
  setExportingId(archive.id);
  try {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const archiveStudents = getArchiveStudents(archive);
    const archivePayments = getArchivePayments(archive);
    const studentsById = Object.fromEntries(archiveStudents.map((student) => [student.id, student]));

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        "السنة المؤرشفة": archive.archive_year,
        "عدد الطلاب": archive.total_students || archiveStudents.length,
        "عدد الدفعات": archive.total_payments || archivePayments.length,
        "إجمالي المبالغ": archive.total_amount || 0,
        "تاريخ الأرشفة": formatDate(archive.archive_date),
      },
    ]);

    XLSX.utils.book_append_sheet(wb, summarySheet, "الملخص");

    if (archiveStudents.length) {
      const studentsSheet = XLSX.utils.json_to_sheet(
        archiveStudents.map((student) => ({
          "اسم الطالب": student.full_name || "—",
          "الصف": student.class_name || "—",
          "الحالة": student.status || "—",
          "إجمالي الرسوم": student.total_fee || 0,
          "المدفوع": student.paid_fee || 0,
          "المتبقي": student.remaining_fee || 0,
          "الهاتف": student.phone || "",
        }))
      );
      XLSX.utils.book_append_sheet(wb, studentsSheet, "الطلاب");
    }

    if (archivePayments.length) {
      const paymentsSheet = XLSX.utils.json_to_sheet(
        archivePayments.map((payment) => ({
          "اسم الطالب": studentsById[payment.student_id]?.full_name || "—",
          "الصف": studentsById[payment.student_id]?.class_name || "—",
          "المبلغ": payment.amount || 0,
          "طريقة الدفع": getPaymentMethodLabel(payment.payment_method),
          "تاريخ الدفعة": formatDate(payment.created_at),
          "رقم الإيصال الإلكتروني": payment.receipt_number || "—",
          "رقم الإيصال الورقي": payment.manual_receipt_number || "—",
          "ملاحظات": payment.notes || "",
        }))
      );
      XLSX.utils.book_append_sheet(wb, paymentsSheet, "الدفعات");
    }

    await XLSX.writeFile(wb, `أرشيف_حسابات_${archive.archive_year}_${formatDate(new Date())}.xlsx`);
  } finally {
    setExportingId(null);
  }
}
