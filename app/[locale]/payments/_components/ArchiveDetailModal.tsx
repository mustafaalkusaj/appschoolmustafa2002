"use client";

import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";

interface ArchiveDetailModalProps {
  archive: PaymentArchive | null;
  show: boolean;
  onClose: () => void;
  archiveExportingId: string | null;
  onExport: (archive: PaymentArchive) => void;
}

export function ArchiveDetailModal({
  archive,
  show,
  onClose,
  archiveExportingId,
  onExport,
}: ArchiveDetailModalProps) {
  if (!show || !archive) return null;

  const archiveDetailStudents = getArchiveStudents(archive);
  const archiveDetailPayments = [...getArchivePayments(archive)].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const archiveStudentsById = Object.fromEntries(archiveDetailStudents.map((s) => [s.id, s]));

  return (
    <div
      className="archive-detail-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="archive-detail-modal">
        <div className="archive-detail-head">
          <div>
            <div className="archive-detail-title">أرشيف الحسابات لسنة {archive.archive_year}</div>
            <div className="archive-detail-sub">
              نسخة مؤرشفة خاصة بهذه المدرسة بتاريخ {formatDate(archive.archive_date)}
            </div>
          </div>
          <div className="archive-detail-actions">
            <button
              className="btn-export"
              onClick={() => onExport(archive)}
              disabled={archiveExportingId === archive.id}
            >
              <AppIcon token="⬇️" size={14} />{" "}
              {archiveExportingId === archive.id ? "جارٍ التصدير..." : "تصدير ملف الأرشيف"}
            </button>
            <button className="btn-add" onClick={onClose}>
              <AppIcon token="✕" size={14} /> إغلاق
            </button>
          </div>
        </div>

        <div className="archive-detail-body">
          <div className="archive-kpis">
            <div className="archive-kpi">
              <div className="archive-kpi-label">إجمالي المبالغ</div>
              <div className="archive-kpi-value">د.ع {formatNumber(archive.total_amount || 0)}</div>
            </div>
            <div className="archive-kpi">
              <div className="archive-kpi-label">عدد الدفعات</div>
              <div className="archive-kpi-value">
                {formatNumber(archive.total_payments || archiveDetailPayments.length)}
              </div>
            </div>
            <div className="archive-kpi">
              <div className="archive-kpi-label">عدد الطلاب</div>
              <div className="archive-kpi-value">
                {formatNumber(archive.total_students || archiveDetailStudents.length)}
              </div>
            </div>
            <div className="archive-kpi">
              <div className="archive-kpi-label">تاريخ الأرشفة</div>
              <div className="archive-kpi-value">{formatDate(archive.archive_date)}</div>
            </div>
          </div>

          <div className="archive-section">
            <div className="archive-section-top">
              <div className="archive-section-title">
                <AppIcon token="👥" size={14} /> الطلاب ضمن الأرشيف
              </div>
              <div className="archive-section-sub">
                {archiveDetailStudents.length} طالب محفوظ داخل اللقطة السنوية
              </div>
            </div>
            <div className="archive-table-wrap">
              {archiveDetailStudents.length === 0 ? (
                <div className="archive-empty">لا يوجد طلاب محفوظون داخل هذا الأرشيف.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم الطالب</th>
                      <th>الصف</th>
                      <th>الحالة</th>
                      <th>إجمالي الرسوم</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveDetailStudents.map((student, index) => (
                      <tr key={student.id || `${student.full_name}-${index}`}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: 700 }}>{student.full_name || "—"}</td>
                        <td>{student.class_name || "—"}</td>
                        <td>{student.status || "—"}</td>
                        <td>د.ع {formatNumber(student.total_fee || 0)}</td>
                        <td style={{ color: "#10B981", fontWeight: 700 }}>
                          د.ع {formatNumber(student.paid_fee || 0)}
                        </td>
                        <td
                          style={{
                            color: (student.remaining_fee || 0) > 0 ? "#EF4444" : "#10B981",
                            fontWeight: 700,
                          }}
                        >
                          د.ع {formatNumber(student.remaining_fee || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="archive-section" style={{ marginBottom: 0 }}>
            <div className="archive-section-top">
              <div className="archive-section-title">
                <AppIcon token="💳" size={14} /> الدفعات المؤرشفة
              </div>
              <div className="archive-section-sub">
                {archiveDetailPayments.length} دفعة محفوظة ضمن هذه السنة
              </div>
            </div>
            <div className="archive-table-wrap">
              {archiveDetailPayments.length === 0 ? (
                <div className="archive-empty">لا توجد دفعات محفوظة داخل هذا الأرشيف.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>اسم الطالب</th>
                      <th>الصف</th>
                      <th>المبلغ</th>
                      <th>طريقة الدفع</th>
                      <th>التاريخ</th>
                      <th>الإيصال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveDetailPayments.map((payment, index) => (
                      <tr key={payment.id || `${payment.student_id}-${payment.created_at}-${index}`}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: 700 }}>
                          {archiveStudentsById[payment.student_id]?.full_name || "—"}
                        </td>
                        <td>{archiveStudentsById[payment.student_id]?.class_name || "—"}</td>
                        <td style={{ color: "#10B981", fontWeight: 700 }}>
                          د.ع {formatNumber(payment.amount || 0)}
                        </td>
                        <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                        <td>{formatDate(payment.created_at)}</td>
                        <td>{payment.manual_receipt_number || payment.receipt_number || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
