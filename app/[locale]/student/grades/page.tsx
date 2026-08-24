"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface GradeRecord {
  id: string;
  subject_name: string;
  exam_name: string | null;
  score: number;
  max_score: number;
  percentage: number;
  date: string | null;
  type: string | null;
}

export default function StudentGradesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/grades")
      .then((res) => {
        if (res.response.ok) setGrades((res.payload as any)?.data?.grades ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentShell
      currentPath="/student/grades"
      titleAr="درجاتي"
      titleEn="My Grades"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : grades.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">🎓</p>
            <p>{isAr ? "لا توجد درجات مسجلة" : "No grades recorded"}</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">{isAr ? "المادة" : "Subject"}</th>
                    <th className="px-4 py-3 text-start font-medium">{isAr ? "الامتحان" : "Exam"}</th>
                    <th className="px-4 py-3 text-start font-medium">{isAr ? "الدرجة" : "Score"}</th>
                    <th className="px-4 py-3 text-start font-medium">{isAr ? "النسبة" : "Percentage"}</th>
                    <th className="px-4 py-3 text-start font-medium">{isAr ? "التاريخ" : "Date"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grades.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{g.subject_name}</td>
                      <td className="px-4 py-3">{g.exam_name ?? "—"}</td>
                      <td className="px-4 py-3">{g.score} / {g.max_score}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          g.percentage >= 80
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : g.percentage >= 50
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {g.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{g.date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
