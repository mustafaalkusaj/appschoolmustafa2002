"use client";

import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Student, Payment } from "../_types";

interface StudentDetailPanelProps {
  student: Student | null;
  payments: Payment[];
  paymentsLoading: boolean;
  paymentCount: number;
  show: boolean;
  onClose: () => void;
  onAddPayment: (student: Student) => void;
  onDeletePayment: (paymentId: string) => void;
  onPrintReceipt: (payment: Payment, student: Student) => void;
  canAddPayments: boolean;
  canDeletePayments: boolean;
}

export function StudentDetailPanel({
  student,
  payments,
  paymentsLoading,
  paymentCount,
  show,
  onClose,
  onAddPayment,
  onDeletePayment,
  onPrintReceipt,
  canAddPayments,
  canDeletePayments,
}: StudentDetailPanelProps) {
  if (!show || !student) return null;

  const progressPct = student.total_fee > 0 ? Math.min(100, Math.round((student.paid_fee / student.total_fee) * 100)) : 0;

  return (
    <div
      className="detail-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="detail-panel">
        <div className="detail-header">
          <div className="detail-title">تفاصيل الفاتورة — {student.full_name}</div>
          <button className="detail-close" onClick={onClose}>
            <AppIcon token="✕" size={16} />
          </button>
        </div>
        <div className="detail-cards">
          <div className="detail-card">
            <div className="detail-card-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
              <AppIcon token="👤" size={14} /> معلومات الطالب
            </div>
            <div className="detail-row">
              <span className="detail-label">الاسم:</span>
              <span className="detail-val">{student.full_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">الصف:</span>
              <span className="detail-val">{student.class_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">الهاتف:</span>
              <span className="detail-val">{student.phone || "—"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">العنوان:</span>
              <span className="detail-val">{student.address || "—"}</span>
            </div>
          </div>
          <div className="detail-card">
            <div className="detail-card-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
              <AppIcon token="📊" size={14} /> الملخص المالي
            </div>
            <div className="detail-row">
              <span className="detail-label">المبلغ الكلي:</span>
              <span className="detail-val">د.ع {formatNumber(student.total_fee)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">المدفوع:</span>
              <span className="detail-val" style={{ color: "#10B981" }}>
                د.ع {formatNumber(student.paid_fee)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">الخصم:</span>
              <span className="detail-val">د.ع {formatNumber(student.discount_value || 0)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">المتبقي:</span>
              <span className="detail-val" style={{ color: "#EF4444" }}>
                د.ع {formatNumber(student.remaining_fee)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: "#F8F6FF", borderRadius: 12, padding: "1rem", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem", fontSize: ".8rem" }}>
            <span style={{ fontWeight: 700 }}>نسبة الإنجاز</span>
            <span style={{ color: "var(--p3)", fontWeight: 800 }}>{progressPct}%</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div
              className="progress-fill"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg,#6C4AB6,#10B981)",
              }}
            />
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".8rem" }}>
            <span style={{ fontSize: ".88rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
              <AppIcon token="💳" size={14} /> معاملات الدفع ({paymentCount})
            </span>
            {canAddPayments && (
              <button
                className="btn-add"
                style={{ padding: ".4rem .8rem", fontSize: ".75rem" }}
                onClick={() => onAddPayment(student)}
              >
                + إضافة دفعة
              </button>
            )}
          </div>
          {paymentsLoading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray)", fontSize: ".85rem" }}>
              جارٍ تحميل دفعات الطالب...
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray)", fontSize: ".85rem" }}>
              لا توجد دفعات مسجلة حتى الآن
            </div>
          ) : (
            payments.map((p, i) => (
              <PaymentRow
                key={p.id}
                payment={p}
                index={i}
                onPrint={() => onPrintReceipt(p, student)}
                onDelete={() => onDeletePayment(p.id)}
                canDelete={canDeletePayments}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface PaymentRowProps {
  payment: Payment;
  index: number;
  onPrint: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function PaymentRow({ payment, index, onPrint, onDelete, canDelete }: PaymentRowProps) {
  const methodInfo = (
    {
      cash: { icon: "💵", label: "نقداً" },
      bank_transfer: { icon: "🏦", label: "تحويل" },
      check: { icon: "📄", label: "شيك" },
    } as Record<string, { icon: string; label: string }>
  )[payment.payment_method];

  return (
    <div className="pay-row">
      <div className="pay-row-top">
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <div className="pay-num">{index + 1}</div>
          <span className="pay-amount">د.ع {formatNumber(payment.amount)}</span>
          <span className="pay-method-badge">
            {methodInfo ? (
              <>
                <AppIcon token={methodInfo.icon} size={12} />
                {methodInfo.label}
              </>
            ) : (
              payment.payment_method
            )}
          </span>
        </div>
        <div className="pay-actions">
          <button className="btn-print-sm" title="طباعة" onClick={onPrint}>
            <AppIcon token="🖨️" size={13} />
          </button>
          {canDelete && (
            <button className="btn-del-sm" onClick={onDelete}>
              حذف
            </button>
          )}
        </div>
      </div>
      <div className="pay-fields">
        <div className="pay-field">
          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
            <AppIcon token="📅" size={11} /> التاريخ
          </span>
          <span className="pay-field-val">{formatDate(payment.created_at)}</span>
        </div>
        <div className="pay-field">
          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
            <AppIcon token="🧾" size={11} /> رقم الإيصال الورقي
          </span>
          <span className="pay-field-val">{payment.manual_receipt_number || "—"}</span>
        </div>
        <div className="pay-field">
          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
            <AppIcon token="🔢" size={11} /> رقم الإيصال الإلكتروني
          </span>
          <span className="pay-field-val receipt-e">{payment.receipt_number || "—"}</span>
        </div>
        {payment.notes && (
          <div className="pay-field">
            <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
              <AppIcon token="📝" size={11} /> ملاحظات
            </span>
            <span className="pay-field-val">{payment.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
