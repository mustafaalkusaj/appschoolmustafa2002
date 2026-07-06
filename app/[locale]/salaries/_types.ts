// Salaries page type definitions and constants

export type SalariesBootstrapScope = "core" | "reference" | "archive" | "all";

export type SalaryType = "fixed" | "hourly" | "mixed";

export interface SalaryTypeOption {
  value: SalaryType;
  label: string;
}

export const SALARY_TYPES: SalaryTypeOption[] = [
  { value: "fixed", label: "راتب ثابت" },
  { value: "hourly", label: "محاضرات (آجور)" },
  { value: "mixed", label: "ثابت + محاضرات" },
];

export const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

export const PERIODS = [1, 2, 3, 4, 5, 6];

export const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const CLASS_GRADES = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس",
  "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر",
];

export const SECTIONS_LIST = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: string;
  bg: string;
}

export const QUICK_ACCESS: QuickAccessItem[] = [
  { id: "add_teacher", label: "إضافة أستاذ", icon: "👨‍🏫", bg: "#EDF6FF" },
  { id: "schedule", label: "الجدول", icon: "📅", bg: "#DBEAFE" },
  { id: "prices", label: "أسعار المحاضرات", icon: "🏷️", bg: "#FEF3C7" },
  { id: "subjects", label: "المواد الدراسية", icon: "📚", bg: "#EAF2FF" },
  { id: "titles", label: "المسميات الوظيفية", icon: "👔", bg: "#E6F4FF" },
  { id: "classes", label: "إضافة صف وشعبة", icon: "🏫", bg: "#CCFBF1" },
  { id: "print", label: "خيارات الطباعة", icon: "🖨️", bg: "#E0E7FF" },
  { id: "export", label: "تصدير بيانات", icon: "📤", bg: "#DCFCE7" },
  { id: "deductions", label: "سحوبات", icon: "💸", bg: "#FEE2E2" },
  { id: "detailed_report", label: "تقرير تفصيلي", icon: "📊", bg: "#FFEDD5" },
  { id: "schedule_lessons", label: "توقيتات الدروس", icon: "⏰", bg: "#E8F3FF" },
  { id: "daily_log", label: "سجل يومي", icon: "📋", bg: "#F1F5F9" },
];

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "main", label: "الرئيسية", icon: "🏠" },
  { id: "teachers", label: "الأساتذة", icon: "👥" },
  { id: "schedule_tab", label: "الجدول", icon: "📅" },
  { id: "deductions", label: "سحوبات", icon: "💸" },
  { id: "reports", label: "التقارير", icon: "📋" },
  { id: "calendar", label: "التقويم", icon: "📆" },
  { id: "archive", label: "الأرشيف", icon: "🗄️" },
  { id: "settings", label: "الإعدادات", icon: "⚙️" },
];

// Teacher type
export interface Teacher {
  id: string;
  school_id: string;
  full_name: string;
  job_title?: string | null;
  subject?: string | null;
  phone?: string | null;
  address?: string | null;
  salary_type: SalaryType;
  base_salary: number;
  lecture_price?: number | null;
  weekly_hours?: number | null;
  classes_taught?: ClassTaught[];
  status: "active" | "inactive";
  created_at?: string;
}

export interface ClassTaught {
  grade: string;
  section: string;
}

// Salary type
export interface Salary {
  id: string;
  school_id: string;
  teacher_id: string;
  gross_salary: number;
  deductions: number;
  month: string;
  notes?: string | null;
  paid_at?: string | null;
  teachers?: Teacher;
}

// Class type
export interface ClassItem {
  id: string;
  school_id: string;
  branch_id?: string | null;
  grade: string;
  section: string;
}

// Subject type
export interface Subject {
  id: string;
  school_id: string;
  name: string;
}

// Job title type
export interface JobTitle {
  id: string;
  school_id: string;
  name: string;
}

// Lecture price type
export interface LecturePrice {
  id: string;
  school_id: string;
  grade: string;
  price_per_lecture: number;
}

// Lesson time type
export interface LessonTime {
  id: string;
  school_id: string;
  period: number;
  session_type: "morning" | "afternoon";
  start_time?: string | null;
  end_time?: string | null;
}

// Daily lecture type
export interface DailyLecture {
  id: string;
  school_id: string;
  teacher_id: string;
  grade: string;
  section: string;
  period: number;
  session_type: "morning" | "afternoon";
  lecture_date: string;
  price: number;
  teachers?: Teacher;
}

// Deduction type
export interface Deduction {
  id: string;
  school_id: string;
  teacher_id: string;
  amount: number;
  notes?: string | null;
  deduction_date: string;
  teachers?: Teacher;
}

// Archive type
export interface SalaryArchive {
  id: string;
  school_id: string;
  month: string;
  archive_date: string;
  total_teachers?: number;
  total_amount?: number;
}

// Teacher form type
export interface TeacherFormData {
  full_name: string;
  job_title: string;
  salary_type: SalaryType;
  subject: string;
  phone: string;
  address: string;
  base_salary: string;
  lecture_price: string;
  weekly_hours: string;
  classes_taught: ClassTaught[];
  status: "active" | "inactive";
}

export const EMPTY_TEACHER_FORM: TeacherFormData = {
  full_name: "",
  job_title: "",
  salary_type: "fixed",
  subject: "",
  phone: "",
  address: "",
  base_salary: "",
  lecture_price: "",
  weekly_hours: "",
  classes_taught: [{ grade: "", section: "" }],
  status: "active",
};

// Salary form type
export interface SalaryFormData {
  gross_salary: string;
  deductions: string;
  notes: string;
  month: string;
}

export const EMPTY_SALARY_FORM: SalaryFormData = {
  gross_salary: "",
  deductions: "0",
  notes: "",
  month: new Date().toISOString().slice(0, 7),
};

// Export options type
export interface ExportOptions {
  lesson_times: boolean;
  classes: boolean;
  prices: boolean;
  teachers: boolean;
  subjects: boolean;
  fixed_salaries: boolean;
  lectures: boolean;
}

export const EMPTY_EXPORT_OPTIONS: ExportOptions = {
  lesson_times: false,
  classes: false,
  prices: false,
  teachers: false,
  subjects: false,
  fixed_salaries: false,
  lectures: false,
};

// Report types
export interface ReportSummary {
  teacher_id: string;
  full_name: string;
  subject?: string;
  lectureCount: number;
  lectureTotal: number;
  salaryPaid: number;
  salaryPending: number;
  byGrade: Record<string, number>;
}

export interface ReportTotals {
  lectureCount: number;
  total: number;
  salaryPaid: number;
  salaryPending: number;
}

// Props types for components
export interface SalariesData {
  teachers: Teacher[];
  salaries: Salary[];
  classes: ClassItem[];
  subjectsList: Subject[];
  jobTitlesList: JobTitle[];
  dailyLectures: DailyLecture[];
  archives: SalaryArchive[];
  lessonTimes: LessonTime[];
  lecturePrices: LecturePrice[];
  deductionsList: Deduction[];
}
