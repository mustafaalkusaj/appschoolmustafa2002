"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  BookOpen,
  Star,
  Wallet,
  TrendingUp,
  Award,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Megaphone,
  CreditCard,
  ClipboardList,
  BarChart3,
  User,
} from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { GradeChart } from "@/components/student/GradeChart";
import { ExamCountdown } from "@/components/student/ExamCountdown";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { useRole } from "@/hooks/useRole";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

interface ScheduleSlot {
  id: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string | null;
  room: string | null;
}

interface RecentGrade {
  id: string;
  subject_name: string;
  exam_type: string | null;
  score: number;
  max_score: number;
  percentage: number;
  date: string;
}

interface RecentBehavior {
  id: string;
  type: "positive" | "negative";
  points: number;
  reason: string | null;
  date: string;
}

interface UpcomingExam {
  id: string;
  subject_name: string;
  exam_date: string;
  exam_type: string | null;
}

interface UpcomingAssignment {
  id: string;
  title: string;
  subject: string | null;
  due_at: string;
  content_kind: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
  media_url: string | null;
}

interface DashboardData {
  student_name: string | null;
  class_name: string | null;
  attendance_rate: number | null;
  attendance_total: number;
  attendance_present: number;
  attendance_absent: number;
  grade_average: number | null;
  upcoming_exams_count: number;
  upcoming_exams: UpcomingExam[];
  behavior_points: number | null;
  total_fee: number;
  total_paid: number;
  remaining_balance: number | null;
  today_schedule: ScheduleSlot[];
  recent_grades: RecentGrade[];
  recent_behavior: RecentBehavior[];
  upcoming_assignments: UpcomingAssignment[];
  announcements: Announcement[];
}

function AttendanceRing({ rate }: { rate: number | null }) {
  const pct = rate ?? 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color =
    pct >= 80
      ? "var(--success)"
      : pct >= 60
        ? "var(--warning)"
        : "var(--danger)";

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="color-mix(in srgb, var(--border) 40%, transparent)"
        strokeWidth="8"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        className="fill-[var(--text-primary)]"
        style={{ fontSize: "18px", fontWeight: 700 }}
      >
        {rate != null ? `${rate}%` : "—"}
      </text>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        className="fill-[var(--text-muted)]"
        style={{ fontSize: "10px" }}
      >
        حضور
      </text>
    </svg>
  );
}

