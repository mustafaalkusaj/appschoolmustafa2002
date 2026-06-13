"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatDate } from "@/lib/formatting";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentArchive, Student, Payment } from "../_types";
import { getPaymentMethodLabel, getArchiveStudents, getArchivePayments } from "../_hooks/useArchiveOperations";
import type { ArchiveEditData } from "../_hooks/useArchiveOperations";
import { Download, Users, CreditCard, Calendar, DollarSign, X, Pencil, Save, Plus, Trash2 } from "lucide-react";

interface ArchiveDetailModalProps {
  archive: PaymentArchive | null;
  show: boolean;
  onClose: () => void;
  archiveExportingId: string | null;
  onExport: (archive: PaymentArchive) => void;
  // Editing — optional so read-only callers stay unaffected.
  canEdit?: boolean;
  saving?: boolean;
  onSave?: (data: ArchiveEditData) => Promise<boolean> | void;
}

const PAYMENT_METHODS = ["cash", "bank_transfer", "check"];

const cellInput =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none";

export function ArchiveDetailModal({
  archive,
  show,
  onClose,
  archiveExportingId,
  onExport,
  canEdit = false,
  saving = false,
  onSave,
}: ArchiveDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [draftStudents, setDraftStudents] = useState<Student[]>([]);
  const [draftPayments, setDraftPayments] = useState<Payment[]>([]);

  // Reset edit state whenever a different archive is opened/closed.
  useEffect(() => {
    setEditing(false);
    setDraftStudents([]);
    setDraftPayments([]);
  }, [archive?.id, show]);

  const beginEdit = () => {
    if (!archive) return;
    setDraftStudents(getArchiveStudents(archive).map((s) => ({ ...s })));
    setDraftPayments(getArchivePayments(archive).map((p) => ({ ...p })));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftStudents([]);
    setDraftPayments([]);
  };

  const handleSave = async () => {
    if (!onSave) return;
    const ok = await onSave({ students: draftStudents, payments: draftPayments });
    if (ok) setEditing(false);
  };

  const updateStudent = (index: number, patch: Partial<Student>) => {
    setDraftStudents((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const updatePayment = (index: number, patch: Partial<Payment>) => {
    setDraftPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };
  const deletePayment = (index: number) => {
    setDraftPayments((prev) => prev.filter((_, i) => i !== index));
  };
  const addPayment = () => {
    const firstStudent = draftStudents[0];
    setDraftPayments((prev) => [
      {
        id: `new-${Date.now()}-${prev.length}`,
        student_id: firstStudent?.id ?? "",
        amount: 0,
        payment_method: "cash",
        notes: "",
        created_at: new Date().toISOString(),
        receipt_number: "",
        manual_receipt_number: "",
      },
      ...prev,
    ]);
  };

  // Live KPI values: derive from drafts while editing so the user sees totals update.
  const liveStudents = editing ? draftStudents : archive ? getArchiveStudents(archive) : [];
  const livePayments = editing ? draftPayments : archive ? getArchivePayments(archive) : [];
  const liveTotalAmount = useMemo(
    () =>
      editing
        ? draftPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        : archive?.total_amount ?? livePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [editing, draftPayments, archive, livePayments]
  );

  if (!archive) return null;

  const detailPayments = editing
    ? draftPayments
    : [...livePayments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const studentsById = Object.fromEntries(liveStudents.map((s) => [s.id, s]));

  return (
    <Modal open={show} onClose={editing ? cancelEdit : onClose} size="full">
      <ModalHeader
        title={`أرشيف الحسابات لسنة ${archive.archive_year}`}
        description={
          editing
            ? "وضع التعديل — عدّل بيانات الطلاب والدفعات ثم احفظ. لا يؤثر هذا على بيانات السنة الحالية."
            : `نسخة مؤرشفة خاصة بهذه المدرسة بتاريخ ${formatDate(archive.archive_date)}`
        }
        onClose={editing ? cancelEdit : onClose}
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
                  د.ع {formatNumber(liveTotalAmount || 0)}
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
                  {formatNumber(detailPayments.length)}
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
                  {formatNumber(liveStudents.length)}
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
              {liveStudents.length} طالب محفوظ داخل اللقطة السنوية
            </span>
          </div>

          <Card className="overflow-hidden">
            {liveStudents.length === 0 ? (
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
                    {(editing ? draftStudents : (liveStudents as Student[])).map((student, index) => {
                      const remaining = editing
                        ? (Number(student.total_fee) || 0) - (Number(student.paid_fee) || 0)
                        : student.remaining_fee || 0;
                      return (
                        <tr key={student.id || `${student.full_name}-${index}`} className="hover:bg-[var(--surface-soft)]">
                          <td className="p-3 text-sm border-b border-[var(--border)]">{index + 1}</td>
                          <td className="p-3 font-semibold border-b border-[var(--border)]">
                            {editing ? (
                              <input
                                className={cellInput}
                                value={student.full_name || ""}
                                onChange={(e) => updateStudent(index, { full_name: e.target.value })}
                              />
                            ) : (
                              student.full_name || "—"
                            )}
                          </td>
                          <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                            {editing ? (
                              <input
                                className={cellInput}
                                value={student.class_name || ""}
                                onChange={(e) => updateStudent(index, { class_name: e.target.value })}
                              />
                            ) : (
                              student.class_name || "—"
                            )}
                          </td>
                          <td className="p-3 border-b border-[var(--border)]">
                            <Badge variant="neutral" size="sm">
                              {student.status || "—"}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm border-b border-[var(--border)]">
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                className={cellInput}
                                value={student.total_fee ?? 0}
                                onChange={(e) => updateStudent(index, { total_fee: Number(e.target.value) || 0 })}
                              />
                            ) : (
                              <>د.ع {formatNumber(student.total_fee || 0)}</>
                            )}
                          </td>
                          <td className="p-3 text-sm font-semibold text-[var(--success)] border-b border-[var(--border)]">
                            {editing ? (
                              <input
                                type="number"
                                min={0}
                                className={cellInput}
                                value={student.paid_fee ?? 0}
                                onChange={(e) => updateStudent(index, { paid_fee: Number(e.target.value) || 0 })}
                              />
                            ) : (
                              <>د.ع {formatNumber(student.paid_fee || 0)}</>
                            )}
                          </td>
                          <td className="p-3 border-b border-[var(--border)]">
                            <span
                              className={`text-sm font-semibold ${
                                remaining > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                              }`}
                            >
                              د.ع {formatNumber(remaining)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">
                {detailPayments.length} دفعة محفوظة ضمن هذه السنة
              </span>
              {editing && (
                <Button variant="outline" size="sm" onClick={addPayment}>
                  <Plus className="h-3.5 w-3.5" />
                  إضافة دفعة
                </Button>
              )}
            </div>
          </div>

          <Card className="overflow-hidden">
            {detailPayments.length === 0 ? (
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
                      {editing && (
                        <th className="text-start text-xs font-bold text-[var(--text-muted)] p-3 border-b border-[var(--border)]"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detailPayments.map((payment, index) => (
                      <tr key={payment.id || `${payment.student_id}-${payment.created_at}-${index}`} className="hover:bg-[var(--surface-soft)]">
                        <td className="p-3 text-sm border-b border-[var(--border)]">{index + 1}</td>
                        <td className="p-3 font-semibold border-b border-[var(--border)]">
                          {editing ? (
                            <select
                              className={cellInput}
                              value={payment.student_id || ""}
                              onChange={(e) => updatePayment(index, { student_id: e.target.value })}
                            >
                              <option value="">—</option>
                              {draftStudents.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name || s.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            studentsById[payment.student_id]?.full_name || "—"
                          )}
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                          {studentsById[payment.student_id]?.class_name || "—"}
                        </td>
                        <td className="p-3 text-sm font-semibold text-[var(--success)] border-b border-[var(--border)]">
                          {editing ? (
                            <input
                              type="number"
                              min={0}
                              className={cellInput}
                              value={payment.amount ?? 0}
                              onChange={(e) => updatePayment(index, { amount: Number(e.target.value) || 0 })}
                            />
                          ) : (
                            <>د.ع {formatNumber(payment.amount || 0)}</>
                          )}
                        </td>
                        <td className="p-3 border-b border-[var(--border)]">
                          {editing ? (
                            <select
                              className={cellInput}
                              value={payment.payment_method || "cash"}
                              onChange={(e) => updatePayment(index, { payment_method: e.target.value })}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {getPaymentMethodLabel(m)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              {getPaymentMethodLabel(payment.payment_method)}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)]">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="p-3 text-sm text-[var(--text-secondary)] border-b border-[var(--border)] break-all">
                          {editing ? (
                            <input
                              className={cellInput}
                              value={payment.manual_receipt_number || ""}
                              onChange={(e) => updatePayment(index, { manual_receipt_number: e.target.value })}
                            />
                          ) : (
                            payment.manual_receipt_number || payment.receipt_number || "—"
                          )}
                        </td>
                        {editing && (
                          <td className="p-3 border-b border-[var(--border)]">
                            <button
                              type="button"
                              onClick={() => deletePayment(index)}
                              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]"
                              aria-label="حذف الدفعة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
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
        {editing ? (
          <>
            <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>
              <Save className="h-4 w-4" />
              حفظ التعديلات
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4" />
              إلغاء
            </Button>
          </>
        ) : (
          <>
            {canEdit && onSave && (
              <Button variant="primary" onClick={beginEdit}>
                <Pencil className="h-4 w-4" />
                تعديل الأرشيف
              </Button>
            )}
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
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
