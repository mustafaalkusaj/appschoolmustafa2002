"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import { ClassFee } from "./types";

interface ClassFeesTableProps {
  classFees: ClassFee[];
  showFeesTable: boolean;
  canManageClasses: boolean;
  deleteConfirm: string | null;
  getClassStats: (cf: ClassFee) => {
    count: number;
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    paidPct: number;
  };
  onOpenNewFee: () => void;
  onEditFee: (cf: ClassFee) => void;
  onDeleteFee: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}

export function ClassFeesTable({
  classFees,
  showFeesTable,
  canManageClasses,
  deleteConfirm,
  getClassStats,
  onOpenNewFee,
  onEditFee,
  onDeleteFee,
  onCancelDelete,
  onConfirmDelete,
}: ClassFeesTableProps) {
  if (!canManageClasses || !showFeesTable) return null;

  return (
    <div className="fees-section">
      <div className="section-header">
        <div className="section-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
          <AppIcon token="💰" size={16} />
          Tuition rates by class
        </div>
        <button className="fee-btn" onClick={onOpenNewFee} style={{ fontSize: ".75rem", padding: ".4rem .9rem" }}>
          + إضافة صف جديد
        </button>
      </div>

      {classFees.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--gray)", padding: "2rem", fontSize: ".85rem" }}>
          لا توجد أقساط مضافة حتى الآن. اضغط على "إضافة قسط دراسي" للبدء.
        </div>
      ) : (
        <>
          {/* Quick cards */}
          <div className="fee-cards-row">
            {classFees.map((cf) => {
              const stats = getClassStats(cf);
              return (
                <div className="fee-card" key={cf.id} onClick={() => onEditFee(cf)}>
                  <div className="fc-class" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                    <AppIcon token="🏫" size={14} />
                    {cf.class_name}
                  </div>
                  <div className="fc-amount">د.ع {formatNumber(cf.total_fee)}</div>
                  <div className="fc-sub">إجمالي الموسم</div>
                  <div className="fc-inst">
                    <span className="fc-inst-lbl">لكل قسط:</span>
                    <span className="fc-inst-val">د.ع {formatNumber(cf.installment_amount)}</span>
                    <span className="inst-badge">×{cf.installments}</span>
                  </div>
                  <div style={{ marginTop: ".5rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: ".67rem", color: "var(--gray)" }}>
                    <span>{stats.count} طالب</span>
                    <span style={{ color: "#10B981", fontWeight: 700 }}>{stats.paidPct}% مدفوع</span>
                  </div>
                  <div className="prog-mini">
                    <div className="prog-mini-fill" style={{ width: `${stats.paidPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed table */}
          <table className="fees-table">
            <thead>
              <tr>
                <th>الصف الدراسي</th>
                <th>المبلغ الكلي</th>
                <th>عدد الأقساط</th>
                <th>قيمة القسط الواحد</th>
                <th>عدد الطلاب</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {classFees.map((cf) => {
                const stats = getClassStats(cf);
                return (
                  <tr key={cf.id}>
                    <td><span className="class-chip">{cf.class_name}</span></td>
                    <td style={{ fontWeight: 800, color: "var(--p2)" }}>د.ع {formatNumber(cf.total_fee)}</td>
                    <td><span className="inst-badge">× {cf.installments} قسط</span></td>
                    <td style={{ fontWeight: 700, color: "#10B981" }}>د.ع {formatNumber(cf.installment_amount)}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{stats.count}</td>
                    <td style={{ color: "#10B981", fontWeight: 700 }}>د.ع {formatNumber(stats.totalPaid)}</td>
                    <td style={{ color: "#EF4444", fontWeight: 700 }}>د.ع {formatNumber(stats.totalRemaining)}</td>
                    <td>
                      <div style={{ display: "flex", gap: ".4rem" }}>
                        <button className="action-btn edit-btn" onClick={() => onEditFee(cf)}>تعديل</button>
                        {deleteConfirm === cf.id ? (
                          <div style={{ display: "flex", gap: ".3rem" }}>
                            <button className="action-btn del-btn" onClick={() => onConfirmDelete(cf.id)}>تأكيد</button>
                            <button className="action-btn" style={{ background: "#F3F4F6", color: "var(--dark)" }} onClick={onCancelDelete}>إلغاء</button>
                          </div>
                        ) : (
                          <button className="action-btn del-btn" onClick={() => onDeleteFee(cf.id)}>حذف</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
