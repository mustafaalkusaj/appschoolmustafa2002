"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type {
  SalariesBootstrapScope,
  Teacher,
  Salary,
  ClassItem,
  Subject,
  JobTitle,
  DailyLecture,
  SalaryArchive,
  LessonTime,
  LecturePrice,
  Deduction,
  ReportSummary,
  ReportTotals,
} from "../_types";

interface BootstrapPayload {
  teachers?: Teacher[];
  salaries?: Salary[];
  classes?: ClassItem[];
  subjects?: Subject[];
  jobTitles?: JobTitle[];
  lessonTimes?: LessonTime[];
  lecturePrices?: LecturePrice[];
  archives?: SalaryArchive[];
  warnings?: string[];
  error?: { message?: string };
}

interface UseSalariesDataReturn {
  // State
  schoolId: string | null;
  loading: boolean;
  referenceLoading: boolean;
  referenceLoaded: boolean;
  archivesLoading: boolean;
  archivesLoaded: boolean;
  error: string;
  success: string;
  
  // Data
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
  calLectureDates: string[];
  
  // Report data
  reportSummary: ReportSummary[];
  reportTotals: ReportTotals;
  reportLoading: boolean;
  
  // Setters
  setSuccess: (s: string) => void;
  setError: (s: string) => void;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  setSalaries: React.Dispatch<React.SetStateAction<Salary[]>>;
  setDeductionsList: React.Dispatch<React.SetStateAction<Deduction[]>>;
  setDailyLectures: React.Dispatch<React.SetStateAction<DailyLecture[]>>;
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
  setSubjectsList: React.Dispatch<React.SetStateAction<Subject[]>>;
  setJobTitlesList: React.Dispatch<React.SetStateAction<JobTitle[]>>;
  setLessonTimes: React.Dispatch<React.SetStateAction<LessonTime[]>>;
  setLecturePrices: React.Dispatch<React.SetStateAction<LecturePrice[]>>;
  
  // Actions
  fetchAll: () => Promise<void>;
  ensureReferenceData: () => Promise<void>;
  ensureArchivesData: () => Promise<void>;
  fetchCalendarLectures: (year: number, month: number) => Promise<void>;
  fetchDetailedReportAll: (teacherId?: string) => Promise<void>;
  fetchReportSummary: () => Promise<void>;
  fetchDeductionsList: () => Promise<void>;
  loadTeacherMonthLectures: (teacher: Teacher, month: string) => Promise<{ count: number; total: number }>;
  getBranchId: () => Promise<string | null>;
  archiveMonth: (currentMonth: string) => Promise<boolean>;
}

