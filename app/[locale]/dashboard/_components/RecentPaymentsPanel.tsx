"use client";

import Link from "next/link";
import { AppIcon } from "@/components/AppIcon";
import { formatDate, formatNumber } from "@/lib/formatting";
import { DashboardRecentPayment } from "./types";

interface RecentPaymentsPanelProps {
  recentPayments: DashboardRecentPayment[];
  paymentsPageHref: string;
}

export function RecentPaymentsPanel({ recentPayments, paymentsPageHref }: RecentPaymentsPanelProps) {
  return (
    <div className="panel">
      <div className="ph">
        <span className="pt" style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
          <AppIcon token="💳" size={14} />
          آخر الحسابات
        </span>
        <Link href={paymentsPageHref} style={{ fontSize: ".72rem", color: "var(--p3)", fontWeight: 600, textDecoration: "none" }}>
          عرض الكل
        </Link>
      </div>
      {recentPayments.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--gray)", fontSize: ".82rem", padding: "1rem" }}>
          لا توجد دفعات حتى الآن
        </div>
      ) : (
        recentPayments.map((p) => (
          <div className="pay-item" key={p.id}>
            <div className="pay-av">{(p.student_name || "؟")[0]}</div>
            <div style={{ flex: 1 }}>
              <div className="pay-name">{p.student_name || "—"}</div>
              <div className="pay-meta">{p.class_name || "—"} • {p.created_at ? formatDate(p.created_at) : "—"}</div>
            </div>
            <div style={{ fontWeight: 800, color: "#10B981", fontSize: ".8rem" }}>د.ع {formatNumber(p.amount)}</div>
          </div>
        ))
      )}
    </div>
  );
}
