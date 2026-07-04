export type AppPlatform = "web" | "mobile" | "both";
export type ThemeType = "preset" | "custom";
export type BorderRadius = "sm" | "md" | "lg" | "xl";

export interface AppRecord {
  id: string;
  schoolId: string;
  name: string;
  platform: AppPlatform;
  bundleId: string | null;
  packageName: string | null;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  webUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  school?: { nameAr: string; nameEn: string } | null;
  theme?: AppThemeRecord | null;
  features?: AppFeatureRecord[];
  usageLimit?: AppUsageLimitRecord | null;
}

export interface AppThemeRecord {
  id: string;
  appId: string;
  name: string;
  type: ThemeType;
  presetId: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  sidebarColor: string | null;
  topbarColor: string | null;
  fontFamily: string | null;
  logoUrl: string | null;
  darkModeEnabled: boolean;
  borderRadius: BorderRadius;
  customCss: string | null;
}

export interface AppFeatureRecord {
  id: string;
  appId: string;
  moduleKey: string;
  isEnabled: boolean;
  config: Record<string, unknown> | null;
}

export interface AppUsageLimitRecord {
  id: string;
  appId: string;
  maxStudents: number;
  maxBranches: number;
  maxStorageMB: number;
  maxUsers: number;
  maxClasses: number;
  currentStudents: number;
  currentBranches: number;
  currentStorageMB: number;
  currentUsers: number;
  currentClasses: number;
}

export const MODULE_KEYS = [
  "attendance",
  "accounting",
  "salaries",
  "grades",
  "reports",
  "messaging",
  "transport",
  "library",
  "exams",
  "timetable",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  attendance: "الحضور والغياب",
  accounting: "المحاسبة",
  salaries: "الرواتب",
  grades: "الدرجات",
  reports: "التقارير",
  messaging: "الرسائل",
  transport: "النقل",
  library: "المكتبة",
  exams: "الامتحانات",
  timetable: "الجدول الدراسي",
};

export const MODULE_ICONS: Record<ModuleKey, string> = {
  attendance: "UserCheck",
  accounting: "Calculator",
  salaries: "Banknote",
  grades: "GraduationCap",
  reports: "BarChart3",
  messaging: "MessageSquare",
  transport: "Bus",
  library: "BookOpen",
  exams: "ClipboardCheck",
  timetable: "Calendar",
};