export function useSalariesData(
  profile: any,
  schoolScope: any
): UseSalariesDataReturn {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [archivesLoaded, setArchivesLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Data states
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [jobTitlesList, setJobTitlesList] = useState<JobTitle[]>([]);
  const [dailyLectures, setDailyLectures] = useState<DailyLecture[]>([]);
  const [archives, setArchives] = useState<SalaryArchive[]>([]);
  const [lessonTimes, setLessonTimes] = useState<LessonTime[]>([]);
  const [lecturePrices, setLecturePrices] = useState<LecturePrice[]>([]);
  const [deductionsList, setDeductionsList] = useState<Deduction[]>([]);
  const [calLectureDates, setCalLectureDates] = useState<string[]>([]);

  // Report states
  const [reportSummary, setReportSummary] = useState<ReportSummary[]>([]);
  const [reportTotals, setReportTotals] = useState<ReportTotals>({ lectureCount: 0, total: 0 });
  const [reportLoading, setReportLoading] = useState(false);

  const getBranchId = useCallback(async (): Promise<string | null> => {
    if (!schoolId) return null;
    const { data } = await supabase
      .from("branches")
      .select("id")
      .eq("school_id", schoolId)
      .limit(1);
    return data?.[0]?.id ?? null;
  }, [schoolId]);

  const applyReferencePayload = useCallback((payload: BootstrapPayload) => {
    const classesData = payload.classes ?? [];
    const subjectsData = payload.subjects ?? [];
    const jobTitlesData = payload.jobTitles ?? [];
    const lessonTimesData = payload.lessonTimes ?? [];
    const lecturePricesData = payload.lecturePrices ?? [];

    setClasses(classesData);
    setSubjectsList(subjectsData);
    setJobTitlesList(jobTitlesData);
    setLessonTimes(lessonTimesData);
    setLecturePrices(lecturePricesData);
  }, []);

  const fetchBootstrap = useCallback(async (scope: SalariesBootstrapScope, withLoader = false) => {
    if (!schoolId) return;
    if (withLoader) setLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<BootstrapPayload>(
        `/api/web/salaries/bootstrap?schoolId=${encodeURIComponent(schoolId)}&scope=${scope}`
      );

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل بيانات الرواتب.");
      }

      if (scope === "core" || scope === "all") {
        setTeachers(payload?.teachers ?? []);
        setSalaries(payload?.salaries ?? []);
      }

      if (scope === "reference" || scope === "all") {
        applyReferencePayload(payload ?? {});
        setReferenceLoaded(true);
      }

      if (scope === "archive" || scope === "all") {
        setArchives(payload?.archives ?? []);
        setArchivesLoaded(true);
      }

      const warningText = (payload?.warnings ?? []).join(" ");
      setError(warningText);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل بيانات الرواتب.");
    } finally {
      if (withLoader) setLoading(false);
    }
  }, [applyReferencePayload, schoolId]);

  const fetchAll = useCallback(async () => {
    if (!schoolId) return;
    setReferenceLoaded(false);
    setArchivesLoaded(false);
    await fetchBootstrap("all", true);
  }, [fetchBootstrap, schoolId]);

  const ensureReferenceData = useCallback(async () => {
    if (!schoolId || referenceLoaded || referenceLoading) return;
    setReferenceLoading(true);
    try {
      await fetchBootstrap("reference");
    } finally {
      setReferenceLoading(false);
    }
  }, [fetchBootstrap, referenceLoaded, referenceLoading, schoolId]);

  const ensureArchivesData = useCallback(async () => {
    if (!schoolId || archivesLoaded || archivesLoading) return;
    setArchivesLoading(true);
    try {
      await fetchBootstrap("archive");
    } finally {
      setArchivesLoading(false);
    }
  }, [archivesLoaded, archivesLoading, fetchBootstrap, schoolId]);

  const fetchCalendarLectures = useCallback(async (calYear: number, calMonth: number) => {
    if (!schoolId) return;
    const month = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      dates?: string[];
      error?: { message?: string };
    }>(`/api/web/salaries/lectures?schoolId=${encodeURIComponent(schoolId)}&view=calendar&month=${encodeURIComponent(month)}`);
    if (response.ok) {
      setCalLectureDates(payload?.dates ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل تقويم المحاضرات.");
    }
  }, [schoolId]);

  const fetchDetailedReportAll = useCallback(async (teacherId = "") => {
    if (!schoolId) return;
    setReportLoading(true);
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      lectures?: DailyLecture[];
      error?: { message?: string };
    }>(`/api/web/salaries/report?schoolId=${encodeURIComponent(schoolId)}${teacherId ? `&teacherId=${encodeURIComponent(teacherId)}` : ""}`);
    if (response.ok) {
      setDailyLectures(payload?.lectures ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل التقرير التفصيلي.");
    }
    setReportLoading(false);
  }, [schoolId]);

  const fetchReportSummary = useCallback(async () => {
    if (!schoolId) return;
    setReportLoading(true);
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      summary?: ReportSummary[];
      totals?: { lectureCount?: number; total?: number };
      error?: { message?: string };
    }>(`/api/web/salaries/report?schoolId=${encodeURIComponent(schoolId)}&view=summary`);
    if (response.ok) {
      setReportSummary(payload?.summary ?? []);
      setReportTotals({
        lectureCount: Number(payload?.totals?.lectureCount ?? 0) || 0,
        total: Number(payload?.totals?.total ?? 0) || 0,
      });
    } else {
      setError(payload?.error?.message || "تعذر تحميل ملخص الرواتب.");
    }
    setReportLoading(false);
  }, [schoolId]);

  const fetchDeductionsList = useCallback(async () => {
    if (!schoolId) return;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      deductions?: Deduction[];
      error?: { message?: string };
    }>(`/api/web/salaries/deductions?schoolId=${encodeURIComponent(schoolId)}`);
    if (response.ok) {
      setDeductionsList(payload?.deductions ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل سجل السحوبات.");
    }
  }, [schoolId]);

  const loadTeacherMonthLectures = useCallback(async (teacher: Teacher, month: string): Promise<{ count: number; total: number }> => {
    if (!teacher || !schoolId) return { count: 0, total: 0 };
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      summary?: { count?: number; total?: number };
      error?: { message?: string };
    }>(`/api/web/salaries/lectures?schoolId=${encodeURIComponent(schoolId)}&view=summary&teacherId=${encodeURIComponent(teacher.id)}&month=${encodeURIComponent(month)}`);
    if (!response.ok) {
      console.error("Error loading lectures:", payload?.error?.message || "unexpected error");
      return { count: 0, total: 0 };
    }
    return {
      count: Number(payload?.summary?.count ?? 0) || 0,
      total: Number(payload?.summary?.total ?? 0) || 0,
    };
  }, [schoolId]);

  const archiveMonth = useCallback(async (currentMonth: string): Promise<boolean> => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archive?: SalaryArchive;
        error?: { message?: string };
      }>("/api/web/salaries/archive", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          month: currentMonth,
        }),
      });
      if (!response.ok) {
        setError(payload?.error?.message || "تعذر أرشفة الشهر الحالي.");
        return false;
      }
      setSuccess("تم أرشفة الشهر وتصفير عدادات محاضراته ✓");
      setTimeout(() => setSuccess(""), 3000);
      await fetchAll();
      await fetchDetailedReportAll();
      return true;
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "تعذر أرشفة الشهر الحالي.");
      return false;
    }
  }, [fetchAll, fetchDetailedReportAll, schoolId, setSuccess]);

  // Initialize schoolId from profile/scope
  useEffect(() => {
    if (schoolScope.scopeLoading) return;
    if (!profile) {
      setSchoolId(null);
      return;
    }
    setSchoolId(schoolScope.selectedSchoolId ?? profile.school_id ?? null);
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

  // Fetch initial data when schoolId changes
  useEffect(() => {
    if (!schoolId) {
      setTeachers([]);
      setSalaries([]);
      setClasses([]);
      setSubjectsList([]);
      setJobTitlesList([]);
      setDailyLectures([]);
      setArchives([]);
      setLessonTimes([]);
      setLecturePrices([]);
      setDeductionsList([]);
      setCalLectureDates([]);
      setReportSummary([]);
      setReportTotals({ lectureCount: 0, total: 0 });
      setReferenceLoaded(false);
      setArchivesLoaded(false);
      setReferenceLoading(false);
      setArchivesLoading(false);
      setLoading(false);
      return;
    }
    setReferenceLoaded(false);
    setArchivesLoaded(false);
    void fetchBootstrap("core", true);
  }, [fetchBootstrap, schoolId]);

  return {
    schoolId,
    loading,
    referenceLoading,
    referenceLoaded,
    archivesLoading,
    archivesLoaded,
    error,
    success,
    teachers,
    salaries,
    classes,
    subjectsList,
    jobTitlesList,
    dailyLectures,
    archives,
    lessonTimes,
    lecturePrices,
    deductionsList,
    calLectureDates,
    reportSummary,
    reportTotals,
    reportLoading,
    setSuccess,
    setError,
    setTeachers,
    setSalaries,
    setDeductionsList,
    setDailyLectures,
    setClasses,
    setSubjectsList,
    setJobTitlesList,
    setLessonTimes,
    setLecturePrices,
    fetchAll,
    ensureReferenceData,
    ensureArchivesData,
    fetchCalendarLectures,
    fetchDetailedReportAll,
    fetchReportSummary,
    fetchDeductionsList,
    loadTeacherMonthLectures,
    getBranchId,
    archiveMonth,
  };
}
