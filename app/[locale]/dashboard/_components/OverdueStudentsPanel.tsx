"use client";

import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { formatNumber } from "@/lib/formatting";
import { DashboardOverdueStudent } from "./types";

interface OverdueStudentsPanelProps {
  overdueStudents: DashboardOverdueStudent[];
  paymentsPageHref: string;
}

export function OverdueStudentsPanel({ overdueStudents, paymentsPageHref }: OverdueStudentsPanelProps) {
  return (
    <div className="panel">
      <div className="ph">
        <span className="pt" style={{ color: "#EF4444", display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
          <AppIcon token="⚠️" size={14} />
          Overdue students
        </span>
        <Link href={paymentsPageHref} style={{ fontSize: ".72rem", color: "var(--p3)", fontWeight: 600, textDecoration: "none" }}>
          عرض الكل
        </Link>
      </div>
      {overdueStudents.length === 0 ? (
        <div style={{ textAlign: "center", color: "#10B981", fontSize: ".82rem", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".3rem" }}>
          <AppIcon token="✓" size={14} />
          No overdue students
        </div>
      ) : (
        overdueStudents.map((s) => (
          <div className="ov-card" key={s.id}>
            <div className="ov-name">{s.full_name}</div>
            <div className="ov-class">{s.class_name}</div>
            <div className="ov-amt">د.ع {formatNumber(s.remaining_fee)}</div>
          </div>
        ))
      )}
    </div>
  );
}
