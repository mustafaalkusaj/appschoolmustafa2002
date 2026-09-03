"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  CalendarDays,
  Users,
  GraduationCap,
  FileText,
  ClipboardList,
  BarChart3,
  Wallet,
  User,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
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

interface ScheduleSlot {
  id: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  class_name: string | null;
  room: string | null;
}

interface UpcomingExam {
  id: string;
  subject_name: string;
  exam_date: string;
  class_name: string | null;
}

interface RecentAssignment {
  id: string;
  title: string;
  subject: string | null;
  due_at: string;
  class_name: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

interface DashboardData {
  teacher_name: string | null;
  classes_count: number;
  students_count: number;
  upcoming_exams_count: number;
  today_schedule: ScheduleSlot[];
  upcoming_exams: UpcomingExam[];
  recent_assignments: RecentAssignment[];
  announcements: Announcement[];
}

export default function TeacherDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const Arrow = isAr ? ChevronLeft : ChevronRight;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/dashboard")
      .then((res) => {
        if (res.response.ok)
          setData((res.payload as { data: DashboardData })?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const teacherName = data?.teacher_name ?? t("معلم", "Teacher");
  const initials = teacherName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function slotMinutes(timeStr: string) {
    const [h, m] = (timeStr ?? "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  const quickLinks = [
    { label: t("الجدول", "Schedule"), icon: CalendarDays, href: "/teacher/schedule", color: "var(--primary)" },
    { label: t("صفوفي", "Classes"), icon: BookOpen, href: "/teacher/classes", color: "var(--info)" },
    { label: t("طلابي", "Students"), icon: Users, href: "/teacher/students", color: "var(--success)" },
    { label: t("الحضور", "Attendance"), icon: ClipboardList, href: "/teacher/attendance", color: "#8b5cf6" },
    { label: t("الدرجات", "Grades"), icon: BarChart3, href: "/teacher/grades", color: "var(--warning)" },
    { label: t("راتبي", "Salary"), icon: Wallet, href: "/teacher/salary", color: "#f59e0b" },
    { label: t("ملفي", "Profile"), icon: User, href: "/teacher/profile", color: "var(--text-secondary)" },
  ];

  return (
    <TeacherShell currentPath="/teacher" titleAr="الرئيسية" titleEn="Home">
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="h-16 sm:h-24 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 sm:h-28 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
              ))}
            </div>
            <div className="h-32 sm:h-40 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
          </div>
        ) : data ? (
          <>
            {/* Welcome Header */}
            <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[color-mix(in_srgb,var(--primary)_70%,#000)] text-white">
              <div className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-base sm:text-xl font-bold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-bold truncate">
                  {t("مرحباً،", "Welcome,")} {teacherName}
                </h1>
                <p className="text-xs sm:text-sm opacity-80 mt-0.5">
                  {t("لوحة تحكم المعلم", "Teacher Dashboard")}
                </p>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="flex gap-2 overflow-x-auto sm:overflow-x-visible sm:flex-wrap pb-1 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory sm:snap-none">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(`/${locale}${link.href}`)}
                  className="shrink-0 sm:shrink snap-start flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--surface-strong)] active:scale-95 transition-all text-xs sm:text-sm font-medium text-[var(--text-primary)]"
                >
                  <link.icon className="h-4 w-4" style={{ color: link.color }} />
                  {link.label}
                </button>
              ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                onClick={() => router.push(`/${locale}/teacher/classes`)}
              >
                <BookOpen className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">{data.classes_count}</p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">{t("صفوف", "Classes")}</p>
              </div>

              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "white" }}
                onClick={() => router.push(`/${locale}/teacher/students`)}
              >
                <Users className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">{data.students_count}</p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">{t("طالب", "Students")}</p>
              </div>

              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}
                onClick={() => router.push(`/${locale}/teacher/grades`)}
              >
                <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">{data.upcoming_exams_count}</p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">{t("امتحان قادم", "Upcoming Exams")}</p>
              </div>
            </div>

            {/* Today's Schedule */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[var(--primary)]" />
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                    {t("جدول اليوم", "Today's Schedule")}
                  </h2>
                </div>
                <button
                  onClick={() => router.push(`/${locale}/teacher/schedule`)}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  {t("عرض الكل", "View All")}
                </button>
              </div>
              {data.today_schedule.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--card-border)] p-8 text-center">
                  <CalendarDays className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">
                    {t("لا توجد حصص اليوم", "No classes today")}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                  {data.today_schedule.map((slot) => {
                    const startMin = slotMinutes(slot.start_time);
                    const endMin = slotMinutes(slot.end_time);
                    const isActive = nowMinutes >= startMin && nowMinutes < endMin;
                    const isPast = nowMinutes >= endMin;

                    return (
                      <div
                        key={slot.id}
                        className="shrink-0 w-36 sm:w-44 rounded-xl sm:rounded-2xl border p-3 sm:p-4 snap-start transition-all"
                        style={{
                          borderColor: isActive ? "var(--primary)" : "var(--card-border)",
                          backgroundColor: isActive ? "color-mix(in srgb, var(--primary) 8%, var(--card-bg))" : "var(--card-bg)",
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >
                        {isActive && (
                          <div className="flex items-center gap-1 mb-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                            <span className="text-[10px] font-bold text-[var(--primary)] uppercase">
                              {t("الآن", "NOW")}
                            </span>
                          </div>
                        )}
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {slot.subject_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </p>
                        {slot.class_name && (
                          <Badge variant="info" size="sm" className="mt-2">
                            {slot.class_name}
                          </Badge>
                        )}
                        {slot.room && (
                          <Badge variant="neutral" size="sm" className="mt-1">
                            {slot.room}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Assignments */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" style={{ color: "#8b5cf6" }} />
                    <CardTitle className="text-sm sm:text-base">
                      {t("آخر الواجبات", "Recent Assignments")}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.recent_assignments.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-10 w-10 text-[var(--text-tertiary)]" />}
                    title={t("لا توجد واجبات", "No assignments")}
                    className="py-6 min-h-0"
                  />
                ) : (
                  <div className="space-y-2">
                    {data.recent_assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 sm:gap-3 rounded-xl border border-[var(--card-border)] p-2.5 sm:p-3 hover:bg-[var(--surface-strong)] transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {a.title}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {a.subject ?? ""}{a.class_name ? ` · ${a.class_name}` : ""} · {a.due_at}
                          </p>
                        </div>
                        <Arrow className="h-4 w-4 text-[var(--text-muted)]" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Announcements */}
            {data.announcements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="h-5 w-5 text-[var(--warning)]" />
                  <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                    {t("الإعلانات", "Announcements")}
                  </h2>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {data.announcements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                            {a.title}
                          </p>
                          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                            {a.body}
                          </p>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                          {a.created_at}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState title={t("لا توجد بيانات حالياً", "No data available")} />
        )}
      </div>
    </TeacherShell>
  );
}
