"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  GraduationCap, Plus, Trash2, RefreshCw, X, Loader2, ClipboardList,
  BarChart3, CalendarDays, CheckCircle2, Settings, Filter, Search,
  ChevronDown, ChevronUp, Edit2, Save, AlertTriangle,
} from "@/lib/icons";

// ============================================================
// Types
// ============================================================

interface Exam {
  id: string;
  school_id: string;
  title: string;
  type: string | null;
  subject: string | null;
  class_name: string | null;
  total_marks: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

interface Attempt {
  id: string;
  exam_id: string;
  student_id: string | null;
  student_name: string | null;
  score: number | null;
  status: string | null;
  submitted_at: string | null;
}

interface Question {
  id: string;
  prompt: string;
  type: string | null;
  difficulty: string | null;
  subject: string | null;
  options: unknown;
  answer: string | null;
}

interface ExamQuestion {
  question_id: string;
  sort_order: number;
  marks: number;
  questions: Question;
}

interface ExamStat {
  examId: string;
  title: string;
  subject: string | null;
  className: string | null;
  totalMarks: number;
  totalAttempts: number;
  completionRate: number;
  avgScore: number;
  passRate: number;
  highest: number;
  lowest: number;
  distribution: Array<{ label: string; count: number }>;
}

interface QuestionDifficulty {
  questionId: string;
  prompt: string;
  timesAnswered: number;
  percentCorrect: number;
  avgTimeSpent: number;
}

interface StudentRank {
  studentId: string;
  studentName: string;
  totalScore: number;
}

interface TrendPoint {
  month: string;
  avgScore: number;
  attemptCount: number;
}

interface ScheduleGroup {
  [date: string]: Exam[];
}

interface ConflictInfo {
  examId: string;
  examTitle: string;
  className: string | null;
  startsAt: string;
  endsAt: string;
}

interface StudentAnswer {
  question_id: string;
  student_answer: unknown;
  is_correct: boolean | null;
  marks_awarded: number | null;
  time_spent_seconds: number | null;
}

type TabKey = "list" | "builder" | "analytics" | "scheduling" | "grading";
type Locale = "ar" | "en";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<Locale, string>> = {
  pageTitle: { ar: "الامتحانات", en: "Exams" },
  pageSubtitle: { ar: "إدارة الامتحانات ومتابعة نتائج الطلاب", en: "Manage exams and track student results" },
  tabList: { ar: "الامتحانات", en: "Exams" },
  tabBuilder: { ar: "منشئ الامتحان", en: "Exam Builder" },
  tabAnalytics: { ar: "التحليلات", en: "Analytics" },
  tabScheduling: { ar: "الجدولة", en: "Scheduling" },
  tabGrading: { ar: "التصحيح", en: "Grading" },
  selectSchool: { ar: "يرجى اختيار مدرسة لعرض الامتحانات", en: "Please select a school to view exams" },
  search: { ar: "بحث...", en: "Search..." },
  allSubjects: { ar: "كل المواد", en: "All Subjects" },
  allStatuses: { ar: "كل الحالات", en: "All Statuses" },
  upcoming: { ar: "قادم", en: "Upcoming" },
  active: { ar: "نشط", en: "Active" },
  completed: { ar: "مكتمل", en: "Completed" },
  expired: { ar: "منتهي", en: "Expired" },
  graded: { ar: "تم التصحيح", en: "Graded" },
  submitted: { ar: "تم التسليم", en: "Submitted" },
  in_progress: { ar: "جاري", en: "In Progress" },
  newExam: { ar: "امتحان جديد", en: "New Exam" },
  addExam: { ar: "إضافة امتحان جديد", en: "Add New Exam" },
  examTitle: { ar: "عنوان الامتحان", en: "Exam Title" },
  subject: { ar: "المادة", en: "Subject" },
  className: { ar: "الصف / الشعبة", en: "Class / Section" },
  examType: { ar: "النوع (شهري / نهائي)", en: "Type (Monthly / Final)" },
  totalMarks: { ar: "الدرجة الكلية", en: "Total Marks" },
  startsAt: { ar: "يبدأ في", en: "Starts At" },
  endsAt: { ar: "ينتهي في", en: "Ends At" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  save: { ar: "حفظ", en: "Save" },
  noExams: { ar: "لا توجد امتحانات بعد", en: "No exams yet" },
  noExamsDesc: { ar: "ابدأ بإضافة امتحان جديد", en: "Start by adding a new exam" },
  viewAttempts: { ar: "عرض المحاولات والنتائج", en: "View Attempts & Results" },
  attempts: { ar: "محاولات", en: "Attempts" },
  unknownStudent: { ar: "طالب غير معروف", en: "Unknown Student" },
  noAttempts: { ar: "لا توجد محاولات لهذا الامتحان بعد", en: "No attempts for this exam yet" },
  titleRequired: { ar: "عنوان الامتحان مطلوب", en: "Exam title is required" },
  loadError: { ar: "تعذر تحميل الامتحانات", en: "Failed to load exams" },
  saveError: { ar: "تعذر حفظ الامتحان", en: "Failed to save exam" },
  deleteError: { ar: "تعذر الحذف", en: "Failed to delete" },
  unexpectedError: { ar: "خطأ غير متوقع", en: "Unexpected error" },
  deleteConfirmTitle: { ar: "حذف الامتحان", en: "Delete Exam" },
  deleteConfirmDesc: { ar: "هل أنت متأكد من حذف هذا الامتحان؟ لا يمكن التراجع عن هذا الإجراء.", en: "Are you sure you want to delete this exam? This action cannot be undone." },
  delete: { ar: "حذف", en: "Delete" },
  retry: { ar: "إعادة المحاولة", en: "Retry" },
  // Builder
  selectExam: { ar: "اختر الامتحان", en: "Select Exam" },
  selectPlaceholder: { ar: "— اختر —", en: "— Select —" },
  availableQuestions: { ar: "الأسئلة المتاحة", en: "Available Questions" },
  selectedQuestions: { ar: "الأسئلة المختارة", en: "Selected Questions" },
  allLevels: { ar: "كل المستويات", en: "All Levels" },
  easy: { ar: "سهل", en: "Easy" },
  medium: { ar: "متوسط", en: "Medium" },
  hard: { ar: "صعب", en: "Hard" },
  allTypes: { ar: "كل الأنواع", en: "All Types" },
  multipleChoice: { ar: "اختيار متعدد", en: "Multiple Choice" },
  trueFalse: { ar: "صح/خطأ", en: "True/False" },
  essay: { ar: "مقالي", en: "Essay" },
  fillBlank: { ar: "ملء الفراغ", en: "Fill in the Blank" },
  noQuestions: { ar: "لا توجد أسئلة متاحة", en: "No questions available" },
  noQuestionsAdded: { ar: "لم تتم إضافة أسئلة بعد", en: "No questions added yet" },
  marksPerQ: { ar: "درجة السؤال:", en: "Marks per Q:" },
  totalLabel: { ar: "المجموع:", en: "Total:" },
  mark: { ar: "درجة", en: "mark(s)" },
  examSettings: { ar: "إعدادات الامتحان", en: "Exam Settings" },
  duration: { ar: "المدة (بالدقائق)", en: "Duration (minutes)" },
  maxAttempts: { ar: "أقصى عدد محاولات", en: "Max Attempts" },
  passingMarks: { ar: "درجة النجاح", en: "Passing Marks" },
  instructions: { ar: "التعليمات", en: "Instructions" },
  shuffleQ: { ar: "خلط الأسئلة", en: "Shuffle Questions" },
  shuffleO: { ar: "خلط الخيارات", en: "Shuffle Options" },
  autoSubmit: { ar: "تسليم تلقائي", en: "Auto Submit" },
  lockBrowser: { ar: "قفل المتصفح", en: "Lock Browser" },
  showResults: { ar: "عرض النتائج فوراً", en: "Show Results Immediately" },
  allowReview: { ar: "السماح بالمراجعة", en: "Allow Review" },
  saveBuilder: { ar: "حفظ بناء الامتحان", en: "Save Exam Builder" },
  selectExamAndQ: { ar: "اختر امتحاناً وأضف أسئلة أولاً", en: "Select an exam and add questions first" },
  builderSaveError: { ar: "تعذر حفظ بناء الامتحان", en: "Failed to save exam builder" },
  builderSuccess: { ar: "تم حفظ بناء الامتحان والإعدادات بنجاح", en: "Exam builder and settings saved successfully" },
  // Analytics
  allExams: { ar: "كل الامتحانات", en: "All Exams" },
  noAnalytics: { ar: "لا توجد بيانات تحليلية", en: "No analytics data" },
  noAnalyticsDesc: { ar: "ستظهر البيانات عند وجود محاولات", en: "Data will appear when attempts exist" },
  avgScore: { ar: "متوسط الدرجات", en: "Avg Score" },
  passRate: { ar: "نسبة النجاح", en: "Pass Rate" },
  highest: { ar: "أعلى درجة", en: "Highest" },
  lowest: { ar: "أقل درجة", en: "Lowest" },
  attemptsCount: { ar: "المحاولات", en: "Attempts" },
  completionRate: { ar: "معدل الإكمال", en: "Completion" },
  scoreDist: { ar: "توزيع الدرجات", en: "Score Distribution" },
  passRateLabel: { ar: "نسبة النجاح", en: "Pass Rate" },
  passedOf: { ar: "ناجح من", en: "passed out of" },
  questionDifficulty: { ar: "صعوبة الأسئلة", en: "Question Difficulty" },
  questionCol: { ar: "السؤال", en: "Question" },
  timesAnswered: { ar: "مرات الإجابة", en: "Times Answered" },
  correctPct: { ar: "نسبة الصحيحة", en: "% Correct" },
  avgTime: { ar: "متوسط الوقت (ث)", en: "Avg Time (s)" },
  studentRanking: { ar: "ترتيب الطلاب", en: "Student Ranking" },
  trend: { ar: "الاتجاه الزمني", en: "Trend Over Time" },
  analyticsError: { ar: "تعذر تحميل التحليلات", en: "Failed to load analytics" },
  // Scheduling
  scheduleExam: { ar: "جدولة امتحان", en: "Schedule Exam" },
  selectExamSch: { ar: "— اختر الامتحان —", en: "— Select Exam —" },
  notifyStudents: { ar: "إرسال إشعار للطلاب", en: "Notify Students" },
  schedule: { ar: "جدولة", en: "Schedule" },
  noSchedule: { ar: "لا توجد امتحانات مجدولة", en: "No scheduled exams" },
  noScheduleDesc: { ar: "قم بجدولة امتحان للبدء", en: "Schedule an exam to get started" },
  fillAllFields: { ar: "يرجى ملء جميع الحقول", en: "Please fill all fields" },
  scheduleConflict: { ar: "يوجد تعارض في الجدول", en: "Schedule conflict detected" },
  forceSchedule: { ar: "جدولة بالرغم من التعارض", en: "Schedule Anyway" },
  scheduleSuccess: { ar: "تمت الجدولة بنجاح", en: "Scheduled successfully" },
  scheduleError: { ar: "تعذر جدولة الامتحان", en: "Failed to schedule exam" },
  loadScheduleError: { ar: "تعذر تحميل الجدول", en: "Failed to load schedule" },
  // Grading
  pendingGrading: { ar: "بانتظار التصحيح", en: "Pending Grading" },
  allGraded: { ar: "تم تصحيح جميع الامتحانات", en: "All exams have been graded" },
  allGradedDesc: { ar: "لا توجد محاولات تحتاج تصحيح", en: "No attempts need grading" },
  gradeNow: { ar: "تصحيح الآن", en: "Grade Now" },
  gradingLabel: { ar: "تصحيح:", en: "Grading:" },
  student: { ar: "طالب", en: "Student" },
  studentAnswer: { ar: "إجابة الطالب:", en: "Student Answer:" },
  correctAnswer: { ar: "الإجابة الصحيحة:", en: "Correct Answer:" },
  correct: { ar: "صحيح", en: "Correct" },
  wrong: { ar: "خطأ", en: "Wrong" },
  manualGrade: { ar: "يتطلب تصحيح يدوي", en: "Requires Manual Grading" },
  similarity: { ar: "تشابه مرتفع مع إجابة أخرى", en: "High similarity with another answer" },
  gradeInput: { ar: "الدرجة", en: "Grade" },
  notes: { ar: "ملاحظات", en: "Notes" },
  saveGrade: { ar: "حفظ التقييم", en: "Save Grades" },
  gradeSaveError: { ar: "تعذر حفظ التقييم", en: "Failed to save grades" },
  gradeSuccess: { ar: "تم حفظ التقييم بنجاح", en: "Grades saved successfully" },
  attemptsLoadError: { ar: "تعذر تحميل المحاولات", en: "Failed to load attempts" },
  examLabel: { ar: "امتحان", en: "Exam" },
  resultTitle: { ar: "نتيجة الامتحان", en: "Exam Result" },
  resultMsg: { ar: "تم تصحيح امتحان", en: "Exam has been graded:" },
};

function t(key: string, locale: Locale): string {
  return T[key]?.[locale] ?? T[key]?.ar ?? key;
}

// ============================================================
// Helpers
// ============================================================

const EMPTY_FORM = {
  title: "",
  type: "",
  subject: "",
  class_name: "",
  total_marks: "",
  starts_at: "",
  ends_at: "",
};

function formatDate(value: string | null, locale: Locale = "ar") {
  if (!value) return "—";
  const loc = locale === "en" ? "en-US" : "ar-IQ-u-nu-latn";
  return new Date(value).toLocaleString(loc, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(value: string | null, locale: Locale = "ar") {
  if (!value) return "—";
  const loc = locale === "en" ? "en-US" : "ar-IQ-u-nu-latn";
  return new Date(value).toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(value: string, locale: Locale = "ar") {
  const loc = locale === "en" ? "en-US" : "ar-IQ-u-nu-latn";
  return new Date(value).toLocaleDateString(loc, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtNum(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

function getExamStatus(exam: Exam): "upcoming" | "active" | "completed" {
  const now = Date.now();
  if (exam.ends_at && new Date(exam.ends_at).getTime() < now) return "completed";
  if (exam.starts_at && new Date(exam.starts_at).getTime() > now) return "upcoming";
  return "active";
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: "rgba(59,130,246,0.12)", text: "var(--info, #3b82f6)" },
  active: { bg: "rgba(34,197,94,0.12)", text: "var(--success, #22c55e)" },
  completed: { bg: "rgba(107,114,128,0.12)", text: "var(--text-muted)" },
  expired: { bg: "rgba(239,68,68,0.12)", text: "var(--danger)" },
  graded: { bg: "rgba(var(--primary-rgb, 99,102,241),0.12)", text: "var(--primary)" },
  submitted: { bg: "rgba(245,158,11,0.12)", text: "var(--warning, #f59e0b)" },
  in_progress: { bg: "rgba(59,130,246,0.12)", text: "var(--info, #3b82f6)" },
};

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.completed;
  const label = t(status, locale);
  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: "rgba(34,197,94,0.12)", text: "#16a34a" },
  medium: { bg: "rgba(245,158,11,0.12)", text: "#d97706" },
  hard: { bg: "rgba(239,68,68,0.12)", text: "#dc2626" },
};

function DifficultyBadge({ difficulty, locale }: { difficulty: string | null; locale: Locale }) {
  if (!difficulty) return null;
  const colors = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.medium;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: colors.bg, color: colors.text }}
    >
      {t(difficulty, locale)}
    </span>
  );
}

/** Basic Jaccard similarity on tokenized words */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-zA-Z0-9؀-ۿ\s]/g, "").split(/\s+/).filter(Boolean);
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA: Record<string, boolean> = {};
  const setB: Record<string, boolean> = {};
  const union: Record<string, boolean> = {};

  wordsA.forEach((w) => { setA[w] = true; union[w] = true; });
  wordsB.forEach((w) => { setB[w] = true; union[w] = true; });

  let intersection = 0;
  Object.keys(setA).forEach((w) => { if (setB[w]) intersection++; });
  const unionSize = Object.keys(union).length;
  return unionSize > 0 ? intersection / unionSize : 0;
}

