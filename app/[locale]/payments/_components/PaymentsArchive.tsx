"use client";

import { useTranslations } from "next-intl";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Fill, Borders } from "exceljs";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
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
    const ExcelJSModule = await import("exceljs");
    const ExcelJS = (ExcelJSModule.default ?? ExcelJSModule) as typeof import("exceljs");

    const wb = new ExcelJS.Workbook();
    wb.creator = "School System";
    wb.created = new Date();

    const archiveStudents = getArchiveStudents(archive);
    const archivePayments = getArchivePayments(archive);

    // ═══════════════════════════════════════════════
    // ورقة 1: فواتير الأقساط (مُنسَّقة A4)
    // ═══════════════════════════════════════════════
    const ws = wb.addWorksheet("فواتير الأقساط", {
      views: [{ state: "frozen", xSplit: 0, ySplit: 4, rightToLeft: true }],
      pageSetup: {
        paperSize: 9,           // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      headerFooter: {
        oddFooter: `&C&"Arial,Regular"&9فواتير أقساط الطلاب — ${archive.archive_year}&R&Pصفحة `,
      },
    });

    ws.columns = [
      { key: "name",      width: 32 },
      { key: "class",     width: 20 },
      { key: "total",     width: 18 },
      { key: "paid",      width: 18 },
      { key: "discount",  width: 15 },
      { key: "remaining", width: 18 },
    ];

    const LAST_COL = "F";
    const NUM_FMT  = '#,##0 "د.ع"';

    const solidFill = (argb: string): Fill =>
      ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    const thinBorder = (color = "FFE2E8F0"): Partial<Borders> => ({
      bottom: { style: "thin", color: { argb: color } },
      right:  { style: "thin", color: { argb: color } },
      left:   { style: "thin", color: { argb: color } },
    });

    // ─── صف 1: العنوان ───────────────────────────
    ws.mergeCells(`A1:${LAST_COL}1`);
    const r1 = ws.getCell("A1");
    r1.value     = "فواتير أقساط الطلاب";
    r1.font      = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    r1.fill      = solidFill("FF1B3A6B");
    r1.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(1).height = 38;

    // ─── صف 2: التاريخ والسنة ────────────────────
    ws.mergeCells(`A2:${LAST_COL}2`);
    const r2 = ws.getCell("A2");
    r2.value     = `تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ")}   |   السنة الدراسية: ${archive.archive_year}`;
    r2.font      = { name: "Arial", size: 11, color: { argb: "FFFFFFFF" } };
    r2.fill      = solidFill("FF2D5FA0");
    r2.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(2).height = 24;

    // ─── صف 3: ملخص سريع ─────────────────────────
    ws.mergeCells(`A3:${LAST_COL}3`);
    const r3 = ws.getCell("A3");
    r3.value     = `عدد الطلاب: ${archiveStudents.length}   |   إجمالي الرسوم: ${(archive.total_amount || 0).toLocaleString("ar-IQ")} د.ع`;
    r3.font      = { name: "Arial", size: 10, color: { argb: "FFFFFFFF" } };
    r3.fill      = solidFill("FF3B6FC1");
    r3.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(3).height = 20;

    // ─── صف 4: رؤوس الأعمدة ──────────────────────
    const HEADERS = ["اسم الطالب", "الصف والشعبة", "المبلغ الكلي", "المبلغ المدفوع", "التخفيض", "المبلغ المتبقي"];
    const hRow = ws.getRow(4);
    hRow.height = 28;
    HEADERS.forEach((h, i) => {
      const cell   = hRow.getCell(i + 1);
      cell.value   = h;
      cell.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill    = solidFill("FF2563EB");
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: false };
      cell.border  = { bottom: { style: "medium", color: { argb: "FF1D4ED8" } }, ...thinBorder("FF1D4ED8") };
    });

    // AutoFilter على صف الرؤوس
    ws.autoFilter = { from: "A4", to: `${LAST_COL}4` };

    // ─── صفوف البيانات ───────────────────────────
    archiveStudents.forEach((student, idx) => {
      const rowNum = 5 + idx;
      const row    = ws.getRow(rowNum);
      row.height   = 22;

      const remaining = Number(student.remaining_fee ?? 0);
      const evenBg    = idx % 2 === 0 ? "FFFFFFFF" : "FFF1F5F9";

      const rowData = [
        { v: student.full_name || "—",             fmt: null,    colIdx: 0 },
        { v: student.class_name || "—",            fmt: null,    colIdx: 1 },
        { v: Number(student.total_fee ?? 0),       fmt: NUM_FMT, colIdx: 2 },
        { v: Number(student.paid_fee ?? 0),        fmt: NUM_FMT, colIdx: 3 },
        { v: Number(student.discount_value ?? 0),  fmt: NUM_FMT, colIdx: 4 },
        { v: remaining,                             fmt: NUM_FMT, colIdx: 5 },
      ];

      rowData.forEach(({ v, fmt, colIdx }) => {
        const cell   = row.getCell(colIdx + 1);
        cell.value   = v;
        if (fmt) cell.numFmt = fmt;
        cell.alignment = { horizontal: colIdx === 0 ? "right" : "center", vertical: "middle", readingOrder: "rtl" };
        cell.border  = thinBorder();

        if (colIdx === 3) {
          // المدفوع → أخضر
          cell.fill = solidFill(evenBg);
          cell.font = { name: "Arial", size: 10, color: { argb: "FF16A34A" }, bold: Number(v) > 0 };
        } else if (colIdx === 4) {
          // التخفيض → برتقالي
          cell.fill = solidFill(evenBg);
          cell.font = { name: "Arial", size: 10, color: { argb: "FFD97706" }, bold: Number(v) > 0 };
        } else if (colIdx === 5) {
          // المتبقي → أحمر/أخضر
          if (remaining === 0) {
            cell.fill = solidFill("FFDCFCE7");
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF16A34A" } };
          } else {
            cell.fill = solidFill("FFFEE2E2");
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFDC2626" } };
          }
        } else {
          cell.fill = solidFill(evenBg);
          cell.font = { name: "Arial", size: 10, color: { argb: "FF1F2937" } };
        }
      });
    });

    // ─── صف المجاميع ─────────────────────────────
    const totRow = 5 + archiveStudents.length;
    ws.mergeCells(`A${totRow}:B${totRow}`);
    const totLabel   = ws.getCell(`A${totRow}`);
    totLabel.value   = `المجموع الكلي — ${archiveStudents.length} طالب`;
    totLabel.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    totLabel.fill    = solidFill("FF1B3A6B");
    totLabel.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

    const totals = [
      archiveStudents.reduce((s, st) => s + Number(st.total_fee ?? 0), 0),
      archiveStudents.reduce((s, st) => s + Number(st.paid_fee ?? 0), 0),
      archiveStudents.reduce((s, st) => s + Number(st.discount_value ?? 0), 0),
      archiveStudents.reduce((s, st) => s + Number(st.remaining_fee ?? 0), 0),
    ];
    totals.forEach((total, i) => {
      const cell   = ws.getCell(totRow, 3 + i);
      cell.value   = total;
      cell.numFmt  = NUM_FMT;
      cell.font    = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill    = solidFill("FF1B3A6B");
      cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
      cell.border  = { top: { style: "medium", color: { argb: "FF93C5FD" } } };
    });
    ws.getRow(totRow).height = 28;

    // ═══════════════════════════════════════════════
    // ورقة 2: الدفعات التفصيلية
    // ═══════════════════════════════════════════════
    if (archivePayments.length > 0) {
      const studentsById = Object.fromEntries(archiveStudents.map((s) => [s.id, s]));
      const ws2 = wb.addWorksheet("الدفعات التفصيلية", {
        views: [{ rightToLeft: true }],
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      ws2.columns = [
        { key: "name",     width: 28 },
        { key: "class",    width: 16 },
        { key: "amount",   width: 16 },
        { key: "method",   width: 16 },
        { key: "date",     width: 16 },
        { key: "receipt",  width: 20 },
        { key: "manual",   width: 20 },
        { key: "notes",    width: 24 },
      ];

      ws2.mergeCells("A1:H1");
      const ws2Title   = ws2.getCell("A1");
      ws2Title.value   = `الدفعات التفصيلية — ${archive.archive_year}`;
      ws2Title.font    = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      ws2Title.fill    = solidFill("FF1B3A6B");
      ws2Title.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
      ws2.getRow(1).height = 32;

      const p2Headers = ["اسم الطالب", "الصف", "المبلغ", "طريقة الدفع", "تاريخ الدفعة", "رقم الإيصال الإلكتروني", "رقم الإيصال الورقي", "ملاحظات"];
      const p2hRow = ws2.getRow(2);
      p2hRow.height = 26;
      p2Headers.forEach((h, i) => {
        const cell   = p2hRow.getCell(i + 1);
        cell.value   = h;
        cell.font    = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill    = solidFill("FF2563EB");
        cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
      });
      ws2.autoFilter = { from: "A2", to: "H2" };

      archivePayments.forEach((payment, idx) => {
        const row   = ws2.getRow(3 + idx);
        row.height  = 20;
        const bg    = solidFill(idx % 2 === 0 ? "FFFFFFFF" : "FFF1F5F9");
        const vals  = [
          studentsById[payment.student_id]?.full_name || "—",
          studentsById[payment.student_id]?.class_name || "—",
          Number(payment.amount || 0),
          getPaymentMethodLabel(payment.payment_method),
          formatDate(payment.created_at),
          payment.receipt_number || "—",
          payment.manual_receipt_number || "—",
          payment.notes || "",
        ];
        vals.forEach((v, i) => {
          const cell   = row.getCell(i + 1);
          cell.value   = v;
          if (i === 2) cell.numFmt = NUM_FMT;
          cell.font    = { name: "Arial", size: 10, color: { argb: "FF1F2937" } };
          cell.fill    = bg;
          cell.alignment = { horizontal: i === 0 ? "right" : "center", vertical: "middle", readingOrder: "rtl" };
          cell.border  = thinBorder();
        });
      });
    }

    // ─── تنزيل ───────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `فواتير_اقساط_${archive.archive_year}_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } finally {
    setExportingId(null);
  }
}
