"use client";

import { Banknote, School, Pencil, Trash2, Plus, Check, X } from "@/lib/icons";
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
    <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 800 }}>
          <Banknote size={20} className="text-primary" />
          <span>أسعار الرسوم الدراسية حسب الصفوف</span>
        </div>
        <button 
          className="ui-button ui-button--primary" 
          onClick={onOpenNewFee} 
          style={{ minHeight: "36px", padding: "0 0.875rem", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Plus size={14} />
          إضافة صف جديد
        </button>
      </div>

      {classFees.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          color: "var(--text-tertiary)", 
          padding: "3rem 1.5rem", 
          fontSize: "0.875rem",
          background: "var(--surface-soft)",
          borderRadius: "16px",
          border: "1px dashed var(--border)"
        }}>
          لا توجد أقساط مضافة حتى الآن. اضغط على "إضافة صف جديد" للبدء.
        </div>
      ) : (
        <div style={{ overflowX: "auto", margin: "0 -1.5rem" }}>
          <table className="ui-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-soft)" }}>
                <th style={{ padding: "1rem 1.5rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>الصف الدراسي</th>
                <th style={{ padding: "1rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>المبلغ الكلي</th>
                <th style={{ padding: "1rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>عدد الأقساط</th>
                <th style={{ padding: "1rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>قيمة القسط الواحد</th>
                <th style={{ padding: "1rem 1rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>عدد الطلاب</th>
                <th style={{ padding: "1rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>المدفوع</th>
                <th style={{ padding: "1rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>المتبقي</th>
                <th style={{ padding: "1rem 1.5rem", textAlign: "center", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-secondary)" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {classFees.map((cf) => {
                const stats = getClassStats(cf);
                return (
                  <tr key={cf.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "1rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <School size={14} className="text-tertiary" />
                        <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{cf.class_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem 1rem", fontWeight: 800, color: "var(--primary)", fontSize: "0.875rem" }}>
                      د.ع {formatNumber(cf.total_fee)}
                    </td>
                    <td style={{ padding: "1rem 1rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.625rem", 
                        background: "var(--surface-soft)", 
                        borderRadius: "999px", 
                        fontSize: "0.6875rem", 
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)"
                      }}>
                        × {cf.installments} أقساط
                      </span>
                    </td>
                    <td style={{ padding: "1rem 1rem", fontWeight: 700, color: "#10b981", fontSize: "0.8125rem" }}>
                      د.ع {formatNumber(cf.installment_amount)}
                    </td>
                    <td style={{ padding: "1rem 1rem", textAlign: "center", fontWeight: 700, fontSize: "0.875rem" }}>
                      {stats.count}
                    </td>
                    <td style={{ padding: "1rem 1rem", color: "#10b981", fontWeight: 800, fontSize: "0.8125rem" }}>
                      د.ع {formatNumber(stats.totalPaid)}
                    </td>
                    <td style={{ padding: "1rem 1rem", color: "var(--danger)", fontWeight: 800, fontSize: "0.8125rem" }}>
                      د.ع {formatNumber(stats.totalRemaining)}
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                        <button 
                          className="ui-button" 
                          style={{ 
                            minHeight: "32px", 
                            minWidth: "32px", 
                            padding: 0, 
                            borderRadius: "8px",
                            background: "var(--surface-soft)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)"
                          }} 
                          onClick={() => onEditFee(cf)}
                        >
                          <Pencil size={14} />
                        </button>
                        
                        {deleteConfirm === cf.id ? (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button 
                              className="ui-button ui-button--danger" 
                              style={{ minHeight: "32px", padding: "0 0.75rem", fontSize: "0.6875rem", borderRadius: "8px" }} 
                              onClick={() => onConfirmDelete(cf.id)}
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              className="ui-button ui-button--secondary" 
                              style={{ minHeight: "32px", padding: "0 0.75rem", fontSize: "0.6875rem", borderRadius: "8px" }} 
                              onClick={onCancelDelete}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="ui-button ui-button--danger" 
                            style={{ 
                              minHeight: "32px", 
                              minWidth: "32px", 
                              padding: 0, 
                              borderRadius: "8px",
                              background: "rgba(239, 68, 68, 0.08)",
                              border: "1px solid rgba(239, 68, 68, 0.16)",
                              color: "var(--danger)"
                            }} 
                            onClick={() => onDeleteFee(cf.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
