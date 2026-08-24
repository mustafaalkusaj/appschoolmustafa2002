"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface BehaviorRecord {
  id: string;
  date: string;
  type: "positive" | "negative";
  points: number;
  reason: string | null;
  teacher_name: string | null;
}

export default function StudentBehaviorPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/behavior")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setRecords(d?.records ?? []);
          setTotalPoints(d?.total_points ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell
      currentPath="/student/behavior"
      titleAr="سلوكي"
      titleEn="My Behavior"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {totalPoints != null && (
              <div className="rounded-xl border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isAr ? "مجموع النقاط" : "Total Points"}
                </p>
                <p className={`text-3xl font-bold mt-1 ${totalPoints >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {totalPoints > 0 ? `+${totalPoints}` : String(totalPoints)}
                </p>
              </div>
            )}

            {records.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-muted-foreground">
                <p className="text-4xl mb-2">⭐</p>
                <p>{isAr ? "لا توجد سجلات سلوك" : "No behavior records"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-lg border p-4 flex items-start gap-3 ${
                      r.type === "positive"
                        ? "border-emerald-200 dark:border-emerald-800"
                        : "border-red-200 dark:border-red-800"
                    }`}
                  >
                    <span className="text-xl">{r.type === "positive" ? "✅" : "⚠️"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {r.reason ?? (isAr ? "بدون سبب" : "No reason")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.date}
                        {r.teacher_name ? ` · ${r.teacher_name}` : ""}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${r.type === "positive" ? "text-emerald-600" : "text-red-600"}`}>
                      {r.type === "positive" ? `+${r.points}` : `-${r.points}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
