"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface ExamRecord {
  id: string;
  subject_name: string;
  exam_date: string;
  exam_type: string | null;
  max_score: number | null;
  room: string | null;
}

export default function StudentExamsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/exams")
      .then((res) => {
        if (res.response.ok) setExams((res.payload as any)?.data?.exams ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = exams.filter((e) => e.exam_date >= now);
  const past = exams.filter((e) => e.exam_date < now);

  return (
    <StudentShell
      currentPath="/student/exams"
      titleAr="امتحاناتي"
      titleEn="My Exams"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">📝</p>
            <p>{isAr ? "لا توجد امتحانات" : "No exams scheduled"}</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  {isAr ? "الامتحانات القادمة" : "Upcoming Exams"}
                </h2>
                <div className="space-y-2">
                  {upcoming.map((e) => (
                    <ExamCard key={e.id} exam={e} isAr={isAr} highlight />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  {isAr ? "الامتحانات السابقة" : "Past Exams"}
                </h2>
                <div className="space-y-2">
                  {past.map((e) => (
                    <ExamCard key={e.id} exam={e} isAr={isAr} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}

function ExamCard({
  exam,
  isAr,
  highlight,
}: {
  exam: ExamRecord;
  isAr: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${highlight ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20" : ""}`}>
      <div className="text-2xl">📝</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{exam.subject_name}</p>
        <p className="text-xs text-muted-foreground">
          {exam.exam_date}
          {exam.exam_type ? ` · ${exam.exam_type}` : ""}
          {exam.max_score ? ` · ${isAr ? "من" : "out of"} ${exam.max_score}` : ""}
        </p>
      </div>
      {exam.room && (
        <span className="text-xs bg-muted px-2 py-1 rounded-md">{exam.room}</span>
      )}
    </div>
  );
}
