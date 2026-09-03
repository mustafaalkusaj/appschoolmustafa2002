"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Users, Phone, Search, Filter } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Student {
  id: string;
  full_name: string;
  class_name: string | null;
  phone: string | null;
}

export default function TeacherStudentsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [students, setStudents] = useState<Student[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState(
    searchParams.get("class_name") ?? "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = selectedClass
      ? `/api/teacher/students?class_name=${encodeURIComponent(selectedClass)}`
      : "/api/teacher/students";
    setLoading(true);
    fetchJsonWithAuthorizedSession(url)
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setStudents(d?.students ?? []);
          if (d?.class_names) setClassNames(d.class_names);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const filtered = searchQuery
    ? students.filter((s) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : students;

  return (
    <TeacherShell
      currentPath="/teacher/students"
      titleAr="طلابي"
      titleEn="My Students"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={t("بحث بالاسم...", "Search by name...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] ps-9 pe-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
            />
          </div>
          {classNames.length > 0 && (
            <div className="relative">
              <Filter className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] ps-9 pe-8 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all appearance-none min-w-[160px]"
              >
                <option value="">{t("جميع الصفوف", "All Classes")}</option>
                {classNames.map((cn) => (
                  <option key={cn} value={cn}>
                    {cn}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[60px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا يوجد طلاب", "No students found")}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle className="text-sm sm:text-base">
                    {t("قائمة الطلاب", "Student List")}
                  </CardTitle>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {filtered.length} {t("طالب", "students")}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filtered.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg border border-[var(--card-border)] p-2.5 sm:p-3 hover:bg-[var(--surface-strong)] transition-all"
                  >
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)]/[0.1]">
                      <span className="text-xs font-bold text-[var(--primary)]">
                        {student.full_name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">
                        {student.full_name}
                      </p>
                      {student.class_name && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {student.class_name}
                        </p>
                      )}
                    </div>
                    {student.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Phone className="h-3 w-3 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]" dir="ltr">
                          {student.phone}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherShell>
  );
}
