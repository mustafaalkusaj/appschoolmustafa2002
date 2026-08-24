"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useRole } from "@/hooks/useRole";

interface StudentDashboardData {
  full_name: string | null;
  class_name: string | null;
  school_name: string | null;
  attendance_rate: number | null;
  total_payments: number | null;
  remaining_balance: number | null;
  upcoming_exams: number;
  behavior_points: number | null;
}

export default function StudentDashboardPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const { profile } = useRole();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/dashboard")
      .then((res) => {
        if (res.response.ok) setData((res.payload as any)?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = isAr
    ? `مرحباً، ${profile?.full_name ?? "طالب"}`
    : `Welcome, ${profile?.full_name ?? "Student"}`;

  return (
    <StudentShell
      currentPath="/student"
      titleAr="الرئيسية"
      titleEn="Home"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "ملخص حسابك الدراسي" : "Your academic summary"}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {data.class_name && (
              <p className="text-sm text-muted-foreground -mt-4">
                {isAr ? "الصف:" : "Class:"} {data.class_name}
                {data.school_name ? ` — ${data.school_name}` : ""}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon="📋"
                label={isAr ? "نسبة الحضور" : "Attendance Rate"}
                value={data.attendance_rate != null ? `${data.attendance_rate}%` : "—"}
                color="bg-emerald-50 dark:bg-emerald-950/30"
              />
              <StatCard
                icon="📝"
                label={isAr ? "امتحانات قادمة" : "Upcoming Exams"}
                value={String(data.upcoming_exams)}
                color="bg-blue-50 dark:bg-blue-950/30"
              />
              <StatCard
                icon="⭐"
                label={isAr ? "نقاط السلوك" : "Behavior Points"}
                value={data.behavior_points != null ? String(data.behavior_points) : "—"}
                color="bg-amber-50 dark:bg-amber-950/30"
              />
              <StatCard
                icon="💳"
                label={isAr ? "الرصيد المتبقي" : "Remaining Balance"}
                value={
                  data.remaining_balance != null
                    ? `${data.remaining_balance.toLocaleString()} IQD`
                    : "—"
                }
                color="bg-violet-50 dark:bg-violet-950/30"
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            {isAr ? "لا توجد بيانات حالياً" : "No data available"}
          </div>
        )}
      </div>
    </StudentShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color} border`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}
