"use client";

import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentArchive } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import { Download, X, Users, CreditCard, Calendar, DollarSign } from "lucide-react";

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
  if (!archive) return null;

  const archiveDetailStudents = getArchiveStudents(archive);
  const archiveDetailPayments = [...getArchivePayments(archive)].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const archiveStudentsById = Object.fromEntries(archiveDetailStudents.map((s) => [s.id, s]));

  return (
    <Modal open={show} onClose={onClose} size="full">
      <ModalHeader
        title={`أرشيف الحسابات لسنة ${archive.archive_year}`}
        description={`نسخة مؤرشفة خاصة بهذه المدرسة بتاريخ ${formatDate(archive.archive_date)}`}
        onClose={onClose}
      />

      <ModalBody className="space-y-6">
        {/* KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)]">
                <DollarSign className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">إجمالي المبالغ</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  د.ع {formatNumber(archive.total_amount || 0)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">عدد الدفعات</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatNumber(archive.total_payments || archiveDetailPayments.length)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)]">
                <Users className="h-5 w-5 text-[var(--info)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">عدد الطلاب</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatNumber(archive.total_students || archiveDetailStudents.length)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)]">
                <Calendar className="h-5 w-5 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">تاريخ الأرشفة</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatDate(archive.archive_date)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Students Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">الطلاب ضمن الأرشيف</h3>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {archiveDetailStudents.length} طالب محفوظ داخل اللقطة السنوية
            </span>
          </div>

          <Card className="overflow-hidden">
            {archiveDetailStudents.length === 0 ? (
              <EmptyState
                title="لا يوجد طلاب محفوظون"
                description="لا يوجد طلاب محفوظون داخل هذا الأرشيف"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--surface-soft)]">
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">#</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">اسم الطالب</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">الصف</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">الحالة</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">إجمالي الرسوم</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">المدفوع</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveDetailStudents.map((student, index) => (
                      <tr key={student.id || `${student.full_name}-${index}`} className="hover:bg-[var(--surface-soft)]">
                        <td className="p-3 text-sm border-b border-[var(--border)]">{index + 1}</td>
                        <td className="p-3 font-semibold border-b border-[var(--border)]">{student.full_name || "—"}</td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                          {student.class_name || "—"}
                        </td>
                        <td className="p-3 border-b border-[var(--border)]">
                          <Badge variant="neutral" size="sm">
                            {student.status || "—"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm border-b border-[var(--border)]">
                          د.ع {formatNumber(student.total_fee || 0)}
                        </td>
                        <td className="p-3 text-sm font-semibold text-[var(--success)] border-b border-[var(--border)]">
                          د.ع {formatNumber(student.paid_fee || 0)}
                        </td>
                        <td className="p-3 border-b border-[var(--border)]">
                          <span
                            className={`text-sm font-semibold ${
                              (student.remaining_fee || 0) > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                            }`}
                          >
                            د.ع {formatNumber(student.remaining_fee || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Payments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">الدفعات المؤرشفة</h3>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {archiveDetailPayments.length} دفعة محفوظة ضمن هذه السنة
            </span>
          </div>

          <Card className="overflow-hidden">
            {archiveDetailPayments.length === 0 ? (
              <EmptyState
                title="لا توجد دفعات محفوظة"
                description="لا توجد دفعات محفوظة داخل هذا الأرشيف"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--surface-soft)]">
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">#</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">اسم الطالب</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">الصف</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">المبلغ</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">طريقة الدفع</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">التاريخ</th>
                      <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]">الإيصال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveDetailPayments.map((payment, index) => (
                      <tr key={payment.id || `${payment.student_id}-${payment.created_at}-${index}`} className="hover:bg-[var(--surface-soft)]">
                        <td className="p-3 text-sm border-b border-[var(--border)]">{index + 1}</td>
                        <td className="p-3 font-semibold border-b border-[var(--border)]">
                          {archiveStudentsById[payment.student_id]?.full_name || "—"}
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                          {archiveStudentsById[payment.student_id]?.class_name || "—"}
                        </td>
                        <td className="p-3 text-sm font-semibold text-[var(--success)] border-b border-[var(--border)]">
                          د.ع {formatNumber(payment.amount || 0)}
                        </td>
                        <td className="p-3 border-b border-[var(--border)]">
                          <Badge variant="neutral" size="sm">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] break-all">
                          {payment.manual_receipt_number || payment.receipt_number || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={() => onExport(archive)}
          disabled={archiveExportingId === archive.id}
          loading={archiveExportingId === archive.id}
        >
          <Download className="h-4 w-4" />
          تصدير ملف الأرشيف
        </Button>
        <Button variant="secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          إغلاق
        </Button>
      </ModalFooter>
    </Modal>
  );
}
