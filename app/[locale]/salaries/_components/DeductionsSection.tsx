"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber, formatDate } from "@/lib/formatting";
import type { Deduction, Teacher } from "../_types";

interface DeductionsSectionProps {
  teachers: Teacher[];
  deductionsList: Deduction[];
  deductionTeacher: string;
  deductionAmount: string;
  deductionNotes: string;
  saving: boolean;
  onUpdateTeacher: (id: string) => void;
  onUpdateAmount: (amount: string) => void;
  onUpdateNotes: (notes: string) => void;
  onSave: () => void;
}

export function DeductionsSection({
  teachers,
  deductionsList,
  deductionTeacher,
  deductionAmount,
  deductionNotes,
  saving,
  onUpdateTeacher,
  onUpdateAmount,
  onUpdateNotes,
  onSave,
}: DeductionsSectionProps) {
  return (
    <>
      <div className="ded-form">
        <div
          style={{
            fontSize: ".88rem",
            fontWeight: 800,
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: ".35rem",
          }}
        >
          <AppIcon token="💸" size={14} />
          تسجيل سحب جديد
        </div>
        <div className="fg">
          <div className="ff full">
            <label className="fl">اسم الأستاذ</label>
            <select
              className="fis"
              value={deductionTeacher}
              onChange={(e) => onUpdateTeacher(e.target.value)}
            >
              <option value="">اختر الأستاذ...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>
          <div className="ff">
            <label className="fl">مبلغ السحب (د.ع)</label>
            <input
              type="number"
              className="fis"
              value={deductionAmount}
              onChange={(e) => onUpdateAmount(e.target.value)}
            />
          </div>
          <div className="ff">
            <label className="fl">
              الملاحظات <span className="opt">(اختياري)</span>
            </label>
            <input
              className="fis"
              value={deductionNotes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              placeholder="أي ملاحظات..."
            />
          </div>
        </div>
        <button
          className="bs"
          style={{ marginTop: ".8rem", maxWidth: 200 }}
          disabled={saving || !deductionTeacher}
          onClick={onSave}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ السحب"}
        </button>
      </div>

      <div className="tbl-wrap">
        {deductionsList.length === 0 ? (
          <div className="empty">لا توجد سحوبات مسجلة</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الأستاذ</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {deductionsList.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{d.teachers?.full_name || "—"}</td>
                  <td style={{ color: "#EF4444", fontWeight: 700 }}>
                    د.ع {formatNumber(d.amount)}
                  </td>
                  <td style={{ color: "var(--gray)", fontSize: ".75rem" }}>
                    {formatDate(d.deduction_date)}
                  </td>
                  <td style={{ color: "var(--gray)", fontSize: ".75rem" }}>
                    {d.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
