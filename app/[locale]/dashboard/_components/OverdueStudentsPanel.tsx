"use client";

import Link from "next/link";
import { AlertTriangle, ChevronLeft, CheckCircle2 } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { DashboardOverdueStudent } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/brand/brand-utils";

interface OverdueStudentsPanelProps {
  overdueStudents: DashboardOverdueStudent[];
  paymentsPageHref: string;
}

export function OverdueStudentsPanel({ overdueStudents, paymentsPageHref }: OverdueStudentsPanelProps) {
  return (
    <Card className="border-none shadow-md bg-white dark:bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <span>طلاب متأخرون عن السداد</span>
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
          {overdueStudents.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-sm flex flex-col items-center gap-2">
              <CheckCircle2 size={24} />
              <span>لا يوجد طلاب متأخرون حالياً</span>
            </div>
          ) : (
            overdueStudents.map((s) => (
              <div 
                key={s.id} 
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/20"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    {s.full_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {s.class_name}
                  </div>
                </div>
                <div className="text-left rtl:text-right shrink-0">
                  <div className="text-[10px] text-rose-500 font-bold mb-0.5 uppercase tracking-wider">
                    المبلغ المتبقي
                  </div>
                  <div className="font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                    د.ع {formatNumber(s.remaining_fee)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
