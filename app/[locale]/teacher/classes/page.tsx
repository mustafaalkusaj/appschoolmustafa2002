"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Users, FileText } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface TeacherClass {
  id: string;
  class_name: string;
  student_count: number;
  subjects: string[];
}

export default function TeacherClassesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/classes")
      .then((res) => {
        if (res.response.ok)
          setClasses((res.payload as any)?.data?.classes ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeacherShell
      currentPath="/teacher/classes"
      titleAr="صفوفي"
      titleEn="My Classes"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[140px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا توجد صفوف مسندة إليك", "No classes assigned to you")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                onClick={() =>
                  router.push(`/${locale}/teacher/students?class_name=${encodeURIComponent(cls.class_name)}`)
                }
              >
                <CardContent className="pt-[var(--card-padding)]">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--primary)]/[0.1]">
                      <BookOpen className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                        {cls.class_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">
                          {cls.student_count} {t("طالب", "students")}
                        </span>
                      </div>
                      {cls.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cls.subjects.map((subj) => (
                            <Badge key={subj} variant="info" size="sm">
                              {subj}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
