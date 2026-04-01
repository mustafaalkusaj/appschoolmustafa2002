"use client";

import { AppIcon } from "@/components/AppIcon";
import { formatNumber, formatDate } from "@/lib/formatting";
import type { SalaryArchive } from "../_types";

interface ArchiveSectionProps {
  archives: SalaryArchive[];
  currentMonth: string;
  onArchive: () => void;
}

export function ArchiveSection({
  archives,
  currentMonth: _currentMonth,
  onArchive,
}: ArchiveSectionProps) {
  return (
    <>
      <div
        style={{
          background: "#FEF3C7",
          border: "1px solid #FDE68A",
          borderRadius: 13,
          padding: "1rem 1.2rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontSize: ".88rem",
            fontWeight: 800,
            color: "#92400E",
            marginBottom: ".4rem",
            display: "flex",
            alignItems: "center",
            gap: ".35rem",
          }}
        >
          <AppIcon token="⚠️" size={14} />
          إجراء نهاية الشهر
        </div>
        <div style={{ fontSize: ".8rem", color: "#92400E", marginBottom: ".8rem" }}>
          عند الضغط على "أرشفة الشهر الحالي"، سيتم حفظ نسخة من جميع البيانات الحالية وتفريغ العدادات لبدء شهر جديد.
        </div>
        <button
          onClick={onArchive}
          style={{
            padding: ".7rem 1.5rem",
            background: "linear-gradient(135deg,#F59E0B,#D97706)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontFamily: "var(--font-manrope),Segoe UI,sans-serif",
            fontSize: ".88rem",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="🗄️" size={14} />
            أرشفة الشهر الحالي وتصفير العدادات
          </span>
        </button>
      </div>

      <div style={{ fontSize: ".88rem", fontWeight: 800, marginBottom: ".7rem", color: "var(--dark)" }}>
        الأرشيفات السابقة
      </div>

      {archives.length === 0 ? (
        <div className="empty">لا يوجد أرشيف محفوظ</div>
      ) : (
        archives.map((a) => (
          <div className="arch-card" key={a.id}>
            <div>
              <div className="arch-month" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                <AppIcon token="📅" size={14} />
                {a.month}
              </div>
              <div className="arch-info">
                {a.total_teachers} أستاذ • تاريخ الأرشفة: {formatDate(a.archive_date)}
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="arch-amount">د.ع {formatNumber(a.total_amount || 0)}</div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
