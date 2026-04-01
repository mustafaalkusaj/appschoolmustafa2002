"use client";

import { AppIcon } from "@/components/AppIcon";
import type { LecturePrice, ClassItem } from "../_types";

interface PricesModalProps {
  show: boolean;
  classes: ClassItem[];
  lecturePrices: LecturePrice[];
  priceEdits: Record<string, number>;
  onClose: () => void;
  onPriceChange: (grade: string, price: number) => void;
  onSave: () => void;
}

export function PricesModal({
  show,
  classes,
  lecturePrices: _lecturePrices,
  priceEdits,
  onClose,
  onPriceChange,
  onSave,
}: PricesModalProps) {
  if (!show) return null;

  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-sm">
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="🏷️" size={16} />
            أسعار المحاضرات
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        <p style={{ fontSize: ".8rem", color: "var(--gray)", marginBottom: "1rem" }}>
          حدد سعر المحاضرة الواحدة لكل صف ليتم احتساب الرواتب تلقائياً.
        </p>
        {gradeOptions.map((grade) => (
          <div
            key={grade}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: ".6rem .4rem",
              borderBottom: "1px solid rgba(79,140,255,0.06)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: ".88rem" }}>{grade}</span>
            <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <input
                type="number"
                value={priceEdits[grade] || 0}
                onChange={(e) => onPriceChange(grade, parseInt(e.target.value) || 0)}
                style={{
                  width: 100,
                  padding: ".4rem .6rem",
                  background: "#F7FBFF",
                  border: "1.5px solid rgba(79,140,255,0.15)",
                  borderRadius: 8,
                  fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
                  fontSize: ".82rem",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: ".75rem", color: "var(--gray)" }}>د.ع</span>
            </div>
          </div>
        ))}
        <div className="fa">
          <button className="bs" onClick={onSave}>حفظ الأسعار</button>
          <button className="bc" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
