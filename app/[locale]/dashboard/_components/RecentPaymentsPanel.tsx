"use client";

import Link from "next/link";
import { CreditCard, ChevronLeft } from "@/lib/icons";
import { formatDate, formatNumber } from "@/lib/formatting";
import { DashboardRecentPayment } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/brand/brand-utils";

interface RecentPaymentsPanelProps {
  recentPayments: DashboardRecentPayment[];
  paymentsPageHref: string;
}

export function RecentPaymentsPanel({ recentPayments, paymentsPageHref }: RecentPaymentsPanelProps) {
  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          <span>آخر التحصيلات</span>
        </CardTitle>
        <Link 
          href={paymentsPageHref} 
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft size={14} />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-800/50 text-muted-foreground text-sm">
              لا توجد دفعات مسجلة حتى الآن
            </div>
          ) : (
            recentPayments.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {(p.student_name || "؟")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {p.student_name || "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {p.class_name || "—"} • {p.created_at ? formatDate(p.created_at) : "—"}
                  </div>
                </div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                  د.ع {formatNumber(p.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