// ============================================================
// Shared UI atoms
// ============================================================

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--surface-muted)] ${className}`}
      style={{ animationDuration: "1.5s" }}
    />
  );
}

function ErrorBox({ message, onRetry, locale }: { message: string; onRetry?: () => void; locale: Locale }) {
  return (
    <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[var(--danger)]">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span className="font-bold text-sm">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
        >
          {t("retry", locale)}
        </button>
      )}
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[var(--success,#22c55e)]/20 bg-[var(--success,#22c55e)]/5 p-4 flex items-center gap-2 text-[var(--success,#22c55e)]">
      <CheckCircle2 size={16} className="flex-shrink-0" />
      <span className="font-bold text-sm">{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--card-bg)] p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-[var(--text-muted)]" />
      </div>
      <p className="font-black text-[var(--text-secondary)] text-base">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
    </div>
  );
}

/** Styled toggle switch */
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0"
        style={{ background: checked ? "var(--primary)" : "var(--surface-muted)" }}
      >
        <span
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200"
          style={{ insetInlineStart: checked ? "20px" : "2px" }}
        />
      </button>
      <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
        {label}
      </span>
    </label>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl bg-[var(--card-bg)] p-5 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Tab button
// ============================================================

const TAB_CONFIG: Array<{ key: TabKey; icon: React.ComponentType<{ size?: number; className?: string }>; labelKey: string }> = [
  { key: "list", icon: GraduationCap, labelKey: "tabList" },
  { key: "builder", icon: Settings, labelKey: "tabBuilder" },
  { key: "analytics", icon: BarChart3, labelKey: "tabAnalytics" },
  { key: "scheduling", icon: CalendarDays, labelKey: "tabScheduling" },
  { key: "grading", icon: CheckCircle2, labelKey: "tabGrading" },
];

function TabBar({ activeTab, setActiveTab, locale }: { activeTab: TabKey; setActiveTab: (t: TabKey) => void; locale: Locale }) {
  return (
    <div className="relative">
      <div
        className="flex gap-1 overflow-x-auto scrollbar-none pb-px"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {TAB_CONFIG.map(({ key, icon: Icon, labelKey }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="relative h-11 px-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors duration-200 flex-shrink-0"
              style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
            >
              <Icon
                size={16}
                className={`transition-colors duration-200 ${isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
              />
              <span className={isActive ? "font-black" : ""}>{t(labelKey, locale)}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 inset-x-2 h-0.5 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="absolute bottom-0 inset-x-0 h-px bg-[var(--border)]" />
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function ExamsPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as Locale;
  const canManage =
    profile?.role === "super_admin" || profile?.role === "admin" || profile?.role === "employee";

  const schoolId =
    schoolScope.selectedSchoolId ??
    profile?.school_id ??
    (profile?.school as { id?: string } | undefined)?.id ??
    null;

  const [activeTab, setActiveTab] = useState<TabKey>("list");

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/exams" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("pageTitle", locale)}
            subtitle={t("pageSubtitle", locale)}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-4">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("pageTitle", locale)}
                    description={t("selectSchool", locale)}
                  />
                </div>
              ) : (
                <>
                  <TabBar activeTab={activeTab} setActiveTab={setActiveTab} locale={locale} />

                  {activeTab === "list" && <ExamsListTab schoolId={schoolId} canManage={canManage} locale={locale} />}
                  {activeTab === "builder" && <ExamBuilderTab schoolId={schoolId} locale={locale} />}
                  {activeTab === "analytics" && <AnalyticsTab schoolId={schoolId} locale={locale} />}
                  {activeTab === "scheduling" && <SchedulingTab schoolId={schoolId} locale={locale} />}
                  {activeTab === "grading" && <GradingTab schoolId={schoolId} locale={locale} />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ============================================================
// TAB 1: Exams List
// ============================================================

function ExamsListTab({ schoolId, canManage, locale }: { schoolId: string | null; canManage: boolean; locale: Locale }) {
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [attemptsExam, setAttemptsExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId });
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; items: Exam[]; error?: string;
      }>(`/api/web/exams?${params.toString()}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("loadError", locale));
      setItems(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setLoading(false);
    }
  }, [schoolId, locale]);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filterSubject) result = result.filter((e) => e.subject === filterSubject);
    if (filterStatus) result = result.filter((e) => getExamStatus(e) === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.subject?.toLowerCase().includes(q)) ||
        (e.class_name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filterSubject, filterStatus, searchQuery]);

  const subjects = useMemo(() => Array.from(new Set(items.map((e) => e.subject).filter(Boolean))), [items]);

  async function loadAttempts(exam: Exam) {
    setAttemptsExam(exam);
    setAttempts([]);
    setAttemptsLoading(true);
    try {
      const params = new URLSearchParams({ examId: exam.id });
      if (schoolId) params.set("schoolId", schoolId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; items: Attempt[]; error?: string;
      }>(`/api/web/exams/attempts?${params.toString()}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("attemptsLoadError", locale));
      setAttempts(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setAttemptsLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.title.trim()) { setError(t("titleRequired", locale)); return; }
    setSaving(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        "/api/web/exams",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            total_marks: form.total_marks ? Number(form.total_marks) : null,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
            schoolId,
          }),
        },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("saveError", locale));
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const params = new URLSearchParams({ id });
      if (schoolId) params.set("schoolId", schoolId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        `/api/web/exams?${params.toString()}`,
        { method: "DELETE" },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("deleteError", locale));
      setItems((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteConfirmTitle", locale)}
        description={t("deleteConfirmDesc", locale)}
        confirmLabel={t("delete", locale)}
        cancelLabel={t("cancel", locale)}
        tone="danger"
        busy={deleting}
        onConfirm={() => { if (deleteTarget) void handleDelete(deleteTarget); }}
        onClose={() => setDeleteTarget(null)}
      />

      {error && <ErrorBox message={error} onRetry={fetchItems} locale={locale} />}

      {/* Toolbar */}
      <div className="rounded-2xl bg-[var(--card-bg)] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {/* Search with glass effect */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 text-[var(--text-muted)]" style={{ insetInlineStart: "12px" }} />
            <input
              placeholder={t("search", locale)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]/60 backdrop-blur-sm text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 outline-none transition-all"
              style={{ paddingInlineStart: "36px", paddingInlineEnd: "12px" }}
            />
          </div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-secondary)] focus:border-[var(--primary)] outline-none transition-colors"
          >
            <option value="">{t("allSubjects", locale)}</option>
            {subjects.map((s) => <option key={s} value={s!}>{s}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm font-bold text-[var(--text-secondary)] focus:border-[var(--primary)] outline-none transition-colors"
          >
            <option value="">{t("allStatuses", locale)}</option>
            <option value="upcoming">{t("upcoming", locale)}</option>
            <option value="active">{t("active", locale)}</option>
            <option value="completed">{t("completed", locale)}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchItems()}
            className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all"
          >
            <RefreshCw size={16} />
          </button>
          {canManage && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="h-10 px-4 rounded-xl text-sm font-black text-white flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              style={{ background: "var(--primary)" }}
            >
              <Plus size={15} />
              {t("newExam", locale)}
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showForm && canManage && (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--card-bg)] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[var(--text-primary)] text-base">{t("addExam", locale)}</h3>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder={t("examTitle", locale)}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm sm:col-span-2 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 outline-none transition-all"
            />
            <input
              placeholder={t("subject", locale)}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all"
            />
            <input
              placeholder={t("className", locale)}
              value={form.class_name}
              onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all"
            />
            <input
              placeholder={t("examType", locale)}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all"
            />
            <input
              type="number"
              placeholder={t("totalMarks", locale)}
              value={form.total_marks}
              onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all"
            />
            <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
              {t("startsAt", locale)}
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all" />
            </label>
            <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
              {t("endsAt", locale)}
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-all" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
              {t("cancel", locale)}
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={saving}
              className="h-10 px-5 rounded-xl text-sm font-black text-white flex items-center gap-2 disabled:opacity-60 shadow-sm"
              style={{ background: "var(--primary)" }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {t("save", locale)}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <ListSkeleton />
      ) : filteredItems.length === 0 ? (
        <EmptyState icon={GraduationCap} title={t("noExams", locale)} description={t("noExamsDesc", locale)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredItems.map((exam) => {
            const status = getExamStatus(exam);
            return (
              <div
                key={exam.id}
                className="rounded-2xl bg-[var(--card-bg)] p-4 shadow-sm hover:shadow-md transition-shadow duration-200 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-[var(--text-primary)] truncate">{exam.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <StatusBadge status={status} locale={locale} />
                      {exam.subject && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(var(--primary-rgb, 99,102,241),0.08)", color: "var(--primary)" }}>
                          {exam.subject}
                        </span>
                      )}
                      {exam.class_name && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          {exam.class_name}
                        </span>
                      )}
                      {exam.type && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          {exam.type}
                        </span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setDeleteTarget(exam.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                  <span>{t("totalMarks", locale)}: {fmtNum(exam.total_marks)}</span>
                  <span>{formatDate(exam.starts_at, locale)}</span>
                </div>
                <button
                  onClick={() => void loadAttempts(exam)}
                  className="mt-3 w-full h-9 rounded-xl bg-[var(--surface-soft)] text-xs font-black text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <ClipboardList size={14} />
                  {t("viewAttempts", locale)}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Attempts modal */}
      {attemptsExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setAttemptsExam(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar rounded-2xl bg-[var(--card-bg)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card-bg)] z-10">
              <div>
                <p className="font-black text-[var(--text-primary)]">{t("attempts", locale)}: {attemptsExam.title}</p>
                <p className="text-xs text-[var(--text-muted)] font-bold mt-0.5">{t("totalMarks", locale)}: {fmtNum(attemptsExam.total_marks)}</p>
              </div>
              <button onClick={() => setAttemptsExam(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {attemptsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--primary)]" /></div>
              ) : attempts.length === 0 ? (
                <p className="text-center text-sm font-bold text-[var(--text-muted)] py-8">{t("noAttempts", locale)}</p>
              ) : (
                <div className="space-y-2">
                  {attempts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl bg-[var(--surface-soft)] px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{a.student_name ?? t("unknownStudent", locale)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.status && <StatusBadge status={a.status} locale={locale} />}
                          <p className="text-[11px] text-[var(--text-muted)] font-bold">{formatDate(a.submitted_at, locale)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--primary)" }}>
                        {fmtNum(a.score)}{attemptsExam.total_marks ? ` / ${fmtNum(attemptsExam.total_marks)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// TAB 2: Exam Builder
// ============================================================

function ExamBuilderTab({ schoolId, locale }: { schoolId: string | null; locale: Locale }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examQuestions, setExamQuestions] = useState<Array<{ questionId: string; marks: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    duration_minutes: "",
    shuffle_questions: false,
    shuffle_options: false,
    auto_submit: true,
    lock_browser: false,
    max_attempts: "1",
    passing_marks: "",
    show_results_immediately: false,
    allow_review: true,
    instructions: "",
  });

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; items: Exam[] }>(`/api/web/exams?schoolId=${schoolId}&limit=100`);
      if (payload?.ok) setExams(payload.items ?? []);
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; items: Question[] }>(`/api/web/questions?schoolId=${schoolId}&limit=200`);
      if (payload?.ok) setQuestions(payload.items ?? []);
    })();
  }, [schoolId]);

  // Load existing exam questions when exam selected
  useEffect(() => {
    if (!selectedExamId || !schoolId) { setExamQuestions([]); return; }
    void (async () => {
      setLoading(true);
      try {
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; item: { exam_id: string } | null }>(`/api/web/exams/settings?examId=${selectedExamId}&schoolId=${schoolId}`);
        if (payload?.ok && payload.item) {
          const s = payload.item as Record<string, unknown>;
          setSettingsForm({
            duration_minutes: String(s.duration_minutes ?? ""),
            shuffle_questions: Boolean(s.shuffle_questions),
            shuffle_options: Boolean(s.shuffle_options),
            auto_submit: s.auto_submit !== false,
            lock_browser: Boolean(s.lock_browser),
            max_attempts: String(s.max_attempts ?? "1"),
            passing_marks: String(s.passing_marks ?? ""),
            show_results_immediately: Boolean(s.show_results_immediately),
            allow_review: s.allow_review !== false,
            instructions: String(s.instructions ?? ""),
          });
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [selectedExamId, schoolId]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (filterDifficulty) result = result.filter((q) => q.difficulty === filterDifficulty);
    if (filterType) result = result.filter((q) => q.type === filterType);
    if (selectedExam?.subject) result = result.filter((q) => q.subject === selectedExam.subject);
    return result;
  }, [questions, filterDifficulty, filterType, selectedExam]);

  const addedIds = new Set(examQuestions.map((q) => q.questionId));

  function toggleQuestion(q: Question) {
    if (addedIds.has(q.id)) {
      setExamQuestions((prev) => prev.filter((eq) => eq.questionId !== q.id));
    } else {
      setExamQuestions((prev) => [...prev, { questionId: q.id, marks: marksPerQuestion }]);
    }
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= examQuestions.length) return;
    setExamQuestions((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }

  async function handleSaveBuilder() {
    if (!selectedExamId || examQuestions.length === 0) {
      setError(t("selectExamAndQ", locale));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Save questions
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        "/api/web/exams/exam-builder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: selectedExamId,
            questionIds: examQuestions.map((q) => q.questionId),
            marksPerQuestion,
            schoolId,
          }),
        },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("builderSaveError", locale));

      // Save settings
      const settingsPayload: Record<string, unknown> = { examId: selectedExamId, schoolId };
      if (settingsForm.duration_minutes) settingsPayload.duration_minutes = Number(settingsForm.duration_minutes);
      settingsPayload.shuffle_questions = settingsForm.shuffle_questions;
      settingsPayload.shuffle_options = settingsForm.shuffle_options;
      settingsPayload.auto_submit = settingsForm.auto_submit;
      settingsPayload.lock_browser = settingsForm.lock_browser;
      if (settingsForm.max_attempts) settingsPayload.max_attempts = Number(settingsForm.max_attempts);
      if (settingsForm.passing_marks) settingsPayload.passing_marks = Number(settingsForm.passing_marks);
      settingsPayload.show_results_immediately = settingsForm.show_results_immediately;
      settingsPayload.allow_review = settingsForm.allow_review;
      if (settingsForm.instructions) settingsPayload.instructions = settingsForm.instructions;

      await fetchJsonWithAuthorizedSession("/api/web/exams/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayload),
      });

      setSuccess(t("builderSuccess", locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} locale={locale} />}
      {success && <SuccessBox message={success} />}

      {/* Exam selector */}
      <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
        <label className="text-sm font-black text-[var(--text-primary)] block mb-2">{t("selectExam", locale)}</label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-colors"
        >
          <option value="">{t("selectPlaceholder", locale)}</option>
          {exams.map((e) => <option key={e.id} value={e.id}>{e.title} {e.subject ? `(${e.subject})` : ""}</option>)}
        </select>
      </div>

      {selectedExamId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Question bank (left) */}
          <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm space-y-3">
            <h3 className="font-black text-[var(--text-primary)]">{t("availableQuestions", locale)}</h3>
            <div className="flex gap-2">
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 text-xs focus:border-[var(--primary)] outline-none">
                <option value="">{t("allLevels", locale)}</option>
                <option value="easy">{t("easy", locale)}</option>
                <option value="medium">{t("medium", locale)}</option>
                <option value="hard">{t("hard", locale)}</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 text-xs focus:border-[var(--primary)] outline-none">
                <option value="">{t("allTypes", locale)}</option>
                <option value="multiple_choice">{t("multipleChoice", locale)}</option>
                <option value="true_false">{t("trueFalse", locale)}</option>
                <option value="essay">{t("essay", locale)}</option>
                <option value="fill_blank">{t("fillBlank", locale)}</option>
              </select>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <p className="text-sm font-bold text-[var(--text-muted)] py-4 text-center">{t("noQuestions", locale)}</p>
              ) : filteredQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => toggleQuestion(q)}
                  className={`w-full rounded-xl border p-3 text-sm transition-all duration-200 ${
                    addedIds.has(q.id)
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/5 shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--primary)]/30 hover:shadow-sm"
                  }`}
                  style={{ textAlign: locale === "ar" ? "right" : "left" }}
                >
                  <div className="flex items-start gap-2">
                    {/* Drag handle visual */}
                    <span className="flex flex-col gap-0.5 mt-1 opacity-30 flex-shrink-0">
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="w-1 h-1 rounded-full bg-current" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-primary)] line-clamp-2">{q.prompt}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <DifficultyBadge difficulty={q.difficulty} locale={locale} />
                        {q.type && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-muted)]">{q.type}</span>}
                      </div>
                    </div>
                    {addedIds.has(q.id) && (
                      <CheckCircle2 size={16} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected questions + settings (right) */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-[var(--text-primary)]">{t("selectedQuestions", locale)} ({fmtNum(examQuestions.length)})</h3>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[var(--text-muted)]">{t("marksPerQ", locale)}</label>
                  <input type="number" min={1} value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(Number(e.target.value) || 1)} className="h-8 w-16 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-2 text-sm text-center focus:border-[var(--primary)] outline-none" />
                </div>
              </div>
              {examQuestions.length === 0 ? (
                <div className="py-8 text-center">
                  <ClipboardList size={24} className="mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
                  <p className="text-sm font-bold text-[var(--text-muted)]">{t("noQuestionsAdded", locale)}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {examQuestions.map((eq, idx) => {
                    const q = questions.find((q) => q.id === eq.questionId);
                    return (
                      <div key={eq.questionId} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 group hover:border-[var(--primary)]/20 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-30 transition-colors"><ChevronUp size={14} /></button>
                          <button onClick={() => moveQuestion(idx, 1)} disabled={idx === examQuestions.length - 1} className="text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-30 transition-colors"><ChevronDown size={14} /></button>
                        </div>
                        <span className="w-6 h-6 rounded-md bg-[var(--surface-muted)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{q?.prompt ?? eq.questionId}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{marksPerQuestion} {t("mark", locale)}</p>
                        </div>
                        <button onClick={() => toggleQuestion(q ?? { id: eq.questionId } as Question)} className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-sm font-black text-[var(--text-secondary)] border-t border-[var(--border)] pt-3">
                {t("totalLabel", locale)} {fmtNum(examQuestions.length * marksPerQuestion)} {t("mark", locale)}
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
              <button onClick={() => setSettingsOpen((v) => !v)} className="flex items-center justify-between w-full">
                <h3 className="font-black text-[var(--text-primary)]">{t("examSettings", locale)}</h3>
                <span className={`transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}>
                  <ChevronDown size={16} className="text-[var(--text-muted)]" />
                </span>
              </button>
              {settingsOpen && (
                <div className="mt-4 space-y-5">
                  {/* Numeric inputs section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
                      {t("duration", locale)}
                      <input type="number" value={settingsForm.duration_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, duration_minutes: e.target.value })} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                    </label>
                    <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
                      {t("maxAttempts", locale)}
                      <input type="number" min={1} value={settingsForm.max_attempts} onChange={(e) => setSettingsForm({ ...settingsForm, max_attempts: e.target.value })} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                    </label>
                    <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
                      {t("passingMarks", locale)}
                      <input type="number" value={settingsForm.passing_marks} onChange={(e) => setSettingsForm({ ...settingsForm, passing_marks: e.target.value })} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                    </label>
                    <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
                      {t("instructions", locale)}
                      <input value={settingsForm.instructions} onChange={(e) => setSettingsForm({ ...settingsForm, instructions: e.target.value })} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
                    </label>
                  </div>
                  {/* Toggle switches section */}
                  <div className="border-t border-[var(--border)] pt-4 space-y-3">
                    <ToggleSwitch checked={settingsForm.shuffle_questions} onChange={(v) => setSettingsForm({ ...settingsForm, shuffle_questions: v })} label={t("shuffleQ", locale)} />
                    <ToggleSwitch checked={settingsForm.shuffle_options} onChange={(v) => setSettingsForm({ ...settingsForm, shuffle_options: v })} label={t("shuffleO", locale)} />
                    <ToggleSwitch checked={settingsForm.auto_submit} onChange={(v) => setSettingsForm({ ...settingsForm, auto_submit: v })} label={t("autoSubmit", locale)} />
                    <ToggleSwitch checked={settingsForm.lock_browser} onChange={(v) => setSettingsForm({ ...settingsForm, lock_browser: v })} label={t("lockBrowser", locale)} />
                    <ToggleSwitch checked={settingsForm.show_results_immediately} onChange={(v) => setSettingsForm({ ...settingsForm, show_results_immediately: v })} label={t("showResults", locale)} />
                    <ToggleSwitch checked={settingsForm.allow_review} onChange={(v) => setSettingsForm({ ...settingsForm, allow_review: v })} label={t("allowReview", locale)} />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => void handleSaveBuilder()}
              disabled={saving || examQuestions.length === 0}
              className="w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60 shadow-md hover:shadow-lg transition-shadow"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark, var(--primary)))" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t("saveBuilder", locale)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 3: Analytics
// ============================================================

function AnalyticsTab({ schoolId, locale }: { schoolId: string | null; locale: Locale }) {
  const [examStats, setExamStats] = useState<ExamStat[]>([]);
  const [questionDifficulty, setQuestionDifficulty] = useState<QuestionDifficulty[]>([]);
  const [studentRanking, setStudentRanking] = useState<StudentRank[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState("");

  const fetchAnalytics = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId });
      if (selectedExamId) params.set("examId", selectedExamId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; examStats: ExamStat[]; questionDifficulty: QuestionDifficulty[];
        studentRanking: StudentRank[]; trend: TrendPoint[]; error?: string;
      }>(`/api/web/exams/analytics?${params.toString()}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("analyticsError", locale));
      setExamStats(payload.examStats ?? []);
      setQuestionDifficulty(payload.questionDifficulty ?? []);
      setStudentRanking(payload.studentRanking ?? []);
      setTrend(payload.trend ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedExamId, locale]);

  useEffect(() => { void fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error) {
    return <ErrorBox message={error} onRetry={fetchAnalytics} locale={locale} />;
  }

  const maxDistCount = Math.max(1, ...examStats.flatMap((s) => s.distribution.map((d) => d.count)));

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="rounded-2xl bg-[var(--card-bg)] p-4 flex items-center gap-3 shadow-sm">
        <Filter size={16} className="text-[var(--text-muted)]" />
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors"
        >
          <option value="">{t("allExams", locale)}</option>
          {examStats.map((s) => <option key={s.examId} value={s.examId}>{s.title}</option>)}
        </select>
      </div>

      {examStats.length === 0 ? (
        <EmptyState icon={BarChart3} title={t("noAnalytics", locale)} description={t("noAnalyticsDesc", locale)} />
      ) : (
        <>
          {/* Stats cards */}
          {examStats.map((stat) => (
            <div key={stat.examId} className="space-y-4">
              <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
                <h3 className="font-black text-[var(--text-primary)] mb-4 text-base">{stat.title}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {([
                    [t("avgScore", locale), fmtNum(stat.avgScore), "var(--primary)"],
                    [t("passRate", locale), `${fmtNum(stat.passRate)}%`, "var(--success, #22c55e)"],
                    [t("highest", locale), fmtNum(stat.highest), "var(--info, #3b82f6)"],
                    [t("lowest", locale), fmtNum(stat.lowest), "var(--warning, #f59e0b)"],
                    [t("attemptsCount", locale), fmtNum(stat.totalAttempts), "var(--text-secondary)"],
                    [t("completionRate", locale), `${fmtNum(stat.completionRate)}%`, "var(--primary)"],
                  ] as const).map(([label, value, color]) => (
                    <div key={label} className="rounded-xl bg-[var(--surface-soft)] p-3.5 text-center hover:shadow-sm transition-shadow">
                      <p className="text-lg font-black" style={{ color }}>{value}</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score distribution - animated CSS bar chart */}
              <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
                <h4 className="font-black text-[var(--text-primary)] mb-4">{t("scoreDist", locale)}</h4>
                <div className="flex items-end gap-2 h-36">
                  {stat.distribution.map((bucket, idx) => {
                    const pct = Math.max(4, (bucket.count / maxDistCount) * 100);
                    return (
                      <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <span className="text-[10px] font-black text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                          {fmtNum(bucket.count)}
                        </span>
                        <div
                          className="w-full rounded-t-lg transition-all duration-700 ease-out"
                          style={{
                            height: `${pct}%`,
                            background: "var(--primary)",
                            opacity: 0.5 + (bucket.count / maxDistCount) * 0.5,
                            animationDelay: `${idx * 100}ms`,
                          }}
                        />
                        <span className="text-[9px] font-bold text-[var(--text-muted)]">{bucket.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pass/Fail donut */}
              {stat.totalAttempts > 0 && (
                <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm flex items-center gap-6">
                  <div className="flex-shrink-0 relative">
                    <svg width={100} height={100} viewBox="0 0 36 36">
                      <circle cx={18} cy={18} r={15.91} fill="none" stroke="var(--surface-muted)" strokeWidth={3} />
                      <circle
                        cx={18} cy={18} r={15.91} fill="none"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        strokeDasharray={`${stat.passRate} ${100 - stat.passRate}`}
                        strokeDashoffset={25}
                        strokeLinecap="round"
                      />
                      <text x={18} y={18} textAnchor="middle" dominantBaseline="central" className="text-[7px] font-black" fill="var(--primary)">{fmtNum(stat.passRate)}%</text>
                    </svg>
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)] text-base">{t("passRateLabel", locale)}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {fmtNum(Math.round(stat.totalAttempts * stat.passRate / 100))} {t("passedOf", locale)} {fmtNum(stat.totalAttempts)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Question difficulty */}
          {questionDifficulty.length > 0 && (
            <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
              <h4 className="font-black text-[var(--text-primary)] mb-4">{t("questionDifficulty", locale)}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[var(--text-muted)] text-xs font-bold border-b border-[var(--border)]">
                      <th className="py-2.5 px-3" style={{ textAlign: locale === "ar" ? "right" : "left" }}>{t("questionCol", locale)}</th>
                      <th className="text-center py-2.5 px-3">{t("timesAnswered", locale)}</th>
                      <th className="text-center py-2.5 px-3">{t("correctPct", locale)}</th>
                      <th className="text-center py-2.5 px-3">{t("avgTime", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionDifficulty.map((qd) => {
                      const diffColor = qd.percentCorrect < 40
                        ? "var(--danger)"
                        : qd.percentCorrect > 70
                          ? "var(--success, #22c55e)"
                          : "var(--warning, #f59e0b)";
                      const diffBg = qd.percentCorrect < 40
                        ? "rgba(239,68,68,0.06)"
                        : qd.percentCorrect > 70
                          ? "rgba(34,197,94,0.06)"
                          : "rgba(245,158,11,0.06)";
                      return (
                        <tr key={qd.questionId} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-soft)] transition-colors" style={{ background: diffBg }}>
                          <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
                            {qd.prompt.slice(0, 60)}{qd.prompt.length > 60 ? "..." : ""}
                          </td>
                          <td className="py-2.5 px-3 text-center">{fmtNum(qd.timesAnswered)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-black" style={{ color: diffColor }}>{fmtNum(qd.percentCorrect)}%</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">{fmtNum(qd.avgTimeSpent)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student ranking */}
          {studentRanking.length > 0 && (
            <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
              <h4 className="font-black text-[var(--text-primary)] mb-4">{t("studentRanking", locale)}</h4>
              <div className="space-y-2">
                {studentRanking.slice(0, 20).map((sr, idx) => {
                  const initials = sr.studentName
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0] ?? "")
                    .join("")
                    .toUpperCase();
                  return (
                    <div key={sr.studentId} className="flex items-center gap-3 rounded-xl bg-[var(--surface-soft)] px-4 py-2.5 hover:shadow-sm transition-shadow">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={idx < 3
                          ? { background: "var(--primary)", color: "white" }
                          : { background: "var(--surface-muted)", color: "var(--text-muted)" }
                        }
                      >
                        {idx + 1}
                      </span>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-[var(--primary)]/10 text-[var(--primary)] flex-shrink-0">
                        {initials}
                      </span>
                      <span className="flex-1 font-bold text-sm text-[var(--text-primary)]">{sr.studentName}</span>
                      <span className="font-black text-[var(--primary)]">{fmtNum(sr.totalScore)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trend */}
          {trend.length > 0 && (
            <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm">
              <h4 className="font-black text-[var(--text-primary)] mb-4">{t("trend", locale)}</h4>
              <div className="flex items-end gap-3 h-32">
                {trend.map((tp, idx) => {
                  const maxAvg = Math.max(1, ...trend.map((x) => x.avgScore));
                  return (
                    <div key={tp.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[10px] font-bold text-[var(--text-primary)] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {t("avgScore", locale)}: {fmtNum(tp.avgScore)} | {t("attemptsCount", locale)}: {fmtNum(tp.attemptCount)}
                      </div>
                      <span className="text-[10px] font-black text-[var(--primary)]">{fmtNum(tp.avgScore)}</span>
                      <div
                        className="w-full rounded-t-lg transition-all duration-500 ease-out hover:opacity-100"
                        style={{
                          height: `${Math.max(8, (tp.avgScore / maxAvg) * 100)}%`,
                          background: "var(--primary)",
                          opacity: 0.7,
                          animationDelay: `${idx * 80}ms`,
                        }}
                      />
                      <span className="text-[9px] font-bold text-[var(--text-muted)]">{tp.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// TAB 4: Scheduling
// ============================================================

function SchedulingTab({ schoolId, locale }: { schoolId: string | null; locale: Locale }) {
  const [schedule, setSchedule] = useState<ScheduleGroup>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schedule form
  const [exams, setExams] = useState<Exam[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ examId: "", starts_at: "", ends_at: "", notify: true });
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [scheduling, setScheduling] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId });
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; schedule: ScheduleGroup; error?: string;
      }>(`/api/web/exams/schedule?${params.toString()}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("loadScheduleError", locale));
      setSchedule(payload.schedule ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setLoading(false);
    }
  }, [schoolId, locale]);

  useEffect(() => { void fetchSchedule(); }, [fetchSchedule]);

  useEffect(() => {
    if (!schoolId) return;
    void (async () => {
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; items: Exam[] }>(`/api/web/exams?schoolId=${schoolId}&limit=100`);
      if (payload?.ok) setExams(payload.items ?? []);
    })();
  }, [schoolId]);

  async function handleSchedule(force = false) {
    if (!scheduleForm.examId || !scheduleForm.starts_at || !scheduleForm.ends_at) {
      setError(t("fillAllFields", locale));
      return;
    }
    setScheduling(true);
    setError(null);
    setSuccess(null);
    setConflicts([]);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; error?: string; conflicts?: ConflictInfo[]; message?: string;
      }>("/api/web/exams/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scheduleForm, schoolId, force }),
      });

      if (response.status === 409 && payload?.conflicts) {
        setConflicts(payload.conflicts);
        setError(payload.message ?? t("scheduleConflict", locale));
        return;
      }

      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("scheduleError", locale));
      setSuccess(t("scheduleSuccess", locale));
      setScheduleForm({ examId: "", starts_at: "", ends_at: "", notify: true });
      setConflicts([]);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setScheduling(false);
    }
  }

  const sortedDates = Object.keys(schedule).sort();

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--danger)]">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span className="font-bold text-sm">{error}</span>
          </div>
          {conflicts.length > 0 && (
            <div className="mt-3 space-y-2">
              {conflicts.map((c) => (
                <div key={c.examId} className="flex items-center gap-2 text-xs text-[var(--danger)] rounded-lg bg-[var(--danger)]/5 p-2.5">
                  <AlertTriangle size={12} />
                  <span className="font-bold">{c.examTitle} ({c.className}) - {formatDateShort(c.startsAt, locale)} to {formatDateShort(c.endsAt, locale)}</span>
                </div>
              ))}
              <button
                onClick={() => void handleSchedule(true)}
                className="mt-2 h-9 px-4 rounded-xl text-xs font-black text-white shadow-sm"
                style={{ background: "var(--warning, #f59e0b)" }}
              >
                {t("forceSchedule", locale)}
              </button>
            </div>
          )}
        </div>
      )}
      {success && <SuccessBox message={success} />}

      {/* Schedule form */}
      <div className="rounded-2xl bg-[var(--card-bg)] p-6 shadow-sm space-y-4">
        <h3 className="font-black text-[var(--text-primary)] text-base">{t("scheduleExam", locale)}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={scheduleForm.examId}
            onChange={(e) => setScheduleForm({ ...scheduleForm, examId: e.target.value })}
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm sm:col-span-2 focus:border-[var(--primary)] outline-none transition-colors"
          >
            <option value="">{t("selectExamSch", locale)}</option>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title} {e.class_name ? `(${e.class_name})` : ""}</option>)}
          </select>
          <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
            {t("startsAt", locale)}
            <input type="datetime-local" value={scheduleForm.starts_at} onChange={(e) => setScheduleForm({ ...scheduleForm, starts_at: e.target.value })} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
          </label>
          <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5">
            {t("endsAt", locale)}
            <input type="datetime-local" value={scheduleForm.ends_at} onChange={(e) => setScheduleForm({ ...scheduleForm, ends_at: e.target.value })} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm focus:border-[var(--primary)] outline-none transition-colors" />
          </label>
        </div>
        <ToggleSwitch
          checked={scheduleForm.notify}
          onChange={(v) => setScheduleForm({ ...scheduleForm, notify: v })}
          label={t("notifyStudents", locale)}
        />
        <div className="flex justify-end">
          <button
            onClick={() => void handleSchedule()}
            disabled={scheduling}
            className="h-11 px-6 rounded-xl text-sm font-black text-white flex items-center gap-2 disabled:opacity-60 shadow-sm hover:shadow-md transition-shadow"
            style={{ background: "var(--primary)" }}
          >
            {scheduling ? <Loader2 size={15} className="animate-spin" /> : <CalendarDays size={15} />}
            {t("schedule", locale)}
          </button>
        </div>
      </div>

      {/* Timeline view */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("noSchedule", locale)} description={t("noScheduleDesc", locale)} />
      ) : (
        <div className="space-y-3">
          {sortedDates.map((date) => (
            <div key={date} className="flex gap-4">
              {/* Date column */}
              <div className="flex-shrink-0 w-20 pt-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex flex-col items-center justify-center mx-auto">
                  <span className="text-lg font-black text-[var(--primary)] leading-none">
                    {new Date(date).getDate()}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--primary)]">
                    {new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "ar-IQ", { month: "short" })}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">
                  {new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "ar-IQ", { weekday: "short" })}
                </p>
              </div>
              {/* Exams column */}
              <div className="flex-1 space-y-2">
                {schedule[date].map((exam) => (
                  <div key={exam.id} className="rounded-2xl bg-[var(--card-bg)] p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm font-black text-[var(--text-primary)]">{exam.title}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      {exam.subject && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(var(--primary-rgb,99,102,241),0.08)", color: "var(--primary)" }}>{exam.subject}</span>}
                      {exam.class_name && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">{exam.class_name}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-[var(--text-muted)]">
                      <span>{formatDate(exam.starts_at, locale)}</span>
                      <span className="text-[var(--border)]">|</span>
                      <span>{formatDate(exam.ends_at, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 5: Grading
// ============================================================

function GradingTab({ schoolId, locale }: { schoolId: string | null; locale: Locale }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Grading panel
  const [gradingAttempt, setGradingAttempt] = useState<Attempt | null>(null);
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [questions, setQuestions] = useState<Array<{ id: string; prompt: string; type: string | null; answer: string | null }>>([]);
  const [grades, setGrades] = useState<Record<string, { marks: number; feedback: string }>>({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);

  // Similarity data for essay answers within same exam
  const [allEssayAnswers, setAllEssayAnswers] = useState<Map<string, Array<{ studentId: string; answer: string }>>>(new Map());

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    void (async () => {
      try {
        const { payload: examsPayload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; items: Exam[] }>(`/api/web/exams?schoolId=${schoolId}&limit=100`);
        const allExams = examsPayload?.items ?? [];
        setExams(allExams);

        // Fetch attempts that need grading (status = submitted)
        const { payload: attemptsPayload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; items: Attempt[] }>(`/api/web/exams/attempts?schoolId=${schoolId}&status=submitted`);
        setAttempts(attemptsPayload?.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("unexpectedError", locale));
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId, locale]);

  async function openGrading(attempt: Attempt) {
    const exam = exams.find((e) => e.id === attempt.exam_id);
    if (!exam) return;
    setGradingAttempt(attempt);
    setGradingExam(exam);
    setAnswersLoading(true);
    setGrades({});
    setSuccess(null);
    setError(null);

    try {
      // Fetch student answers
      const { payload: answersPayload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; items: StudentAnswer[];
      }>(`/api/web/exams/${attempt.exam_id}/answers?attemptId=${attempt.id}&schoolId=${schoolId}`);
      setAnswers(answersPayload?.items ?? []);

      // Fetch questions for this exam
      const { payload: questionsPayload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; items: ExamQuestion[];
      }>(`/api/web/exams/${attempt.exam_id}/answers?examId=${attempt.exam_id}&schoolId=${schoolId}`);

      // We need question data - fetch from question bank
      const answerItems = answersPayload?.items ?? [];
      const qIds = answerItems.map((a) => a.question_id);
      if (qIds.length > 0) {
        const { payload: qPayload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean; items: Array<{ id: string; prompt: string; type: string | null; answer: string | null }>;
        }>(`/api/web/questions?schoolId=${schoolId}&ids=${qIds.join(",")}&limit=100`);
        setQuestions(qPayload?.items ?? []);
      }

      // Initialize grades from existing marks
      const initialGrades: Record<string, { marks: number; feedback: string }> = {};
      for (const a of answerItems) {
        if (a.is_correct === null) {
          initialGrades[a.question_id] = { marks: a.marks_awarded ?? 0, feedback: "" };
        }
      }
      setGrades(initialGrades);

      // Fetch all essay answers for similarity check
      const { payload: allAttempts } = await fetchJsonWithAuthorizedSession<{
        ok: boolean; items: Attempt[];
      }>(`/api/web/exams/attempts?examId=${attempt.exam_id}&schoolId=${schoolId}`);

      const essayMap = new Map<string, Array<{ studentId: string; answer: string }>>();
      for (const att of (allAttempts?.items ?? [])) {
        if (att.id === attempt.id) continue;
        const { payload: otherAnswers } = await fetchJsonWithAuthorizedSession<{
          ok: boolean; items: StudentAnswer[];
        }>(`/api/web/exams/${attempt.exam_id}/answers?attemptId=${att.id}&schoolId=${schoolId}`);
        for (const oa of (otherAnswers?.items ?? [])) {
          if (typeof oa.student_answer === "string" && oa.student_answer.length > 20) {
            const list = essayMap.get(oa.question_id) ?? [];
            list.push({ studentId: att.student_id ?? att.id, answer: oa.student_answer });
            essayMap.set(oa.question_id, list);
          }
        }
      }
      setAllEssayAnswers(essayMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setAnswersLoading(false);
    }
  }

  async function handleSaveGrades() {
    if (!gradingAttempt || !gradingExam) return;
    setSavingGrade(true);
    setError(null);
    try {
      const gradeEntries = Object.entries(grades).map(([questionId, g]) => ({
        questionId,
        marks_awarded: g.marks,
        feedback: g.feedback || undefined,
      }));

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; error?: string }>(
        `/api/web/exams/${gradingExam.id}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId: gradingAttempt.id, grades: gradeEntries, schoolId }),
        },
      );
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? t("gradeSaveError", locale));
      setSuccess(t("gradeSuccess", locale));
      setAttempts((prev) => prev.filter((a) => a.id !== gradingAttempt.id));
      setGradingAttempt(null);

      // Send notification (fire and forget)
      try {
        await fetchJsonWithAuthorizedSession("/api/web/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            type: "exam",
            title: t("resultTitle", locale),
            message: `${t("resultMsg", locale)} ${gradingExam.title}`,
          }),
        });
      } catch { /* notification failure is non-blocking */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("unexpectedError", locale));
    } finally {
      setSavingGrade(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  // Count ungraded per exam
  const ungradedByExam = new Map<string, number>();
  for (const a of attempts) {
    ungradedByExam.set(a.exam_id, (ungradedByExam.get(a.exam_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBox message={error} locale={locale} />}
      {success && <SuccessBox message={success} />}

      {attempts.length === 0 && !gradingAttempt ? (
        <EmptyState icon={CheckCircle2} title={t("allGraded", locale)} description={t("allGradedDesc", locale)} />
      ) : !gradingAttempt ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm flex items-center justify-between">
            <h3 className="font-black text-[var(--text-primary)] text-base">{t("pendingGrading", locale)}</h3>
            <span className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "var(--warning, #f59e0b)" }}>
              {fmtNum(attempts.length)}
            </span>
          </div>
          {attempts.map((attempt) => {
            const exam = exams.find((e) => e.id === attempt.exam_id);
            const ungradedCount = ungradedByExam.get(attempt.exam_id) ?? 0;
            return (
              <div key={attempt.id} className="rounded-2xl bg-[var(--card-bg)] p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-[var(--text-primary)]">{exam?.title ?? t("examLabel", locale)}</p>
                    {ungradedCount > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--warning,#f59e0b)]/10 text-[var(--warning,#f59e0b)]">
                        {fmtNum(ungradedCount)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-0.5">
                    {attempt.student_name ?? t("student", locale)} &middot; {formatDate(attempt.submitted_at, locale)}
                  </p>
                </div>
                <button
                  onClick={() => void openGrading(attempt)}
                  className="h-9 px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow"
                  style={{ background: "var(--primary)" }}
                >
                  <Edit2 size={14} />
                  {t("gradeNow", locale)}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grading panel */
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm flex items-center justify-between sticky top-0 z-10">
            <div>
              <p className="font-black text-[var(--text-primary)] text-base">{t("gradingLabel", locale)} {gradingExam?.title}</p>
              <p className="text-xs font-bold text-[var(--text-muted)]">{gradingAttempt.student_name ?? t("student", locale)}</p>
            </div>
            <button onClick={() => setGradingAttempt(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
              <X size={18} />
            </button>
          </div>

          {answersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {answers.map((answer) => {
                const question = questions.find((q) => q.id === answer.question_id);
                const isAutoGraded = answer.is_correct !== null;
                const isEssay = typeof answer.student_answer === "string" && (answer.student_answer as string).length > 20;

                // Similarity check for essay answers
                let maxSimilarity = 0;
                if (isEssay && !isAutoGraded) {
                  const otherAnswers = allEssayAnswers.get(answer.question_id) ?? [];
                  for (const other of otherAnswers) {
                    const sim = jaccardSimilarity(answer.student_answer as string, other.answer);
                    if (sim > maxSimilarity) maxSimilarity = sim;
                  }
                }

                return (
                  <div key={answer.question_id} className="rounded-2xl bg-[var(--card-bg)] p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-sm text-[var(--text-primary)] flex-1">{question?.prompt ?? answer.question_id}</p>
                      {isAutoGraded ? (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0 ${
                          answer.is_correct
                            ? "bg-[var(--success,#22c55e)]/10 text-[var(--success,#22c55e)]"
                            : "bg-[var(--danger)]/10 text-[var(--danger)]"
                        }`}>
                          {answer.is_correct && <CheckCircle2 size={10} />}
                          {answer.is_correct ? t("correct", locale) : t("wrong", locale)} - {fmtNum(answer.marks_awarded)} {t("mark", locale)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--warning,#f59e0b)]/10 text-[var(--warning,#f59e0b)] flex-shrink-0">
                          {t("manualGrade", locale)}
                        </span>
                      )}
                    </div>

                    {/* Student answer */}
                    <div className="rounded-xl bg-[var(--surface-soft)] p-3.5">
                      <p className="text-[11px] font-bold text-[var(--text-muted)] mb-1">{t("studentAnswer", locale)}</p>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{typeof answer.student_answer === "string" ? answer.student_answer : JSON.stringify(answer.student_answer)}</p>
                    </div>

                    {/* Correct answer reference */}
                    {question?.answer && (
                      <div className="rounded-xl p-3.5" style={{ background: "rgba(var(--primary-rgb,99,102,241),0.04)" }}>
                        <p className="text-[11px] font-bold text-[var(--primary)] mb-1">{t("correctAnswer", locale)}</p>
                        <p className="text-sm text-[var(--text-primary)]">{question.answer}</p>
                      </div>
                    )}

                    {/* Similarity warning */}
                    {maxSimilarity > 0.7 && (
                      <div className="flex items-center gap-2 rounded-xl bg-[var(--warning,#f59e0b)]/8 border border-[var(--warning,#f59e0b)]/20 p-3 text-xs font-bold text-[var(--warning,#f59e0b)]">
                        <AlertTriangle size={14} className="flex-shrink-0" />
                        {t("similarity", locale)} ({Math.round(maxSimilarity * 100)}%)
                      </div>
                    )}

                    {/* Manual grading input */}
                    {!isAutoGraded && (
                      <div className="flex gap-3 pt-1">
                        <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5 flex-shrink-0">
                          {t("gradeInput", locale)}
                          <input
                            type="number"
                            min={0}
                            value={grades[answer.question_id]?.marks ?? 0}
                            onChange={(e) => setGrades((prev) => ({
                              ...prev,
                              [answer.question_id]: { ...prev[answer.question_id], marks: Number(e.target.value) || 0 },
                            }))}
                            className="h-10 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-2 text-sm text-center focus:border-[var(--primary)] outline-none transition-colors"
                          />
                        </label>
                        <label className="text-xs font-bold text-[var(--text-muted)] flex flex-col gap-1.5 flex-1">
                          {t("notes", locale)}
                          <input
                            value={grades[answer.question_id]?.feedback ?? ""}
                            onChange={(e) => setGrades((prev) => ({
                              ...prev,
                              [answer.question_id]: { ...prev[answer.question_id], feedback: e.target.value },
                            }))}
                            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm focus:border-[var(--primary)] outline-none transition-colors"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Save button */}
              {Object.keys(grades).length > 0 && (
                <button
                  onClick={() => void handleSaveGrades()}
                  disabled={savingGrade}
                  className="w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-60 shadow-md hover:shadow-lg transition-shadow"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark, var(--primary)))" }}
                >
                  {savingGrade ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t("saveGrade", locale)}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
