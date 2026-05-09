"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import { ArchiveCompareModal } from "./ArchiveCompareModal";
import { StudentArchiveSearch } from "./StudentArchiveSearch";
import { Archive, Calendar, CreditCard, Download, Eye, GitCompareArrows, History, GraduationCap } from "lucide-react";

interface PaymentsArchiveProps {
  archives: PaymentArchive[];
  archiveNotice: string;
  archiveYear: string;
  setArchiveYear: (year: string) => void;
  archiving: boolean;
  paymentYears: number[];
  canDeletePayments: boolean;
  onArchive: () => void;
  onViewDetail: (archive: PaymentArchive) => void | Promise<void>;
  onExportArchive: (archive: PaymentArchive) => void;
  archiveExportingId: string | null;
  onViewYear: (year: number) => void | Promise<void>;
  activeArchiveYear: number | null;
  currentStudents?: import("../_types").Student[];
  onPromoteYear?: () => void;
  canPromoteYear?: boolean;
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
  onViewYear,
  activeArchiveYear,
  currentStudents = [],
  onPromoteYear,
  canPromoteYear = false,
}: PaymentsArchiveProps) {
  const t = useTranslations();
  const [compareA, setCompareA] = useState<PaymentArchive | null>(null);
  const [compareB, setCompareB] = useState<PaymentArchive | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const handleCompareSelect = (archive: PaymentArchive) => {
    if (!compareA) {
      setCompareA(archive);
    } else if (!compareB && archive.id !== compareA.id) {
      setCompareB(archive);
      setShowCompare(true);
    } else {
      // Reset and start over
      setCompareA(archive);
      setCompareB(null);
      setShowCompare(false);
    }
  };

  const archiveYearOptions = Array.from(
    new Set([...paymentYears, ...archives.map((a) => a.archive_year), new Date().getFullYear()])
  ).sort((a, b) => b - a);

  const MAX_ARCHIVES = 5;
  const archivedYearsCount = archives.length;
  const totalArchivedAmount = archives.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  const latestArchive = archives[0] || null;
  const isAtLimit = archivedYearsCount >= MAX_ARCHIVES;

  return (
    <>
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

      {/* Archive Controls + limit indicator — same row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-semibold ${
          isAtLimit
            ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
            : archivedYearsCount >= MAX_ARCHIVES - 1
            ? "bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]"
            : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
        }`}>
          <Archive className="h-4 w-4" />
          <span>{archivedYearsCount} / {MAX_ARCHIVES} أرشيفات</span>
          {isAtLimit && <span>— وصلت الحد الأقصى</span>}
        </div>
        <Select
          value={archiveYear}
          onChange={(e) => setArchiveYear(e.target.value)}
          className="w-40"
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
        {canPromoteYear && onPromoteYear && (
          <Button
            variant="outline"
            onClick={onPromoteYear}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            title="ترحيل السنة الدراسية وتحديث الصفوف"
          >
            <GraduationCap className="h-4 w-4" />
            ترحيل السنة
          </Button>
        )}
      </div>

      {/* Cross-archive student search */}
      {archives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-bold text-[var(--text-primary)]">سجل الطالب عبر السنوات</span>
          </div>
          <StudentArchiveSearch
            archives={archives}
            currentStudents={currentStudents}
            currentYear={new Date().getFullYear()}
          />
        </div>
      )}

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
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant={activeArchiveYear === archive.archive_year ? "primary" : "outline"}
                  size="sm"
                  onClick={() => onViewYear(archive.archive_year)}
                  className="w-full justify-center"
                >
                  <Eye className="h-4 w-4" />
                  {activeArchiveYear === archive.archive_year
                    ? "تعرض هذه السنة الآن ✓"
                    : "عرض بيانات هذه السنة"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetail(archive)}
                    className="flex-1"
                  >
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
                {archives.length >= 2 && (
                  <Button
                    variant={compareA?.id === archive.id ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => handleCompareSelect(archive)}
                    className="w-full justify-center text-xs"
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    {compareA?.id === archive.id ? "✓ محدد للمقارنة — اختر سنة أخرى" : "مقارنة مع سنة أخرى"}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
      <ArchiveCompareModal
        archiveA={compareA}
        archiveB={compareB}
        show={showCompare}
        onClose={() => {
          setShowCompare(false);
          setCompareA(null);
          setCompareB(null);
        }}
      />
    </>
  );
}

export async function exportArchiveExcel(
  archive: PaymentArchive,
  setExportingId: (id: string | null) => void
) {
  setExportingId(archive.id);
  try {
    const archiveStudents = getArchiveStudents(archive);
    const archivePayments = getArchivePayments(archive);
    const studentsById = Object.fromEntries(archiveStudents.map((student) => [student.id, student]));

    const { downloadExcelExport } = await import("@/lib/excel-client");
    const title = `أرشيف حسابات ${archive.archive_year}`;

    const sheets = [];

    // Summary sheet
    sheets.push({
      name: "الملخص",
      title,
      columns: [
        { header: "السنة المؤرشفة",  key: "year",     width: 18 },
        { header: "عدد الطلاب",      key: "students", width: 14 },
        { header: "عدد الدفعات",     key: "payments", width: 14 },
        { header: "إجمالي المبالغ",  key: "total",    width: 20, numFmt: "#,##0", semanticColor: "paid" as const },
        { header: "تاريخ الأرشفة",   key: "date",     width: 18 },
      ],
      rows: [{
        year:     archive.archive_year,
        students: archive.total_students || archiveStudents.length,
        payments: archive.total_payments || archivePayments.length,
        total:    archive.total_amount || 0,
        date:     formatDate(archive.archive_date),
      }],
    });

    // Students sheet
    if (archiveStudents.length) {
      sheets.push({
        name: "الطلاب",
        title,
        columns: [
          { header: "اسم الطالب",    key: "name",      width: 28 },
          { header: "الصف",          key: "class",     width: 16 },
          { header: "الحالة",        key: "status",    width: 12 },
          { header: "إجمالي الرسوم", key: "total",     width: 18, numFmt: "#,##0" },
          { header: "المدفوع",       key: "paid",      width: 18, numFmt: "#,##0", semanticColor: "paid" as const },
          { header: "المتبقي",       key: "remaining", width: 18, numFmt: "#,##0", semanticColor: "remaining" as const },
          { header: "الهاتف",        key: "phone",     width: 16 },
        ],
        rows: archiveStudents.map((student) => ({
          name:      student.full_name || "—",
          class:     student.class_name || "—",
          status:    student.status || "—",
          total:     student.total_fee || 0,
          paid:      student.paid_fee || 0,
          remaining: student.remaining_fee || 0,
          phone:     student.phone || "",
        })),
      });
    }

    // Payments sheet
    if (archivePayments.length) {
      sheets.push({
        name: "الدفعات",
        title,
        columns: [
          { header: "اسم الطالب",              key: "name",           width: 28 },
          { header: "الصف",                    key: "class",          width: 16 },
          { header: "المبلغ",                  key: "amount",         width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
          { header: "طريقة الدفع",             key: "method",         width: 16 },
          { header: "تاريخ الدفعة",            key: "date",           width: 16 },
          { header: "رقم الإيصال الإلكتروني", key: "receipt",        width: 22 },
          { header: "رقم الإيصال الورقي",      key: "manual_receipt", width: 20 },
          { header: "ملاحظات",                 key: "notes",          width: 22 },
        ],
        rows: archivePayments.map((payment) => ({
          name:           studentsById[payment.student_id]?.full_name || "—",
          class:          studentsById[payment.student_id]?.class_name || "—",
          amount:         payment.amount || 0,
          method:         getPaymentMethodLabel(payment.payment_method),
          date:           formatDate(payment.created_at),
          receipt:        payment.receipt_number || "—",
          manual_receipt: payment.manual_receipt_number || "—",
          notes:          payment.notes || "",
        })),
      });
    }

    await downloadExcelExport({
      filename: `أرشيف_حسابات_${archive.archive_year}_${formatDate(new Date())}.xlsx`,
      sheets,
    });
  } finally {
    setExportingId(null);
  }
}
