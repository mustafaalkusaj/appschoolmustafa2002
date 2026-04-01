"use client";

import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import { loadXLSX } from "@/lib/xlsx-loader";

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
  const archiveYearOptions = Array.from(
    new Set([...paymentYears, ...archives.map((a) => a.archive_year), new Date().getFullYear()])
  ).sort((a, b) => b - a);

  const archivedYearsCount = archives.length;
  const totalArchivedAmount = archives.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  const latestArchive = archives[0] || null;

  return (
    <div className="archive-box">
      <div className="archive-top">
        <div className="archive-ttl">
          <AppIcon token="🗄️" size={14} /> الأرشيف السنوي للحسابات
        </div>
      </div>
      <div className="archive-note">
        يتم حفظ نسخة سنوية من دفعات المدرسة الحالية داخل Supabase بدون حذف السجلات الأصلية.
      </div>
      {archiveNotice && (
        <div className="err" style={{ marginBottom: ".8rem" }}>
          {archiveNotice}
        </div>
      )}
      <div className="archive-stats">
        <div className="archive-stat">
          <div className="archive-stat-label">السنوات المؤرشفة</div>
          <div className="archive-stat-value">{formatNumber(archivedYearsCount)}</div>
        </div>
        <div className="archive-stat">
          <div className="archive-stat-label">إجمالي المبلغ المؤرشف</div>
          <div className="archive-stat-value">د.ع {formatNumber(totalArchivedAmount)}</div>
        </div>
        <div className="archive-stat">
          <div className="archive-stat-label">آخر سنة مؤرشفة</div>
          <div className="archive-stat-value">{latestArchive ? latestArchive.archive_year : "—"}</div>
        </div>
      </div>
      <div className="archive-controls">
        <select className="archive-select" value={archiveYear} onChange={(e) => setArchiveYear(e.target.value)}>
          {archiveYearOptions.map((year) => (
            <option key={year} value={year}>
              سنة {year}
            </option>
          ))}
        </select>
        {canDeletePayments && (
          <button className="btn-add" onClick={onArchive} disabled={archiving}>
            <AppIcon token="🗃️" size={14} /> {archiving ? "جارٍ الأرشفة..." : "أرشفة السنة المحددة"}
          </button>
        )}
      </div>
      {archives.length === 0 ? (
        <div className="empty" style={{ padding: "1.5rem 0" }}>
          لا يوجد أرشيف سنوي محفوظ بعد
        </div>
      ) : (
        <div className="archive-list">
          {archives.map((archive) => (
            <div className="arch-card" key={archive.id}>
              <div className="arch-year">{archive.archive_year}</div>
              <div className="arch-info">
                {archive.total_students} طالب • {archive.total_payments} دفعة
              </div>
              <div className="arch-info">تاريخ الأرشفة: {formatDate(archive.archive_date)}</div>
              <div className="arch-amount">د.ع {formatNumber(archive.total_amount || 0)}</div>
              <div className="arch-actions">
                <button className="arch-btn primary" onClick={() => onViewDetail(archive)}>
                  <AppIcon token="📂" size={13} /> عرض التفاصيل
                </button>
                <button
                  className="arch-btn soft"
                  onClick={() => onExportArchive(archive)}
                  disabled={archiveExportingId === archive.id}
                >
                  <AppIcon token="⬇️" size={13} />{" "}
                  {archiveExportingId === archive.id ? "جارٍ التصدير..." : "تصدير الأرشيف"}
                </button>
              </div>
            </div>
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