function GradeBar({ average }: { average: number | null }) {
  const pct = average ?? 0;
  const color =
    pct >= 80
      ? "var(--success)"
      : pct >= 60
        ? "var(--warning)"
        : "var(--danger)";
  const label =
    pct >= 90
      ? "ممتاز"
      : pct >= 80
        ? "جيد جداً"
        : pct >= 70
          ? "جيد"
          : pct >= 60
            ? "مقبول"
            : "ضعيف";

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-3xl font-bold" style={{ color }}>
        {average != null ? `${average}%` : "—"}
      </span>
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <div className="w-full h-2 rounded-full bg-[color-mix(in_srgb,var(--border)_40%,transparent)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const { profile } = useRole();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/dashboard")
      .then((res) => {
        if (res.response.ok) setData((res.payload as { data: DashboardData })?.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const t = (ar: string, en: string) => (isAr ? ar : en);
  const Arrow = isAr ? ChevronLeft : ChevronRight;
  const studentName =
    data?.student_name ?? profile?.full_name ?? t("طالب", "Student");
  const initials = studentName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  const quickLinks = [
    { label: t("الحضور", "Attendance"), icon: ClipboardList, href: "/student/attendance", color: "var(--success)" },
    { label: t("الدرجات", "Grades"), icon: BarChart3, href: "/student/grades", color: "var(--info)" },
    { label: t("الجدول", "Schedule"), icon: CalendarDays, href: "/student/schedule", color: "var(--primary)" },
    { label: t("الامتحانات", "Exams"), icon: GraduationCap, href: "/student/exams", color: "var(--warning)" },
    { label: t("السلوك", "Behavior"), icon: Star, href: "/student/behavior", color: "var(--danger)" },
    { label: t("الواجبات", "Assignments"), icon: FileText, href: "/student/assignments", color: "#8b5cf6" },
    { label: t("الأقساط", "Payments"), icon: CreditCard, href: "/student/payments", color: "#f59e0b" },
    { label: t("ملفي", "Profile"), icon: User, href: "/student/profile", color: "var(--text-secondary)" },
  ];

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function slotMinutes(timeStr: string) {
    const [h, m] = (timeStr ?? "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function getNextSlotId() {
    if (!data) return null;
    const activeExists = data.today_schedule.some(
      (s) =>
        nowMinutes >= slotMinutes(s.start_time) &&
        nowMinutes < slotMinutes(s.end_time),
    );
    if (activeExists) return null;
    const future = data.today_schedule.filter(
      (s) => slotMinutes(s.start_time) > nowMinutes,
    );
    return future.length > 0 ? future[0].id : null;
  }

  const nextSlotId = getNextSlotId();

  return (
    <StudentShell currentPath="/student" titleAr="الرئيسية" titleEn="Home">
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="h-16 sm:h-24 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="h-32 sm:h-40 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
              <div className="h-32 sm:h-40 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
            </div>
            <div className="h-24 sm:h-32 rounded-xl sm:rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse" />
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
                  {t("مرحباً،", "Welcome,")} {studentName}
                </h1>
                {data.class_name && (
                  <p className="text-xs sm:text-sm opacity-80 mt-0.5">{data.class_name}</p>
                )}
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
                  <link.icon
                    className="h-4 w-4"
                    style={{ color: link.color }}
                  />
                  {link.label}
                </button>
              ))}
            </div>

            {/* Performance Bento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div
                className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                onClick={() => router.push(`/${locale}/student/attendance`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {t("الحضور", "Attendance")}
                    </p>
                    <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      {data.attendance_present} {t("من", "of")}{" "}
                      {data.attendance_total}
                    </span>
                    <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3">
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                        <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                          {t("حاضر", "Present")} {data.attendance_present}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                        <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                          {t("غائب", "Absent")} {data.attendance_absent}
                        </span>
                      </div>
                    </div>
                  </div>
                  <AttendanceRing rate={data.attendance_rate} />
                </div>
              </div>

              <div
                className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                onClick={() => router.push(`/${locale}/student/grades`)}
              >
                <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 sm:mb-3">
                  {t("المعدل العام", "Grade Average")}
                </p>
                <GradeBar average={data.grade_average} />
                <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-2 text-center">
                  {data.recent_grades.length > 0
                    ? `${t("آخر درجة:", "Latest:")} ${data.recent_grades[0].subject_name} ${data.recent_grades[0].percentage}%`
                    : t("لا توجد درجات بعد", "No grades yet")}
                </p>
              </div>
            </div>

            {/* Featured Action Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                }}
                onClick={() => router.push(`/${locale}/student/exams`)}
              >
                <GraduationCap className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">
                  {data.upcoming_exams_count}
                </p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">
                  {t("امتحان قادم", "Upcoming Exams")}
                </p>
              </div>

              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
                  color: "white",
                }}
                onClick={() => router.push(`/${locale}/student/assignments`)}
              >
                <FileText className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">
                  {data.upcoming_assignments.length}
                </p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">
                  {t("واجب قادم", "Upcoming Tasks")}
                </p>
              </div>

              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
                style={{
                  background:
                    (data.remaining_balance ?? 0) > 0
                      ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                      : "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                }}
                onClick={() => router.push(`/${locale}/student/payments`)}
              >
                <Wallet className="h-5 w-5 sm:h-8 sm:w-8 mb-1 sm:mb-2 opacity-80" />
                <p className="text-lg sm:text-2xl font-bold">
                  {(data.remaining_balance ?? 0) > 0
                    ? `${(data.remaining_balance ?? 0).toLocaleString()}`
                    : t("مسدد", "Paid")}
                </p>
                <p className="text-[10px] sm:text-sm opacity-80 leading-tight">
                  {(data.remaining_balance ?? 0) > 0
                    ? t("متبقي (د.ع)", "Remaining (IQD)")
                    : t("الأقساط مدفوعة", "All paid")}
                </p>
              </div>
            </div>

            {/* Payment Progress */}
            {data.total_fee > 0 && (
              <Card className="rounded-2xl cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/${locale}/student/payments`)}>
                <CardContent className="pt-4 sm:pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {t("تقدم الدفع", "Payment Progress")}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {Math.round((data.total_paid / data.total_fee) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round(
                      (data.total_paid / data.total_fee) * 100,
                    )}
                    className="h-2.5"
                  />
                  <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                    <span>
                      {t("المدفوع:", "Paid:")}{" "}
                      {data.total_paid.toLocaleString()} IQD
                    </span>
                    <span>
                      {t("المتبقي:", "Remaining:")}{" "}
                      {(data.remaining_balance ?? 0).toLocaleString()} IQD
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  onClick={() => router.push(`/${locale}/student/schedule`)}
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
                    const isActive =
                      nowMinutes >= startMin && nowMinutes < endMin;
                    const isNext = slot.id === nextSlotId;
                    const isPast = nowMinutes >= endMin;

                    return (
                      <div
                        key={slot.id}
                        className="shrink-0 w-36 sm:w-44 rounded-xl sm:rounded-2xl border p-3 sm:p-4 snap-start transition-all"
                        style={{
                          borderColor: isActive
                            ? "var(--primary)"
                            : "var(--card-border)",
                          backgroundColor: isActive
                            ? "color-mix(in srgb, var(--primary) 8%, var(--card-bg))"
                            : "var(--card-bg)",
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
                        {isNext && (
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-[10px] font-semibold text-[var(--info)]">
                              {t("التالي", "NEXT")}
                            </span>
                          </div>
                        )}
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {slot.subject_name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                          {slot.start_time?.slice(0, 5)} –{" "}
                          {slot.end_time?.slice(0, 5)}
                        </p>
                        {slot.teacher_name && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                            {slot.teacher_name}
                          </p>
                        )}
                        {slot.room && (
                          <Badge variant="info" size="sm" className="mt-2">
                            {slot.room}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Exams + Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[var(--info)]" />
                      <CardTitle className="text-sm sm:text-base">
                        {t("الامتحانات القادمة", "Upcoming Exams")}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => router.push(`/${locale}/student/exams`)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      {t("عرض الكل", "View All")}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.upcoming_exams.length === 0 ? (
                    <EmptyState
                      icon={
                        <GraduationCap className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t(
                        "لا توجد امتحانات قادمة",
                        "No upcoming exams",
                      )}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.upcoming_exams.map((exam) => (
                        <div
                          key={exam.id}
                          className="cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
                          onClick={() => router.push(`/${locale}/student/exams`)}
                        >
                          <ExamCountdown
                            examDate={exam.exam_date}
                            subjectName={`${exam.subject_name}${exam.exam_type ? ` · ${exam.exam_type}` : ""}`}
                            isAr={isAr}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText
                        className="h-5 w-5"
                        style={{ color: "#8b5cf6" }}
                      />
                      <CardTitle className="text-sm sm:text-base">
                        {t("الواجبات القادمة", "Upcoming Assignments")}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => router.push(`/${locale}/student/assignments`)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      {t("عرض الكل", "View All")}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.upcoming_assignments.length === 0 ? (
                    <EmptyState
                      icon={
                        <FileText className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t(
                        "لا توجد واجبات قادمة",
                        "No upcoming assignments",
                      )}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-2">
                      {data.upcoming_assignments.map((a) => {
                        const daysLeft = Math.ceil(
                          (new Date(a.due_at).getTime() - Date.now()) /
                            86400000,
                        );
                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-2 sm:gap-3 rounded-xl border border-[var(--card-border)] p-2.5 sm:p-3 cursor-pointer hover:bg-[var(--surface-strong)] active:scale-[0.98] transition-all"
                            onClick={() => router.push(`/${locale}/student/assignments`)}
                          >
                            <div
                              className="shrink-0 flex flex-col items-center justify-center rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 min-w-[44px] sm:min-w-[52px]"
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, #8b5cf6 8%, transparent)",
                              }}
                            >
                              <span
                                className="text-base sm:text-lg font-bold"
                                style={{ color: "#8b5cf6" }}
                              >
                                {daysLeft}
                              </span>
                              <span
                                className="text-[10px]"
                                style={{ color: "#8b5cf6" }}
                              >
                                {t("يوم", "days")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {a.title}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {a.subject ?? a.content_kind} · {a.due_at}
                              </p>
                            </div>
                            <Arrow className="h-4 w-4 text-[var(--text-muted)]" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Grades + Behavior */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[var(--success)]" />
                      <CardTitle className="text-sm sm:text-base">
                        {t("آخر الدرجات", "Recent Grades")}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => router.push(`/${locale}/student/grades`)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      {t("عرض الكل", "View All")}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.recent_grades.length === 0 ? (
                    <EmptyState
                      icon={
                        <TrendingUp className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t("لا توجد درجات بعد", "No grades yet")}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-4">
                      <GradeChart grades={data.recent_grades} />
                      <div className="space-y-3">
                        {data.recent_grades.map((g) => (
                          <div key={g.id} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {g.subject_name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {g.exam_type ?? ""} · {g.date}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                {g.score}/{g.max_score}
                              </span>
                              <Badge
                                variant={
                                  g.percentage >= 80
                                    ? "success"
                                    : g.percentage >= 50
                                      ? "warning"
                                      : "danger"
                                }
                                size="sm"
                              >
                                {g.percentage}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-[var(--warning)]" />
                      <CardTitle className="text-sm sm:text-base">
                        {t("السلوك", "Behavior")}
                        {data.behavior_points != null && (
                          <span
                            className="ms-2 text-sm font-bold"
                            style={{
                              color:
                                (data.behavior_points ?? 0) >= 0
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            {data.behavior_points > 0
                              ? `+${data.behavior_points}`
                              : data.behavior_points}
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => router.push(`/${locale}/student/behavior`)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                      {t("عرض الكل", "View All")}
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.recent_behavior.length === 0 ? (
                    <EmptyState
                      icon={
                        <Star className="h-10 w-10 text-[var(--text-tertiary)]" />
                      }
                      title={t(
                        "لا توجد سجلات سلوك",
                        "No behavior records",
                      )}
                      className="py-6 min-h-0"
                    />
                  ) : (
                    <div className="space-y-3">
                      {data.recent_behavior.map((b) => (
                        <div key={b.id} className="flex items-center gap-3">
                          <div
                            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full"
                            style={{
                              backgroundColor:
                                b.type === "positive"
                                  ? "color-mix(in srgb, var(--success) 12%, transparent)"
                                  : "color-mix(in srgb, var(--danger) 12%, transparent)",
                            }}
                          >
                            {b.type === "positive" ? (
                              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {b.reason ?? t("بدون سبب", "No reason")}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {b.date}
                            </p>
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color:
                                b.type === "positive"
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            {b.type === "positive"
                              ? `+${b.points}`
                              : `-${b.points}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
          <EmptyState
            title={t("لا توجد بيانات حالياً", "No data available")}
          />
        )}
      </div>
    </StudentShell>
  );
}
