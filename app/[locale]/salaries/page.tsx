"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/useRuntimeBranding";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print-branding";
import { loadXLSX } from "@/lib/xlsx-loader";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

const SALARY_TYPES = [
  {value:"fixed",label:"راتب ثابت"},
  {value:"hourly",label:"محاضرات (آجور)"},
  {value:"mixed",label:"ثابت + محاضرات"},
];
const DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"];
const PERIODS = [1,2,3,4,5,6];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const CLASS_GRADES = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
];
const SECTIONS_LIST = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

const QUICK_ACCESS = [
  { id:"add_teacher", label:"إضافة أستاذ", icon:"👨‍🏫", bg:"var(--primary-subtle)" },
  { id:"schedule", label:"الجدول", icon:"📅", bg:"#DBEAFE" },
  { id:"prices", label:"أسعار المحاضرات", icon:"🏷️", bg:"#FEF3C7" },
  { id:"bonuses", label:"المكافآت", icon:"🎁", bg:"#D1FAE5" },
  { id:"subjects", label:"المواد الدراسية", icon:"📚", bg:"#EDE9FE" },
  { id:"titles", label:"المسميات الوظيفية", icon:"👔", bg:"#FCE7F3" },
  { id:"classes", label:"إضافة صف وشعبة", icon:"🏫", bg:"#CCFBF1" },
  { id:"print", label:"خيارات الطباعة", icon:"🖨️", bg:"#E0E7FF" },
  { id:"import", label:"استيراد بيانات", icon:"📥", bg:"#E0F2FE" },
  { id:"export", label:"تصدير بيانات", icon:"📤", bg:"#DCFCE7" },
  { id:"deductions", label:"سحوبات", icon:"💸", bg:"#FEE2E2" },
  { id:"detailed_report", label:"تقرير تفصيلي", icon:"📊", bg:"#FFEDD5" },
  { id:"schedule_lessons", label:"توقيتات الدروس", icon:"⏰", bg:"#F3E8FF" },
  { id:"daily_log", label:"سجل يومي", icon:"📋", bg:"#F1F5F9" },
];

export default function SalariesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, canAny } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const canManageTeacher = canAny(["manage_salaries"]);
  const schoolScope = useSchoolScope(profile);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("main");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [jobTitlesList, setJobTitlesList] = useState<any[]>([]);
  const [dailyLectures, setDailyLectures] = useState<any[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [lessonTimes, setLessonTimes] = useState<any[]>([]);
  const [lecturePrices, setLecturePrices] = useState<any[]>([]);
  const [lectureSalaryCalc, setLectureSalaryCalc] = useState({count:0,total:0});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0,7));
  const [showQuickAll, setShowQuickAll] = useState(false);

  // Teacher form
  // Pay salary
  const [showPaySalary, setShowPaySalary] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryForm, setSalaryForm] = useState({gross_salary:"",deductions:"0",notes:"",month:new Date().toISOString().slice(0,7)});

  // Detail
  const [showDetail, setShowDetail] = useState(false);
  const [detailTeacher, setDetailTeacher] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<string|null>(null);
  const [menuPos, setMenuPos] = useState({top:0,left:0});

  // Schedule
  const [scheduleGrade, setScheduleGrade] = useState("");
  const [scheduleSection, setScheduleSection] = useState("");
  const [scheduleGrid, setScheduleGrid] = useState<{[k:string]:string}>({});
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Deductions
  const [deductionTeacher, setDeductionTeacher] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("0");
  const [deductionNotes, setDeductionNotes] = useState("");
  const [savingDeduction, setSavingDeduction] = useState(false);
  const [deductionsList, setDeductionsList] = useState<any[]>([]);

  // Reports
  const [reportView, setReportView] = useState<"summary"|"details">("summary");
  const [reportTeacher, setReportTeacher] = useState("");

  // Calendar
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calLectureDates, setCalLectureDates] = useState<string[]>([]);

  // Prices
  const [priceEdits, setPriceEdits] = useState<{[k:string]:number}>({});

  // Lesson times
  const [timeEdits, setTimeEdits] = useState<{[k:string]:string}>({});

  // Daily log
  const [dailyTeacher, setDailyTeacher] = useState("");
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyGrades, setDailyGrades] = useState<string[]>([]);
  const [dailyPeriods, setDailyPeriods] = useState<string[]>([]);
  const [savingDaily, setSavingDaily] = useState(false);

  // Export
  const [exportOptions, setExportOptions] = useState({lesson_times:false,classes:false,prices:false,teachers:false,subjects:false,fixed_salaries:false,lectures:false});

  // Print
  const [printTeacher, setPrintTeacher] = useState("");

  // Subjects/job titles modals
  const [showSubjectsMgr, setShowSubjectsMgr] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [showJobTitlesMgr, setShowJobTitlesMgr] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [showClassesMgr, setShowClassesMgr] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSectionGrade, setNewSectionGrade] = useState("");
  const [showPrices, setShowPrices] = useState(false);
  const [showScheduleMdl, setShowScheduleMdl] = useState(false);
  const [showLessonTimes, setShowLessonTimes] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [showDeductionsMdl, setShowDeductionsMdl] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherModalSaving, setTeacherModalSaving] = useState(false);
  const [teacherModalError, setTeacherModalError] = useState("");
  const [teacherEditId, setTeacherEditId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    full_name: "",
    job_title: "",
    salary_type: "fixed",
    subject: "",
    phone: "",
    address: "",
    base_salary: "",
    lecture_price: "",
    weekly_hours: "",
    classes_taught: [{ grade: "", section: "" }] as { grade: string; section: string }[],
    status: "active",
  });

  function resetTeacherForm() {
    setTeacherForm({
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
    });
  }

  function openTeacherAdd() {
    setTeacherEditId(null);
    resetTeacherForm();
    setTeacherModalError("");
    setShowTeacherModal(true);
  }

  function openTeacherEdit(t: any) {
    setTeacherEditId(t.id);
    const ct = (t.classes_taught as { grade: string; section: string }[]) || [];
    setTeacherForm({
      full_name: String(t.full_name ?? ""),
      job_title: String(t.job_title ?? ""),
      salary_type: String(t.salary_type ?? "fixed"),
      subject: String(t.subject ?? ""),
      phone: String(t.phone ?? ""),
      address: String(t.address ?? ""),
      base_salary: String(t.base_salary ?? ""),
      lecture_price: String(t.lecture_price ?? ""),
      weekly_hours: String(t.weekly_hours ?? ""),
      classes_taught: ct.length ? ct : [{ grade: "", section: "" }],
      status: String(t.status ?? "active"),
    });
    setTeacherModalError("");
    setShowTeacherModal(true);
  }

  function addTeacherClassRow() {
    setTeacherForm((f) => ({ ...f, classes_taught: [...f.classes_taught, { grade: "", section: "" }] }));
  }
  function removeTeacherClassRow(i: number) {
    setTeacherForm((f) => ({ ...f, classes_taught: f.classes_taught.filter((_, idx) => idx !== i) }));
  }
  function updateTeacherClassRow(i: number, field: "grade" | "section", val: string) {
    setTeacherForm((f) => ({
      ...f,
      classes_taught: f.classes_taught.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)),
    }));
  }

  async function saveTeacherModal(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageTeacher || !schoolId) return;
    setTeacherModalSaving(true);
    setTeacherModalError("");
    const validClasses = teacherForm.classes_taught.filter((c) => c.grade);
    const payload = {
      school_id: schoolId,
      full_name: teacherForm.full_name.trim(),
      subject: teacherForm.subject || null,
      job_title: teacherForm.job_title || null,
      salary_type: teacherForm.salary_type,
      phone: teacherForm.phone || null,
      address: teacherForm.address || null,
      base_salary: parseInt(teacherForm.base_salary, 10) || 0,
      lecture_price: parseInt(teacherForm.lecture_price, 10) || 0,
      weekly_hours: parseInt(teacherForm.weekly_hours, 10) || 0,
      classes_taught: validClasses.length ? validClasses : [],
      status: teacherForm.status,
    };
    if (!payload.full_name) {
      setTeacherModalError("يرجى إدخال الاسم");
      setTeacherModalSaving(false);
      return;
    }

    const endpoint = teacherEditId
      ? `/api/web/salaries/teachers/${encodeURIComponent(teacherEditId)}`
      : "/api/web/salaries/teachers";
    const method = teacherEditId ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<{
      teacher?: any;
      error?: { message?: string };
    }>(endpoint, {
      method,
      headers: withJsonHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setTeacherModalError(responsePayload?.error?.message || "تعذر حفظ بيانات الأستاذ.");
    } else {
      setShowTeacherModal(false);
      await fetchAll();
    }
    setTeacherModalSaving(false);
  }

  useEffect(() => {
    if (schoolScope.scopeLoading) return;
    if (!profile) {
      setSchoolId(null);
      return;
    }
    setSchoolId(schoolScope.selectedSchoolId ?? profile.school_id ?? null);
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

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
      setLoading(false);
      return;
    }
    void fetchAll();
  }, [schoolId]);
  useEffect(()=>{
    const close=()=>setActiveMenu(null);
    document.addEventListener("click",close);
    return()=>document.removeEventListener("click",close);
  },[]);
  useEffect(()=>{
    if(activeSection==="calendar") fetchCalendarLectures();
  },[activeSection,calYear,calMonth]);
  useEffect(()=>{
    if(activeSection==="reports") fetchDetailedReportAll();
  },[activeSection]);
  useEffect(()=>{
    if(activeSection==="deductions") fetchDeductionsList();
  },[activeSection]);

  useEffect(()=>{
    if(!showPaySalary || !selectedTeacher || !schoolId) return;
    let canceled = false;

    (async () => {
      const lectureStats = await loadTeacherMonthLectures(selectedTeacher, salaryForm.month);
      if(canceled) return;
      setLectureSalaryCalc(lectureStats);

      let grossBase = parseInt(salaryForm.gross_salary) || 0;
      if(selectedTeacher.salary_type === "fixed") {
        grossBase = Number(selectedTeacher.base_salary) || 0;
      } else if(selectedTeacher.salary_type === "hourly") {
        grossBase = lectureStats.total;
      } else if(selectedTeacher.salary_type === "mixed") {
        grossBase = (Number(selectedTeacher.base_salary) || 0) + lectureStats.total;
      }
      setSalaryForm(prev => ({...prev, gross_salary: grossBase.toString()}));
    })();

    return () => { canceled = true; };
  }, [showPaySalary, selectedTeacher, salaryForm.month, schoolId]);

  const getBranchId = async()=>{
    if (!schoolId) return null;
    const {data}=await supabase.from("branches").select("id").eq("school_id", schoolId).limit(1);
    return data?.[0]?.id;
  };

  async function fetchAll(){
    if (!schoolId) return;
    setLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        teachers?: any[];
        salaries?: any[];
        classes?: any[];
        subjects?: any[];
        jobTitles?: any[];
        lessonTimes?: any[];
        lecturePrices?: any[];
        archives?: any[];
        warnings?: string[];
        error?: { message?: string };
      }>(`/api/web/salaries/bootstrap?schoolId=${encodeURIComponent(schoolId)}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل بيانات الرواتب.");
      }

      const teachersData = payload?.teachers ?? [];
      const salariesData = payload?.salaries ?? [];
      const classesData = payload?.classes ?? [];
      const subjectsData = payload?.subjects ?? [];
      const jobTitlesData = payload?.jobTitles ?? [];
      const lessonTimesData = payload?.lessonTimes ?? [];
      const lecturePricesData = payload?.lecturePrices ?? [];
      const archivesData = payload?.archives ?? [];

      setTeachers(teachersData);
      setSalaries(salariesData);
      setClasses(classesData);
      setSubjectsList(subjectsData);
      setJobTitlesList(jobTitlesData);
      setLessonTimes(lessonTimesData);
      setLecturePrices(lecturePricesData);
      setArchives(archivesData);
      if (lessonTimesData) {
        const ed: {[k:string]:string} = {};
        lessonTimesData.forEach((x:any) => {
          ed[`${x.period}-${x.session_type}-start`] = x.start_time || "";
          ed[`${x.period}-${x.session_type}-end`] = x.end_time || "";
        });
        setTimeEdits(ed);
      }
      setError((payload?.warnings ?? []).join(" "));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل بيانات الرواتب.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCalendarLectures(){
    if (!schoolId) return;
    const month = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      dates?: string[];
      error?: { message?: string };
    }>(`/api/web/salaries/lectures?schoolId=${encodeURIComponent(schoolId)}&view=calendar&month=${encodeURIComponent(month)}`);
    if(response.ok){
      setCalLectureDates(payload?.dates ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل تقويم المحاضرات.");
    }
  }

  async function fetchDetailedReportAll(){
    if (!schoolId) return;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      lectures?: any[];
      error?: { message?: string };
    }>(`/api/web/salaries/report?schoolId=${encodeURIComponent(schoolId)}`);
    if(response.ok){
      setDailyLectures(payload?.lectures ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل التقرير التفصيلي.");
    }
  }

  async function fetchDeductionsList(){
    if (!schoolId) return;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      deductions?: any[];
      error?: { message?: string };
    }>(`/api/web/salaries/deductions?schoolId=${encodeURIComponent(schoolId)}`);
    if(response.ok){
      setDeductionsList(payload?.deductions ?? []);
    } else {
      setError(payload?.error?.message || "تعذر تحميل سجل السحوبات.");
    }
  }

  async function loadTeacherMonthLectures(teacher:any, month:string){
    if(!teacher || !schoolId) return {count:0,total:0};
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      summary?: { count?: number; total?: number };
      error?: { message?: string };
    }>(`/api/web/salaries/lectures?schoolId=${encodeURIComponent(schoolId)}&view=summary&teacherId=${encodeURIComponent(teacher.id)}&month=${encodeURIComponent(month)}`);
    if(!response.ok){
      console.error("Error loading lectures:", payload?.error?.message || "unexpected error");
      return {count:0,total:0};
    }
    return {
      count: Number(payload?.summary?.count ?? 0) || 0,
      total: Number(payload?.summary?.total ?? 0) || 0,
    };
  }

  // ===== SALARY =====
  async function handlePaySalary(e:React.FormEvent){
    e.preventDefault();if(!selectedTeacher)return;setSavingSalary(true);setError("");
    let gross = 0;
    if(selectedTeacher.salary_type === "fixed") {
      gross = Number(selectedTeacher.base_salary) || 0;
    } else if(selectedTeacher.salary_type === "hourly") {
      gross = lectureSalaryCalc.total;
    } else if(selectedTeacher.salary_type === "mixed") {
      gross = (Number(selectedTeacher.base_salary) || 0) + lectureSalaryCalc.total;
    } else {
      gross = parseInt(salaryForm.gross_salary) || Number(selectedTeacher.base_salary) || 0;
    }
    const deductions=parseInt(salaryForm.deductions)||0;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        salary?: any;
        warning?: string;
        error?: { message?: string };
      }>("/api/web/salaries/pay", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: selectedTeacher.id,
          gross_salary: gross,
          deductions,
          month: salaryForm.month,
          notes: salaryForm.notes || null,
        }),
      });
      if (!response.ok) {
        setError(payload?.error?.message || "تعذر صرف الراتب.");
        return;
      }
      if (payload?.salary) {
        setSalaries((current) => [payload.salary, ...current.filter((item) => item.id !== payload.salary.id)]);
      }
      setSuccess(
        payload?.warning
          ? `تم دفع راتب ${selectedTeacher.full_name} مع معالجة التكرارات المتزامنة ✓`
          : `تم دفع راتب ${selectedTeacher.full_name} ✓`,
      );
      setShowPaySalary(false);setSalaryForm({gross_salary:"",deductions:"0",notes:"",month:new Date().toISOString().slice(0,7)});setSelectedTeacher(null);fetchAll();setTimeout(()=>setSuccess(""),3000);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "تعذر صرف الراتب.");
    } finally {
      setSavingSalary(false);
    }
  }

  // ===== SCHEDULE =====
  async function fetchSchedule(grade:string,section:string){
    const {data}=await supabase.from("weekly_schedule").select("*").eq("school_id",schoolId).eq("grade",grade).eq("section",section);
    const grid:{[k:string]:string}={};
    data?.forEach((s:any)=>{grid[`${s.day}-${s.period}-${s.session_type}`]=s.teacher_id||"";});
    setScheduleGrid(grid);
  }
  async function saveSchedule(){
    setScheduleSaving(true);
    await supabase.from("weekly_schedule").delete().eq("school_id",schoolId).eq("grade",scheduleGrade).eq("section",scheduleSection);
    const bid=await getBranchId();const rows:any[]=[];
    for(const [key,teacherId] of Object.entries(scheduleGrid)){
      if(!teacherId)continue;
      const [day,period,type]=key.split("-");
      rows.push({school_id:schoolId,branch_id:bid,grade:scheduleGrade,section:scheduleSection,day,period:parseInt(period),session_type:type,teacher_id:teacherId});
    }
    if(rows.length)await supabase.from("weekly_schedule").insert(rows);
    setSuccess("تم حفظ الجدول ✓");setScheduleSaving(false);setTimeout(()=>setSuccess(""),3000);
  }

  // ===== PRICES =====
  async function savePrices(){
    const allGrades=gradeOptions;
    for(const grade of allGrades){
      const price=priceEdits[grade]||0;
      const existing=lecturePrices.find(p=>p.grade===grade);
      if(existing)await supabase.from("lecture_prices").update({price_per_lecture:price}).eq("id",existing.id);
      else await supabase.from("lecture_prices").insert({school_id:schoolId,grade,price_per_lecture:price});
    }
    setSuccess("تم حفظ الأسعار ✓");setTimeout(()=>setSuccess(""),3000);fetchAll();
  }

  // ===== LESSON TIMES =====
  async function saveLessonTimes(){
    for(const t of lessonTimes){
      const start=timeEdits[`${t.period}-${t.session_type}-start`];
      const end=timeEdits[`${t.period}-${t.session_type}-end`];
      await supabase.from("lesson_times").update({start_time:start,end_time:end}).eq("id",t.id);
    }
    setSuccess("تم حفظ توقيتات الدروس ✓");setTimeout(()=>setSuccess(""),3000);
  }

  // ===== DAILY LOG =====
  async function saveDailyLog(){
    if(!dailyTeacher||!dailyDate)return;setSavingDaily(true);
    const bid=await getBranchId();const rows:any[]=[];
    const selectedTeacherRow = teachers.find((t) => t.id === dailyTeacher);
    const teacherLecturePrice = Number(selectedTeacherRow?.lecture_price) || 0;
    for(const gradeSection of dailyGrades){
      const [grade,section]=gradeSection.split("||");
      const classPrice=lecturePrices.find(p=>p.grade===grade)?.price_per_lecture||0;
      const price = teacherLecturePrice > 0 ? teacherLecturePrice : classPrice;
      for(const p of dailyPeriods){
        const [period,type]=p.split("-");
        rows.push({school_id:schoolId,branch_id:bid,teacher_id:dailyTeacher,grade,section,period:parseInt(period),session_type:type,lecture_date:dailyDate,price});
      }
    }
    if(rows.length)await supabase.from("daily_lectures").insert(rows);
    setSuccess(`تم تسجيل ${rows.length} محاضرة ✓`);setDailyGrades([]);setDailyPeriods([]);setSavingDaily(false);setTimeout(()=>setSuccess(""),3000);
    fetchDetailedReportAll();fetchCalendarLectures();
  }

  // ===== DEDUCTIONS =====
  async function saveDeduction(){
    if(!deductionTeacher||!deductionAmount)return;setSavingDeduction(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        deduction?: any;
        error?: { message?: string };
      }>("/api/web/salaries/deductions", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          teacher_id: deductionTeacher,
          amount: parseInt(deductionAmount)||0,
          notes: deductionNotes||null,
          deduction_date: new Date().toISOString().split("T")[0],
        }),
      });
      if (!response.ok) {
        setError(payload?.error?.message || "تعذر تسجيل السحب.");
        return;
      }
      setSuccess("تم تسجيل السحب ✓");setDeductionTeacher("");setDeductionAmount("0");setDeductionNotes("");setTimeout(()=>setSuccess(""),3000);fetchDeductionsList();
    } finally {
      setSavingDeduction(false);
    }
  }

  // ===== ARCHIVE =====
  async function archiveMonth(){
    if(!confirm("هل تريد أرشفة الشهر الحالي وتصفير العدادات؟"))return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archive?: any;
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
        return;
      }
      setSuccess("تم أرشفة الشهر وتصفير عدادات محاضراته ✓");setTimeout(()=>setSuccess(""),3000);fetchAll();fetchDetailedReportAll();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "تعذر أرشفة الشهر الحالي.");
    }
  }

  // ===== EXPORT =====
  async function doExport(){
    const XLSX = await loadXLSX();
    const wb=XLSX.utils.book_new();
    if(exportOptions.teachers){const rows=teachers.map(t=>({الاسم:t.full_name,المسمى:t.job_title||"",المادة:t.subject||"",الراتب:t.base_salary,"سعر المحاضرة":t.lecture_price||0}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"الأساتذة");}
    if(exportOptions.subjects){const rows=subjectsList.map(s=>({المادة:s.name}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"المواد");}
    if(exportOptions.classes){const rows=classes.map(c=>({الصف:c.grade,الشعبة:c.section}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"الصفوف");}
    if(exportOptions.fixed_salaries){const rows=salaries.map(s=>({الأستاذ:s.teachers?.full_name||"",الشهر:s.month,الإجمالي:s.gross_salary,الخصومات:s.deductions||0,الصافي:(s.gross_salary||0)-(s.deductions||0)}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"الرواتب");}
    if(exportOptions.lectures){const rows=dailyLectures.map((l:any)=>({الأستاذ:l.teachers?.full_name||"",التاريخ:l.lecture_date,الصف:l.grade,الشعبة:l.section,الدرس:l.period,النوع:l.session_type,السعر:l.price}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"المحاضرات");}
    if(wb.SheetNames.length===0){setError("اختر بيانات للتصدير");return;}
    XLSX.writeFile(wb,`تصدير_${formatDate(new Date())}.xlsx`);setShowExport(false);
  }

  function openPrintWindow(title:string, subtitle:string, bodyHtml:string){
    const w=window.open("","_blank");
    if(!w)return;
    w.document.write(
      wrapPrintDocument({
        title,
        subtitle,
        bodyHtml,
        branding:{
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: isEnglish ? "en" : "ar",
        },
      }),
    );
    w.document.close();
  }

  function printSalarySlip(salary:any){
    const net=(salary.gross_salary||0)-(salary.deductions||0);
    openPrintWindow(
      isEnglish ? "Salary slip" : "قسيمة راتب",
      escapeHtml(salary.teachers?.full_name || (isEnglish ? "Teacher account" : "سجل الأستاذ")),
      `
        <div class="print-grid">
          <div class="print-panel"><span class="print-label">${isEnglish ? "Teacher" : "الاسم"}</span><div class="print-value">${escapeHtml(salary.teachers?.full_name||"—")}</div></div>
          <div class="print-panel"><span class="print-label">${isEnglish ? "Month" : "الشهر"}</span><div class="print-value">${escapeHtml(salary.month || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${isEnglish ? "Gross salary" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(salary.gross_salary||0)}</div></div>
          <div class="print-panel"><span class="print-label">${isEnglish ? "Deductions" : "الخصومات"}</span><div class="print-value" style="color:#dc2626">د.ع ${formatNumber(salary.deductions||0)}</div></div>
        </div>
        <div class="print-panel" style="margin-top:16px;text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
          <span class="print-label">${isEnglish ? "Net amount" : "الصافي"}</span>
          <div class="print-value" style="font-size:30px">د.ع ${formatNumber(net)}</div>
        </div>
      `,
    );
  }

  function printReport(){
    const teacher=reportTeacher?teachers.find(t=>t.id===reportTeacher):null;
    const lectures=reportTeacher?dailyLectures.filter((l:any)=>l.teacher_id===reportTeacher):dailyLectures;
    const total=lectures.reduce((a:number,l:any)=>a+l.price,0);
    openPrintWindow(
      isEnglish ? "Teacher statement" : "كشف حساب",
      teacher?.full_name || (isEnglish ? "All teachers" : "جميع الأساتذة"),
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Section" : "الشعبة"}</th><th>${isEnglish ? "Lesson" : "الدرس"}</th><th>${isEnglish ? "Price" : "السعر"}</th></tr></thead>
          <tbody>${lectures.map((l:any,i:number)=>`<tr><td>${i+1}</td><td>${formatDate(l.lecture_date)}</td><td>${escapeHtml(l.grade || "—")}</td><td>${escapeHtml(l.section || "—")}</td><td>${isEnglish ? "Lesson" : "الدرس"} ${escapeHtml(String(l.period ?? "—"))}</td><td>${formatNumber(l.price || 0)}</td></tr>`).join("")}</tbody>
        </table>
        <div class="print-panel" style="margin-top:16px;text-align:center">
          <span class="print-label">${isEnglish ? "Total" : "الإجمالي"}</span>
          <div class="print-value">د.ع ${formatNumber(total)}</div>
        </div>
      `,
    );
  }

  function printAllTeachers(){
    openPrintWindow(
      isEnglish ? "Teachers summary" : "تقرير شامل",
      isEnglish ? `${teachers.length} teachers` : `${teachers.length} أستاذ`,
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Job title" : "المسمى"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Salary" : "الراتب"}</th><th>${isEnglish ? "Lecture price" : "سعر المحاضرة"}</th></tr></thead>
          <tbody>${teachers.map((t,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(t.full_name || "—")}</td><td>${escapeHtml(t.job_title||"—")}</td><td>${escapeHtml(t.subject||"—")}</td><td>${formatNumber(t.base_salary || 0)}</td><td>${formatNumber(t.lecture_price||0)}</td></tr>`).join("")}</tbody>
        </table>
      `,
    );
  }

  async function addSubject(){if(!newSubject.trim())return;await supabase.from("subjects").insert({school_id:schoolId,name:newSubject.trim()});setNewSubject("");fetchAll();}
  async function deleteSubject(id:string){await supabase.from("subjects").delete().eq("id",id);fetchAll();}
  async function addJobTitle(){if(!newJobTitle.trim())return;await supabase.from("job_titles").insert({school_id:schoolId,name:newJobTitle.trim()});setNewJobTitle("");fetchAll();}
  async function deleteJobTitle(id:string){await supabase.from("job_titles").delete().eq("id",id);fetchAll();}
  async function addClass(){if(!newGrade.trim())return;const bid=await getBranchId();await supabase.from("classes").insert({school_id:schoolId,branch_id:bid,grade:newGrade.trim(),section:"أ"});setNewGrade("");fetchAll();}
  async function addSection(){if(!newSectionGrade||!newSection.trim())return;const bid=await getBranchId();await supabase.from("classes").insert({school_id:schoolId,branch_id:bid,grade:newSectionGrade,section:newSection.trim()});setNewSection("");fetchAll();}
  async function deleteClass(id:string){await supabase.from("classes").delete().eq("id",id);fetchAll();}

  function openMenu(e:React.MouseEvent,teacher:any){e.stopPropagation();const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();setMenuPos({top:rect.bottom+4,left:rect.left-100});setActiveMenu(activeMenu===teacher.id?null:teacher.id);setSelectedTeacher(teacher);}
  const toggleArr=(arr:string[],val:string)=>arr.includes(val)?arr.filter(x=>x!==val):[...arr,val];
  function handleQuickAction(id:string){
    if(id==="add_teacher"){openTeacherAdd();}
    else if(id==="classes")setShowClassesMgr(true);
    else if(id==="subjects")setShowSubjectsMgr(true);
    else if(id==="titles")setShowJobTitlesMgr(true);
    else if(id==="prices"){const ed:{[k:string]:number}={};gradeOptions.forEach(g=>{ed[g]=lecturePrices.find(p=>p.grade===g)?.price_per_lecture||0;});setPriceEdits(ed);setShowPrices(true);}
    else if(id==="schedule")setShowScheduleMdl(true);
    else if(id==="schedule_lessons")setShowLessonTimes(true);
    else if(id==="daily_log")setShowDailyLog(true);
    else if(id==="detailed_report"){setActiveSection("reports");fetchDetailedReportAll();}
    else if(id==="deductions")setShowDeductionsMdl(true);
    else if(id==="export"){fetchDetailedReportAll();setShowExport(true);}
    else if(id==="print")setShowPrint(true);
  }

  const monthSalaries=salaries.filter(s=>s.month===currentMonth);
  const paidTeacherIds=monthSalaries.map(s=>s.teacher_id);
  const unpaidTeachers=teachers.filter(t=>!paidTeacherIds.includes(t.id)&&t.status==="active");
  const totalBaseSalaries=teachers.filter(t=>t.status==="active").reduce((a,t)=>a+t.base_salary,0);
  const totalPaidThisMonth=monthSalaries.reduce((a,s)=>a+((s.gross_salary||0)-(s.deductions||0)),0);
  const activeTeachers=teachers.filter(t=>t.status==="active").length;
  const teacherSalaries=(id:string)=>salaries.filter(s=>s.teacher_id===id).sort((a,b)=>b.month.localeCompare(a.month));
  const gradeOptions=Array.from(new Set(classes.map(c=>c.grade))) as string[];
  const sectionOptions=(grade:string)=>classes.filter(c=>c.grade===grade).map(c=>c.section);
  const visibleQuick = QUICK_ACCESS.slice(0,7);

  // Report data
  const teacherLectureStats=teachers.map(t=>{
    const lects=dailyLectures.filter((l:any)=>l.teacher_id===t.id);
    const total=lects.reduce((a:number,l:any)=>a+l.price,0);
    const byGrade:{[k:string]:number}={};
    lects.forEach((l:any)=>{byGrade[l.grade]=(byGrade[l.grade]||0)+1;});
    return{...t,lectureCount:lects.length,lectureTotal:total,byGrade};
  }).filter(t=>t.lectureCount>0);

  // Calendar helpers
  const daysInMonth=(y:number,m:number)=>new Date(y,m+1,0).getDate();
  const firstDayOfMonth=(y:number,m:number)=>new Date(y,m,1).getDay();
  const today=new Date();

  const SIDEBAR_ITEMS=[
    {id:"main",label:"الرئيسية",icon:"🏠"},
    {id:"teachers",label:"الأساتذة",icon:"👥"},
    {id:"schedule_tab",label:"الجدول",icon:"📅"},
    {id:"deductions",label:"سحوبات",icon:"💸"},
    {id:"reports",label:"التقارير",icon:"📋"},
    {id:"calendar",label:"التقويم",icon:"📆"},
    {id:"archive",label:"الأرشيف",icon:"🗄️"},
    {id:"settings",label:"الإعدادات",icon:"⚙️"},
  ];

  return (
  <ProtectedRoute roles={["super_admin", "admin"]}>
    <div className="app-layout">
      {/* MAIN SIDEBAR */}
      <AppSidebar currentPath="/salaries" containerClassName="main-sidebar" />

      {/* SALARIES SIDEBAR */}
      <div className="sal-sidebar">
        <div style={{fontSize:".72rem",fontWeight:800,color:"var(--primary)",padding:".4rem .7rem .6rem",borderBottom:"1px solid var(--border)",marginBottom:".4rem"}}>الرواتب</div>
        {SIDEBAR_ITEMS.map(item=>(
          <button key={item.id} className={`sal-nav${activeSection===item.id?" active":""}`} onClick={()=>{setActiveSection(item.id);if(item.id==="reports")fetchDetailedReportAll();if(item.id==="deductions")fetchDeductionsList();if(item.id==="calendar")fetchCalendarLectures();}}>
            <AppIcon token={item.icon} size={15} /><span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="app-main">
        <AppShellTopbar
          title={activeSection==="main"?"إدارة الرواتب":activeSection==="teachers"?"قائمة المدرسين":activeSection==="schedule_tab"?"الجدول الأسبوعي":activeSection==="deductions"?"السحوبات":activeSection==="reports"?"التقارير الشاملة":activeSection==="calendar"?"التقويم الشهري":activeSection==="archive"?"أرشيف الرواتب":"الإعدادات"}
          subtitle={`${activeTeachers} مدرس نشط`}
          scope={schoolScope}
        />
        <div className="content app-shell-content">
          {success&&<div className="msg-success">{success}</div>}
          {error&&<div className="msg-error">{error}</div>}
          <SchoolScopeBanner scope={schoolScope} showSelector={false} />
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="بيانات الرواتب"
              description="لن يتم تحميل المدرسين أو الرواتب أو الجداول قبل اختيار مدرسة صريحة لهذا القسم."
            />
          ) : (
            <>
          {/* ===== MAIN ===== */}
          {activeSection==="main"&&<>
            <div className="stats">
              {([["عدد المدرسين",formatNumber(activeTeachers),"var(--primary-subtle)","var(--primary)"],["إجمالي الرواتب",`د.ع ${formatNumber(totalBaseSalaries)}`,"rgba(16,185,129,0.10)","var(--success)"],["مدفوع هذا الشهر",`د.ع ${formatNumber(totalPaidThisMonth)}`,"rgba(59,130,246,0.10)","var(--info)"],["غير مدفوع",formatNumber(unpaidTeachers.length)+" مدرس","rgba(239,68,68,0.10)","var(--danger)"]] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                <div className="sc" key={i}>
                  <div className="sc-ico" style={{background:bg}}><svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg></div>
                  <div><div className="sc-label">{l}</div><div className="sc-val">{v}</div></div>
                </div>
              ))}
            </div>
            <div className="quick-section">
              <div className="quick-header"><div className="quick-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📌" size={14} />الوصول السريع</div><button className="show-all-btn" onClick={()=>setShowQuickAll(!showQuickAll)}>{showQuickAll?"عرض أقل":"عرض الكل"}</button></div>
              <div className="quick-grid">
                {visibleQuick.map(qa=>(
                  <button key={qa.id} className="qa-btn" onClick={()=>handleQuickAction(qa.id)}>
                    <div className="qa-ico" style={{background:qa.bg}}><AppIcon token={qa.icon} size={20} /></div>
                    <span className="qa-label">{qa.label}</span>
                  </button>
                ))}
              </div>
              {showQuickAll&&<div className="quick-grid" style={{marginTop:".6rem"}}>
                {QUICK_ACCESS.slice(7).map(qa=>(
                  <button key={qa.id} className="qa-btn" onClick={()=>handleQuickAction(qa.id)}>
                    <div className="qa-ico" style={{background:qa.bg}}><AppIcon token={qa.icon} size={20} /></div>
                    <span className="qa-label">{qa.label}</span>
                  </button>
                ))}
              </div>}
            </div>
            <div className="tabs">
              {[{id:"teachers_tab",label:"المدرسون",icon:"👨‍🏫",count:teachers.length},{id:"salaries_tab",label:"سجل الرواتب",icon:"💰",count:salaries.length},{id:"unpaid_tab",label:"غير مدفوع",icon:"⚠️",count:unpaidTeachers.length}].map(t=>(
                <button key={t.id} className={`tab${activeSection===t.id?" active":""}`} onClick={()=>setActiveSection(t.id)}>
                  <AppIcon token={t.icon} size={15} /><span>{t.label}</span><span className="tab-count">{t.count}</span>
                </button>
              ))}
            </div>
            {unpaidTeachers.length>0&&<div className="alert-box"><AppIcon token="⚠️" size={14} /> {unpaidTeachers.length} مدرس لم يستلم راتب شهر {currentMonth}</div>}
            <div className="tbl-wrap">
              {loading?<div className="spin"/>:teachers.length===0?<div className="empty">لا يوجد مدرسون — اضغط إضافة مدرس</div>:(
                <table>
                  <thead><tr><th>#</th><th>الاسم</th><th>المسمى</th><th>المادة</th><th>الراتب</th><th>سعر المحاضرة</th><th>حالة الشهر</th><th>خيارات</th></tr></thead>
                  <tbody>
                    {teachers.map((t,i)=>{
                      const paid=paidTeacherIds.includes(t.id);
                      return <tr key={t.id}>
                        <td style={{color:"var(--text-tertiary)",fontSize:".7rem"}}>{i+1}</td>
                        <td><span className="name-link" onClick={()=>{setDetailTeacher(t);setShowDetail(true)}}>{t.full_name}</span></td>
                        <td style={{color:"var(--text-tertiary)",fontSize:".75rem"}}>{t.job_title||"—"}</td>
                        <td style={{color:"var(--text-tertiary)"}}>{t.subject||"—"}</td>
                        <td style={{fontWeight:700}}>د.ع {formatNumber(t.base_salary)}</td>
                        <td style={{fontWeight:700,color:"#2563EB"}}>د.ع {formatNumber(t.lecture_price||0)}</td>
                        <td>{paid?<span className="badge badge--success">✓ مدفوع</span>:<span className="badge badge--danger">غير مدفوع</span>}</td>
                        <td>
                          {!paid&&<button className="btn-pay-s" onClick={()=>{setSelectedTeacher(t);setSalaryForm({gross_salary:t.base_salary.toString(),deductions:"0",notes:"",month:currentMonth});setShowPaySalary(true);}}><AppIcon token="💰" size={13} /> دفع</button>}
                          <button className="btn-action" onClick={(e)=>openMenu(e,t)}>▾</button>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>}

          {/* ===== TEACHERS ===== */}
          {activeSection==="teachers"&&<>
            <div className="toolbar">
              <div className="srch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input placeholder="بحث..."/></div>
              <button type="button" className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={openTeacherAdd} style={{textDecoration:"none",border:"none",cursor:"pointer"}}>+ إضافة أستاذ</button>
            </div>
            <div className="tbl-wrap">
              {loading?<div className="spin"/>:(
                <table>
                  <thead><tr><th>#</th><th>الاسم</th><th>المادة</th><th>سعر المحاضرة</th><th>الصف والشعبة</th><th>الملف</th></tr></thead>
                  <tbody>
                    {teachers.map((t,i)=>(
                      <tr key={t.id}>
                        <td style={{color:"var(--text-tertiary)",fontSize:".7rem"}}>{i+1}</td>
                        <td>
                          <div style={{fontWeight:700}}>{t.full_name}</div>
                          <div style={{fontSize:".7rem",color:"var(--primary)"}}>{t.job_title||""}</div>
                        </td>
                        <td style={{color:"var(--text-tertiary)"}}>{t.subject||"—"}</td>
                        <td style={{fontWeight:700,color:"#2563EB"}}>د.ع {formatNumber(t.lecture_price||0)}</td>
                        <td>
                          {t.classes_taught?.slice(0,3).map((c:any,i:number)=>(
                            <span key={i} className="grade-badge">{c.grade} ({c.section})</span>
                          ))}
                          {t.classes_taught?.length>3&&<span className="grade-badge">+{t.classes_taught.length-3}</span>}
                        </td>
                        <td>
                          <button type="button" className="btn-edit-s" onClick={()=>openTeacherEdit(t)} style={{display:"inline-flex",textDecoration:"none",border:"none",background:"transparent",cursor:"pointer"}}><AppIcon token="✏️" size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>}

          {/* ===== SCHEDULE ===== */}
          {activeSection==="schedule_tab"&&<>
            <div style={{display:"flex",gap:".7rem",marginBottom:"1rem"}}>
              <select className="month-pick" value={scheduleGrade} onChange={e=>{setScheduleGrade(e.target.value);setScheduleSection("");}}>
                <option value="">اختر الصف...</option>
                {gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
              <select className="month-pick" value={scheduleSection} onChange={e=>{setScheduleSection(e.target.value);if(scheduleGrade&&e.target.value)fetchSchedule(scheduleGrade,e.target.value);}}>
                <option value="">اختر الشعبة...</option>
                {sectionOptions(scheduleGrade).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {scheduleGrade&&scheduleSection&&<button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" disabled={scheduleSaving} onClick={saveSchedule}>{scheduleSaving?"جارٍ الحفظ...":<><AppIcon token="💾" size={14} /> حفظ الجدول</>}</button>}
            </div>
            {scheduleGrade&&scheduleSection?(
              ["morning","afternoon"].map(sessionType=>(
                <div key={sessionType} style={{marginBottom:"1rem"}}>
                  <div className="session-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                    <AppIcon token={sessionType==="morning"?"🌅":"🌞"} size={14} />
                    {sessionType==="morning"?"الدوام الصباحي":"الدوام الظهري"}
                  </div>
                  <div className="tbl-wrap">
                    <table className="sch-grid">
                      <thead><tr><th>اليوم / الدرس</th>{PERIODS.map(p=><th key={p}>{p}</th>)}</tr></thead>
                      <tbody>
                        {DAYS.map(day=>(
                          <tr key={day}>
                            <td style={{fontWeight:700,textAlign:"center",background:"var(--primary-subtle)",padding:".4rem"}}>{day}</td>
                            {PERIODS.map(p=>(
                              <td key={p}>
                                <select className="sch-sel" value={scheduleGrid[`${day}-${p}-${sessionType}`]||""} onChange={e=>setScheduleGrid({...scheduleGrid,[`${day}-${p}-${sessionType}`]:e.target.value})}>
                                  <option value="">(فراغ)</option>
                                  {teachers.filter(t=>t.status==="active").map(t=><option key={t.id} value={t.id}>{t.full_name.split(" ")[0]}</option>)}
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ):<div className="empty">اختر الصف والشعبة لعرض الجدول</div>}
          </>}

          {/* ===== DEDUCTIONS ===== */}
          {activeSection==="deductions"&&<>
            <div className="ded-form">
              <div style={{fontSize:".88rem",fontWeight:800,marginBottom:"1rem",display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="💸" size={14} /> تسجيل سحب جديد</div>
              <div className="fg">
                <div className="ff full">
                  <label className="fl">اسم الأستاذ</label>
                  <select className="form-input" value={deductionTeacher} onChange={e=>setDeductionTeacher(e.target.value)}>
                    <option value="">اختر الأستاذ...</option>
                    {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">مبلغ السحب (د.ع)</label>
                  <input type="number" className="form-input" value={deductionAmount} onChange={e=>setDeductionAmount(e.target.value)}/>
                </div>
                <div className="ff">
                  <label className="fl">الملاحظات <span className="opt">(اختياري)</span></label>
                  <input className="form-input" value={deductionNotes} onChange={e=>setDeductionNotes(e.target.value)} placeholder="أي ملاحظات..."/>
                </div>
              </div>
              <button className="ui-button ui-button--primary" style={{marginTop:".8rem",maxWidth:200}} disabled={savingDeduction||!deductionTeacher} onClick={saveDeduction}>{savingDeduction?"جارٍ الحفظ...":"حفظ السحب"}</button>
            </div>
            <div className="tbl-wrap">
              {deductionsList.length===0?<div className="empty">لا توجد سحوبات مسجلة</div>:(
                <table>
                  <thead><tr><th>#</th><th>الأستاذ</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th></tr></thead>
                  <tbody>
                    {deductionsList.map((d:any,i:number)=>(
                      <tr key={d.id}>
                        <td style={{color:"var(--text-tertiary)",fontSize:".7rem"}}>{i+1}</td>
                        <td style={{fontWeight:700}}>{d.teachers?.full_name||"—"}</td>
                        <td style={{color:"var(--danger)",fontWeight:700}}>د.ع {formatNumber(d.amount)}</td>
                        <td style={{color:"var(--text-tertiary)",fontSize:".75rem"}}>{formatDate(d.deduction_date)}</td>
                        <td style={{color:"var(--text-tertiary)",fontSize:".75rem"}}>{d.notes||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>}

          {/* ===== REPORTS ===== */}
          {activeSection==="reports"&&<>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div className="report-tabs">
                <button className="report-tab" style={{background:reportView==="summary"?"linear-gradient(135deg,var(--primary),var(--primary))":"var(--primary-subtle)",color:reportView==="summary"?"white":"var(--primary)"}} onClick={()=>setReportView("summary")}>ملخص</button>
                <button className="report-tab" style={{background:reportView==="details"?"linear-gradient(135deg,var(--primary),var(--primary))":"var(--primary-subtle)",color:reportView==="details"?"white":"var(--primary)"}} onClick={()=>setReportView("details")}>تفاصيل السجلات</button>
              </div>
              <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={printReport}><AppIcon token="🖨️" size={14} /> طباعة التقرير</button>
            </div>

            {reportView==="summary"&&(
              <>
                {teacherLectureStats.length===0?<div className="empty">لا توجد محاضرات مسجلة</div>:teacherLectureStats.map(t=>(
                  <div className="report-card" key={t.id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div className="report-name">{t.full_name}</div>
                        <div className="report-sub">{t.subject||"—"} • {t.job_title||""}</div>
                        <div style={{marginTop:".4rem"}}>
                          {Object.entries(t.byGrade).map(([grade,count]:any)=>(
                            <span key={grade} className="grade-badge">{grade}: {count}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:".75rem",color:"var(--text-tertiary)",marginBottom:".2rem"}}>عدد المحاضرات: <strong>{t.lectureCount}</strong></div>
                        <div className="report-amount">د.ع {formatNumber(t.lectureTotal)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {teacherLectureStats.length>0&&(
                  <div style={{background:"linear-gradient(135deg,var(--primary),var(--primary))",borderRadius:13,padding:"1rem 1.4rem",color:"white",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".5rem"}}>
                    <span style={{fontWeight:700}}>إجمالي جميع المحاضرات: {dailyLectures.length}</span>
                    <span style={{fontSize:"1.1rem",fontWeight:900}}>د.ع {formatNumber(dailyLectures.reduce((a:number,l:any)=>a+l.price,0))}</span>
                  </div>
                )}
              </>
            )}

            {reportView==="details"&&(
              <>
                <div style={{marginBottom:".8rem"}}>
                  <select className="month-pick" value={reportTeacher} onChange={e=>setReportTeacher(e.target.value)}>
                    <option value="">كل الأساتذة</option>
                    {teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="tbl-wrap">
                  {(() => {
                    const filtered = reportTeacher ? dailyLectures.filter((l:any)=>l.teacher_id===reportTeacher) : dailyLectures;
                    return filtered.length===0?<div className="empty">لا توجد سجلات</div>:(
                      <table>
                        <thead><tr><th>#</th><th>التاريخ</th><th>الصف</th><th>الشعبة</th><th>الدرس</th><th>النوع</th><th>السعر</th></tr></thead>
                        <tbody>
                          {filtered.map((l:any,i:number)=>(
                            <tr key={l.id}>
                              <td style={{color:"var(--text-tertiary)",fontSize:".7rem"}}>{i+1}</td>
                              <td>{l.lecture_date}</td>
                              <td style={{fontWeight:600}}>{l.grade}</td>
                              <td>({l.section})</td>
                              <td>الدرس {l.period}</td>
                              <td><span className="badge" style={{background:l.session_type==="morning"?"#DBEAFE":"#FEF3C7",color:l.session_type==="morning"?"#1E40AF":"#92400E"}}>{l.session_type==="morning"?"صباحي":"ظهري"}</span></td>
                              <td style={{fontWeight:700,color:"var(--primary)"}}>د.ع {formatNumber(l.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </>
            )}
          </>}

          {/* ===== CALENDAR ===== */}
          {activeSection==="calendar"&&(
            <div className="cal-wrap" style={{maxWidth:520}}>
              <div className="cal-header">
                <button className="cal-nav" onClick={()=>{let m=calMonth-1,y=calYear;if(m<0){m=11;y--;}setCalMonth(m);setCalYear(y);}}>{"<"}</button>
                <div className="cal-title">{MONTHS_AR[calMonth]} {calYear}</div>
                <button className="cal-nav" onClick={()=>{let m=calMonth+1,y=calYear;if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);}}>{">"}</button>
              </div>
              <div className="cal-days-header">
                {["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map(d=>(
                  <div key={d} className="cal-day-name">{d}</div>
                ))}
              </div>
              <div className="cal-grid">
                {Array.from({length:firstDayOfMonth(calYear,calMonth)}).map((_,i)=>(
                  <div key={`e-${i}`} className="cal-cell empty"/>
                ))}
                {Array.from({length:daysInMonth(calYear,calMonth)}).map((_,i)=>{
                  const day=i+1;
                  const dateStr=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const hasLecture=calLectureDates.includes(dateStr);
                  const isToday=day===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
                  return <div key={day} className={`cal-cell${hasLecture?" has-lecture":" normal"}${isToday?" today":""}`}>{day}</div>;
                })}
              </div>
              <div className="cal-legend">
                <span><span className="cal-dot" style={{background:"var(--success)",display:"inline-block"}}></span> دوام</span>
                <span><span className="cal-dot" style={{background:"#E5E7EB",display:"inline-block"}}></span> لا يوجد سجل</span>
              </div>
            </div>
          )}

          {/* ===== ARCHIVE ===== */}
          {activeSection==="archive"&&<>
            <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:13,padding:"1rem 1.2rem",marginBottom:"1rem"}}>
              <div style={{fontSize:".88rem",fontWeight:800,color:"#92400E",marginBottom:".4rem",display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="⚠️" size={14} /> إجراء نهاية الشهر</div>
              <div style={{fontSize:".8rem",color:"#92400E",marginBottom:".8rem"}}>عند الضغط على "أرشفة الشهر الحالي"، سيتم حفظ نسخة من جميع البيانات الحالية وتفريغ العدادات لبدء شهر جديد.</div>
              <button onClick={archiveMonth} style={{padding:".7rem 1.5rem",background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"white",border:"none",borderRadius:10,fontFamily:"Cairo,sans-serif",fontSize:".88rem",fontWeight:800,cursor:"pointer"}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:".35rem"}}><AppIcon token="🗄️" size={14} /> أرشفة الشهر الحالي وتصفير العدادات</span>
              </button>
            </div>
            <div style={{fontSize:".88rem",fontWeight:800,marginBottom:".7rem",color:"var(--text-primary)"}}>الأرشيفات السابقة</div>
            {archives.length===0?<div className="empty">لا يوجد أرشيف محفوظ</div>:archives.map(a=>(
              <div className="arch-card" key={a.id}>
                <div>
                  <div className="arch-month" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📅" size={14} /> {a.month}</div>
                  <div className="arch-info">{a.total_teachers} أستاذ • تاريخ الأرشفة: {formatDate(a.archive_date)}</div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div className="arch-amount">د.ع {formatNumber(a.total_amount)}</div>
                </div>
              </div>
            ))}
          </>}

          {/* ===== SETTINGS ===== */}
          {activeSection==="settings"&&<>
            <div className="settings-card">
              <div className="settings-title">أيام العطل الأسبوعية</div>
              <div style={{fontSize:".8rem",color:"var(--text-tertiary)",marginBottom:".8rem"}}>حدد الصف ثم اختر أيام العطل الخاصة به.</div>
              <select className="form-input" style={{marginBottom:"1rem"}}>
                <option value="">اختر الصف...</option>
                {gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="settings-card">
              <div className="settings-title">نسخ احتياطي</div>
              <button className="btn-success" style={{marginBottom:".5rem"}} onClick={()=>setShowExport(true)}><AppIcon token="⬆️" size={13} /> احتياطية</button>
              <button className="btn-warning" onClick={()=>setShowExport(true)}><AppIcon token="⬇️" size={13} /> من السحابة</button>
            </div>
            <div className="settings-card">
              <div className="settings-title">نقل البيانات يدوياً (ملف)</div>
              <div style={{display:"flex",gap:".7rem"}}>
                <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" style={{flex:1}} onClick={()=>setShowExport(true)}><AppIcon token="📤" size={14} />تصدير ملف</button>
                <button className="ui-button ui-button--success h-9 px-4 text-sm inline-flex items-center gap-1.5" style={{flex:1}}><AppIcon token="📥" size={14} />استيراد ملف</button>
              </div>
            </div>
          </>}
            </>
          )}

        </div>
      </div>
    </div>

    {/* DROPDOWN */}
    {activeMenu&&selectedTeacher&&(
      <div className="dropdown-menu" style={{top:menuPos.top,left:menuPos.left}} onClick={e=>e.stopPropagation()}>
        <div className="d-item" onClick={()=>{setDetailTeacher(selectedTeacher);setShowDetail(true);setActiveMenu(null)}}><AppIcon token="📋" size={14} />التفاصيل</div>
        <div className="d-item" onClick={()=>{setSalaryForm({gross_salary:selectedTeacher.base_salary.toString(),deductions:"0",notes:"",month:currentMonth});setShowPaySalary(true);setActiveMenu(null);}}><AppIcon token="💰" size={14} />دفع الراتب</div>
        <div className="d-item" onClick={()=>{openTeacherEdit(selectedTeacher);setActiveMenu(null);}}><AppIcon token="✏️" size={14} />تعديل البيانات</div>
      </div>
    )}

    {showTeacherModal&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowTeacherModal(false)}}>
        <div className="modal-box" style={{maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}>
          <div className="mh">
            <div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
              <AppIcon token={teacherEditId?"✏️":"👨‍🏫"} size={16} /> {teacherEditId?"تعديل بيانات الأستاذ":"إضافة أستاذ"}
            </div>
            <button type="button" className="mc" onClick={()=>setShowTeacherModal(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          {!canManageTeacher&&<div style={{padding:".5rem 0",fontSize:".8rem",color:"#B45309"}}>ليس لديك صلاحية تعديل بيانات الأساتذة.</div>}
          {teacherModalError&&<div style={{padding:".5rem 0",fontSize:".8rem",color:"#B91C1C"}}>{teacherModalError}</div>}
          <form onSubmit={saveTeacherModal}>
            <div className="fg">
              <div className="ff full"><label className="fl">الاسم الثلاثي *</label><input className="form-input" required value={teacherForm.full_name} onChange={e=>setTeacherForm({...teacherForm,full_name:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff"><label className="fl">المسمى الوظيفي</label><select className="form-input" value={teacherForm.job_title} onChange={e=>setTeacherForm({...teacherForm,job_title:e.target.value})} disabled={!canManageTeacher}><option value="">اختر...</option>{jobTitlesList.map((j:any)=><option key={j.id} value={j.name}>{j.name}</option>)}</select></div>
              <div className="ff"><label className="fl">المادة</label><select className="form-input" value={teacherForm.subject} onChange={e=>setTeacherForm({...teacherForm,subject:e.target.value})} disabled={!canManageTeacher}><option value="">اختر...</option>{subjectsList.map((s:any)=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
              <div className="ff"><label className="fl">الهاتف</label><input className="form-input" value={teacherForm.phone} onChange={e=>setTeacherForm({...teacherForm,phone:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff full"><label className="fl">العنوان</label><input className="form-input" value={teacherForm.address} onChange={e=>setTeacherForm({...teacherForm,address:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff"><label className="fl">نظام الراتب</label><select className="form-input" value={teacherForm.salary_type} onChange={e=>setTeacherForm({...teacherForm,salary_type:e.target.value})} disabled={!canManageTeacher}>{SALARY_TYPES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              <div className="ff"><label className="fl">الراتب الأساسي</label><input className="form-input" type="number" value={teacherForm.base_salary} onChange={e=>setTeacherForm({...teacherForm,base_salary:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff"><label className="fl">سعر المحاضرة</label><input className="form-input" type="number" value={teacherForm.lecture_price} onChange={e=>setTeacherForm({...teacherForm,lecture_price:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff"><label className="fl">حصص أسبوعية</label><input className="form-input" type="number" value={teacherForm.weekly_hours} onChange={e=>setTeacherForm({...teacherForm,weekly_hours:e.target.value})} disabled={!canManageTeacher}/></div>
              <div className="ff"><label className="fl">الحالة</label><select className="form-input" value={teacherForm.status} onChange={e=>setTeacherForm({...teacherForm,status:e.target.value})} disabled={!canManageTeacher}><option value="active">نشط</option><option value="inactive">غير نشط</option></select></div>
              <div className="ff full">
                <label className="fl">الصفوف والشعب</label>
                {teacherForm.classes_taught.map((cls, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.35rem", alignItems: "flex-end" }}>
                    <select className="form-input" value={cls.grade} onChange={e=>updateTeacherClassRow(i,"grade",e.target.value)} disabled={!canManageTeacher}>
                      <option value="">الصف...</option>
                      {CLASS_GRADES.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                    <select className="form-input" value={cls.section} onChange={e=>updateTeacherClassRow(i,"section",e.target.value)} disabled={!canManageTeacher}>
                      <option value="">الشعبة...</option>
                      {SECTIONS_LIST.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                    {teacherForm.classes_taught.length > 1 && (
                      <button type="button" className="ui-button ui-button--secondary" onClick={()=>removeTeacherClassRow(i)} disabled={!canManageTeacher}><AppIcon token="✕" size={12} /></button>
                    )}
                  </div>
                ))}
                <button type="button" className="ui-button ui-button--secondary" style={{ marginTop: "0.35rem" }} onClick={addTeacherClassRow} disabled={!canManageTeacher}>+ صف</button>
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="ui-button ui-button--primary" disabled={teacherModalSaving||!canManageTeacher}>{teacherModalSaving?"جارٍ الحفظ...":"حفظ"}</button>
              <button type="button" className="ui-button ui-button--secondary" onClick={()=>setShowTeacherModal(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ===== MODAL: دفع راتب ===== */}
    {showPaySalary&&selectedTeacher&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowPaySalary(false)}}>
        <div className="modal-box" style={{maxWidth:440}}>
          <div className="mh">
            <div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="💰" size={16} /> دفع راتب — {selectedTeacher.full_name}</div>
            <button className="mc" onClick={()=>setShowPaySalary(false)}><AppIcon token="✕" size={14} /></button>
          </div>
          <form onSubmit={handlePaySalary}>
            <div className="fg">
              <div className="ff"><label className="fl">الشهر *</label><input className="form-input" type="month" required value={salaryForm.month} onChange={e=>setSalaryForm({...salaryForm,month:e.target.value})}/></div>
              <div className="ff"><label className="fl">الراتب الإجمالي *</label><input className="form-input" type="number" required value={salaryForm.gross_salary} onChange={e=>setSalaryForm({...salaryForm,gross_salary:e.target.value})} readOnly={selectedTeacher?.salary_type!=="fixed"} /></div>
              <div style={{fontSize:".74rem",color:"var(--text-tertiary)",marginTop:"-0.5rem",marginBottom:"0.5rem"}}>
                {selectedTeacher?.salary_type === "hourly" && `محسوب آلياً: ${lectureSalaryCalc.count} × ${formatNumber(Number(selectedTeacher.lecture_price)||0)} = ${formatNumber(lectureSalaryCalc.total)} د.ع`}
                {selectedTeacher?.salary_type === "mixed" && `أساسي ${formatNumber(Number(selectedTeacher.base_salary)||0)} + محاضرات ${formatNumber(lectureSalaryCalc.total)} = ${formatNumber((Number(selectedTeacher.base_salary)||0)+lectureSalaryCalc.total)} د.ع`}
              </div>
              <div className="ff"><label className="fl">الخصومات</label><input className="form-input" type="number" value={salaryForm.deductions} onChange={e=>setSalaryForm({...salaryForm,deductions:e.target.value})}/></div>
              <div className="ff"><label className="fl">ملاحظات</label><input className="form-input" value={salaryForm.notes} onChange={e=>setSalaryForm({...salaryForm,notes:e.target.value})}/></div>
            </div>
            <div className="sal-preview">
              <div className="sp-row"><span className="sp-label">الإجمالي:</span><span className="sp-val">د.ع {formatNumber(parseInt(salaryForm.gross_salary)||0)}</span></div>
              <div className="sp-row"><span className="sp-label">الخصومات:</span><span className="sp-val" style={{color:"var(--danger)"}}>- د.ع {formatNumber(parseInt(salaryForm.deductions)||0)}</span></div>
              <div style={{borderTop:"1px dashed var(--border)",marginTop:".4rem",paddingTop:".4rem"}}>
                <div className="sp-row"><span className="sp-label">الصافي:</span><span className="sp-net">د.ع {formatNumber((parseInt(salaryForm.gross_salary)||0)-(parseInt(salaryForm.deductions)||0))}</span></div>
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="ui-button ui-button--primary" disabled={savingSalary}>{savingSalary?"جارٍ الدفع...":"تأكيد دفع الراتب"}</button>
              <button type="button" className="ui-button ui-button--secondary" onClick={()=>setShowPaySalary(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ===== MODAL: أسعار المحاضرات ===== */}
    {showPrices&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowPrices(false)}}>
        <div className="modal-box modal-sm">
          <div className="mh"><div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="🏷️" size={16} /> أسعار المحاضرات</div><button className="mc" onClick={()=>setShowPrices(false)}><AppIcon token="✕" size={14} /></button></div>
          <p style={{fontSize:".8rem",color:"var(--text-tertiary)",marginBottom:"1rem"}}>حدد سعر المحاضرة الواحدة لكل صف ليتم احتساب الرواتب تلقائياً.</p>
          {gradeOptions.map(grade=>(
            <div key={grade} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".6rem .4rem",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontWeight:700,fontSize:".88rem"}}>{grade}</span>
              <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
                <input type="number" value={priceEdits[grade]||0} onChange={e=>setPriceEdits({...priceEdits,[grade]:parseInt(e.target.value)||0})} style={{width:100,padding:".4rem .6rem",background:"var(--primary-subtle)",border:"1.5px solid var(--border)",borderRadius:8,fontFamily:"Cairo,sans-serif",fontSize:".82rem",textAlign:"center",outline:"none"}}/>
                <span style={{fontSize:".75rem",color:"var(--text-tertiary)"}}>د.ع</span>
              </div>
            </div>
          ))}
          <div className="fa"><button className="ui-button ui-button--primary" onClick={savePrices}>حفظ الأسعار</button><button className="ui-button ui-button--secondary" onClick={()=>setShowPrices(false)}>إلغاء</button></div>
        </div>
      </div>
    )}

    {/* ===== MODAL: توقيتات الدروس ===== */}
    {showLessonTimes&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowLessonTimes(false)}}>
        <div className="modal-box modal-sm">
          <div className="mh"><div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="⏰" size={16} /> توقيتات الدروس</div><button className="mc" onClick={()=>setShowLessonTimes(false)}><AppIcon token="✕" size={14} /></button></div>
          {["morning","afternoon"].map(sessionType=>(
            <div key={sessionType}>
              <div className="session-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                <AppIcon token={sessionType==="morning"?"🌅":"🌞"} size={14} />
                {sessionType==="morning"?"الدوام الصباحي":"الدوام الظهري"}
              </div>
              {lessonTimes.filter(t=>t.session_type===sessionType).map(t=>(
                <div key={t.id} className="times-row">
                  <span className="times-lbl">الدرس {t.period}</span>
                  <input type="time" className="time-input" value={timeEdits[`${t.period}-${t.session_type}-start`]||""} onChange={e=>setTimeEdits({...timeEdits,[`${t.period}-${t.session_type}-start`]:e.target.value})}/>
                  <span style={{color:"var(--text-tertiary)"}}>-</span>
                  <input type="time" className="time-input" value={timeEdits[`${t.period}-${t.session_type}-end`]||""} onChange={e=>setTimeEdits({...timeEdits,[`${t.period}-${t.session_type}-end`]:e.target.value})}/>
                </div>
              ))}
            </div>
          ))}
          <div className="fa"><button className="ui-button ui-button--primary" onClick={saveLessonTimes}>حفظ توقيتات الدروس</button><button className="ui-button ui-button--secondary" onClick={()=>setShowLessonTimes(false)}>إلغاء</button></div>
        </div>
      </div>
    )}

    {/* ===== MODAL: السجل اليومي ===== */}
    {showDailyLog&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowDailyLog(false)}}>
        <div className="modal-box">
          <div className="mh"><div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📋" size={16} /> السجل اليومي</div><button className="mc" onClick={()=>setShowDailyLog(false)}><AppIcon token="✕" size={14} /></button></div>
          <div className="fg">
            <div className="ff"><label className="fl">الأستاذ</label><select className="form-input" value={dailyTeacher} onChange={e=>setDailyTeacher(e.target.value)}><option value="">اختر الأستاذ...</option>{teachers.filter(t=>t.status==="active").map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
            <div className="ff"><label className="fl">التاريخ</label><input type="date" className="form-input" value={dailyDate} onChange={e=>setDailyDate(e.target.value)}/></div>
            <div className="ff full">
              <label className="fl">الصفوف (يمكن اختيار أكثر من صف)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:".4rem",background:"var(--primary-subtle)",padding:".6rem",borderRadius:9,border:"1.5px solid var(--border)"}}>
                {gradeOptions.map(g=>sectionOptions(g).map(sec=>(
                  <span key={`${g}||${sec}`} onClick={()=>setDailyGrades(prev=>toggleArr(prev,`${g}||${sec}`))} style={{padding:".25rem .65rem",borderRadius:20,fontSize:".75rem",fontWeight:700,cursor:"pointer",background:dailyGrades.includes(`${g}||${sec}`)?"var(--primary)":"white",color:dailyGrades.includes(`${g}||${sec}`)?"white":"var(--text-primary)",border:"1px solid var(--border)"}}>
                    {g} ({sec})
                  </span>
                )))}
              </div>
            </div>
            <div className="ff full">
              <label className="fl">الحصص</label>
              <div>
                <div style={{fontSize:".75rem",fontWeight:700,color:"var(--success)",marginBottom:".3rem"}}>الصباحي</div>
                <div className="periods-grid" style={{marginBottom:".5rem"}}>
                  {PERIODS.map(p=>(
                    <div key={`${p}-morning`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem",cursor:"pointer"}} onClick={()=>setDailyPeriods(prev=>toggleArr(prev,`${p}-morning`))}>
                      <div className={`period-box${dailyPeriods.includes(`${p}-morning`)?" sel":""}`}>{p}</div>
                      <span style={{fontSize:".65rem",color:"var(--text-tertiary)"}}>درس {p}</span>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:".75rem",fontWeight:700,color:"#F59E0B",marginBottom:".3rem"}}>الظهري</div>
                <div className="periods-grid">
                  {PERIODS.map(p=>(
                    <div key={`${p}-afternoon`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem",cursor:"pointer"}} onClick={()=>setDailyPeriods(prev=>toggleArr(prev,`${p}-afternoon`))}>
                      <div className={`period-box${dailyPeriods.includes(`${p}-afternoon`)?" sel":""}`}>{p}<span style={{fontSize:".6rem"}}>(ظ)</span></div>
                      <span style={{fontSize:".65rem",color:"var(--text-tertiary)"}}>درس {p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {dailyTeacher&&dailyGrades.length>0&&dailyPeriods.length>0&&(
            <div style={{background:"var(--primary-subtle)",borderRadius:10,padding:".7rem",marginTop:".5rem",fontSize:".8rem",fontWeight:600,color:"var(--primary)"}}>
              سيتم تسجيل: {dailyGrades.length} صف × {dailyPeriods.length} حصة = <strong>{dailyGrades.length*dailyPeriods.length} محاضرة</strong>
            </div>
          )}
          <div className="fa">
            <button className="ui-button ui-button--primary" disabled={savingDaily||!dailyTeacher||dailyGrades.length===0||dailyPeriods.length===0} onClick={saveDailyLog}>{savingDaily?"جارٍ الحفظ...":"تسجيل المحاضرات"}</button>
            <button className="ui-button ui-button--secondary" onClick={()=>setShowDailyLog(false)}>إلغاء</button>
          </div>
        </div>
      </div>
    )}

    {/* ===== MODAL: تصدير ===== */}
    {showExport&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowExport(false)}}>
        <div className="modal-box modal-sm">
          <div className="mh"><div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="📤" size={16} /> خيارات التصدير</div><button className="mc" onClick={()=>setShowExport(false)}><AppIcon token="✕" size={14} /></button></div>
          <button style={{width:"100%",padding:".7rem",background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"white",border:"none",borderRadius:10,fontFamily:"Cairo,sans-serif",fontSize:".85rem",fontWeight:800,cursor:"pointer",marginBottom:".8rem",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:".35rem"}} onClick={()=>setExportOptions({lesson_times:true,classes:true,prices:true,teachers:true,subjects:true,fixed_salaries:true,lectures:true})}><AppIcon token="💾" size={14} /> تصدير كامل النظام</button>
          {([
            ["teachers","👨‍🏫","بيانات الأساتذة"],
            ["subjects","📚","المواد الدراسية"],
            ["classes","🏫","الصفوف والشعب"],
            ["prices","🏷️","أسعار المحاضرات"],
            ["fixed_salaries","💰","الرواتب الثابتة"],
            ["lectures","📋","سجل المحاضرات"],
            ["lesson_times","⏰","توقيتات الدروس"],
          ] as [keyof typeof exportOptions,string,string][]).map(([key,icon,label])=>(
            <div key={key} className={`exp-item${exportOptions[key]?" selected":""}`} onClick={()=>setExportOptions(prev=>({...prev,[key]:!prev[key]}))}>
              <span className="exp-name" style={{display:"inline-flex",alignItems:"center",gap:".35rem"}}><AppIcon token={icon} size={13} /> {label}</span>
              <div className={`exp-cb${exportOptions[key]?" checked":""}`}>{exportOptions[key]&&"✓"}</div>
            </div>
          ))}
          <div className="fa"><button className="ui-button ui-button--primary" onClick={doExport}><AppIcon token="⬇️" size={14} /> تصدير الآن</button><button className="ui-button ui-button--secondary" onClick={()=>setShowExport(false)}>إلغاء</button></div>
        </div>
      </div>
    )}

    {/* ===== MODAL: طباعة ===== */}
    {showPrint&&(
      <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowPrint(false)}}>
        <div className="modal-box modal-sm">
          <div className="mh"><div className="mt" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="🖨️" size={16} /> خيارات الطباعة</div><button className="mc" onClick={()=>setShowPrint(false)}><AppIcon token="✕" size={14} /></button></div>
          <div className="print-card">
            <div className="print-card-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="👤" size={14} /> تقرير أستاذ مفصل</div>
            <div className="print-card-desc">اختر الأستاذ لطباعة تقرير كامل بجميع محاضراته.</div>
            <select className="form-input" value={printTeacher} onChange={e=>setPrintTeacher(e.target.value)} style={{marginBottom:".7rem"}}><option value="">اختر الأستاذ...</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
            <button style={{padding:".6rem 1rem",background:"linear-gradient(135deg,#06B6D4,#0891B2)",color:"white",border:"none",borderRadius:9,fontFamily:"Cairo,sans-serif",fontSize:".82rem",fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:".35rem"}} onClick={()=>{if(printTeacher){setReportTeacher(printTeacher);fetchDetailedReportAll();setTimeout(printReport,500);}}}><AppIcon token="🖨️" size={13} className="text-white" /> طباعة</button>
          </div>
          <div className="print-card">
            <div className="print-card-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="👥" size={14} /> تقرير شامل</div>
            <div className="print-card-desc">تقرير لجميع الأساتذة.</div>
            <button style={{width:"100%",padding:".7rem",background:"#1F2937",color:"white",border:"none",borderRadius:9,fontFamily:"Cairo,sans-serif",fontSize:".85rem",fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:".35rem"}} onClick={printAllTeachers}><AppIcon token="☰" size={13} className="text-white" /> طباعة التقرير الشامل</button>
          </div>
          <div className="fa"><button className="ui-button ui-button--secondary" onClick={()=>setShowPrint(false)}>إغلاق</button></div>
        </div>
      </div>
    )}

    {/* ===== MODALS: مواد، مسميات، صفوف ===== */}
    {showSubjectsMgr&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowSubjectsMgr(false)}}><div className="modal-box modal-sm"><div className="mh"><div className="mt">المواد الدراسية</div><button className="mc" onClick={()=>setShowSubjectsMgr(false)}><AppIcon token="✕" size={12} /></button></div><div style={{display:"flex",gap:".6rem",marginBottom:"1rem"}}><input className="form-input" placeholder="اسم المادة" value={newSubject} onChange={e=>setNewSubject(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSubject()} style={{flex:1}}/><button className="ui-button ui-button--primary" style={{padding:".6rem 1rem",flex:"none",width:"auto"}} onClick={addSubject}>+ إضافة</button></div><div style={{background:"var(--primary-subtle)",borderRadius:12,padding:"1rem",maxHeight:320,overflowY:"auto"}}>{subjectsList.map(s=>(<div key={s.id} className="mgr-item"><span style={{fontSize:".85rem",fontWeight:600}}>{s.name}</span><button onClick={()=>deleteSubject(s.id)} className="btn-del-item"><AppIcon token="🗑️" size={12} /></button></div>))}</div><div className="fa"><button className="ui-button ui-button--secondary" onClick={()=>setShowSubjectsMgr(false)}>إغلاق</button></div></div></div>)}
    {showJobTitlesMgr&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowJobTitlesMgr(false)}}><div className="modal-box modal-sm"><div className="mh"><div className="mt">المسميات الوظيفية</div><button className="mc" onClick={()=>setShowJobTitlesMgr(false)}><AppIcon token="✕" size={12} /></button></div><div style={{display:"flex",gap:".6rem",marginBottom:"1rem"}}><input className="form-input" placeholder="اسم المسمى" value={newJobTitle} onChange={e=>setNewJobTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addJobTitle()} style={{flex:1}}/><button className="ui-button ui-button--primary" style={{padding:".6rem 1rem",flex:"none",width:"auto"}} onClick={addJobTitle}>+ إضافة</button></div><div style={{background:"var(--primary-subtle)",borderRadius:12,padding:"1rem",maxHeight:320,overflowY:"auto"}}>{jobTitlesList.map(j=>(<div key={j.id} className="mgr-item"><span style={{fontSize:".85rem",fontWeight:600}}>{j.name}</span><button onClick={()=>deleteJobTitle(j.id)} className="btn-del-item"><AppIcon token="🗑️" size={12} /></button></div>))}</div><div className="fa"><button className="ui-button ui-button--secondary" onClick={()=>setShowJobTitlesMgr(false)}>إغلاق</button></div></div></div>)}
    {showClassesMgr&&(<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowClassesMgr(false)}}><div className="modal-box modal-lg"><div className="mh"><div className="mt">إدارة الصفوف والشعب</div><button className="mc" onClick={()=>setShowClassesMgr(false)}><AppIcon token="✕" size={12} /></button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}><div style={{background:"var(--primary-subtle)",borderRadius:12,padding:"1rem"}}><div style={{fontSize:".82rem",fontWeight:800,color:"var(--primary)",marginBottom:".7rem"}}>إضافة صف جديد</div><input className="form-input" placeholder="اسم الصف" value={newGrade} onChange={e=>setNewGrade(e.target.value)} style={{marginBottom:".5rem"}}/><button className="ui-button ui-button--primary" style={{padding:".6rem",width:"100%"}} onClick={addClass}>إضافة صف</button></div><div style={{background:"#F0FDF4",borderRadius:12,padding:"1rem",border:"1px solid #D1FAE5"}}><div style={{fontSize:".82rem",fontWeight:800,color:"#065F46",marginBottom:".7rem"}}>إضافة شعبة</div><select className="form-input" value={newSectionGrade} onChange={e=>setNewSectionGrade(e.target.value)} style={{marginBottom:".5rem"}}><option value="">اختر الصف...</option>{gradeOptions.map(g=><option key={g} value={g}>{g}</option>)}</select><input className="form-input" placeholder="اسم الشعبة" value={newSection} onChange={e=>setNewSection(e.target.value)} style={{marginBottom:".5rem"}}/><button onClick={addSection} style={{width:"100%",padding:".6rem",background:"linear-gradient(135deg,#10B981,#059669)",color:"white",border:"none",borderRadius:9,fontFamily:"Cairo,sans-serif",fontWeight:700,cursor:"pointer"}}>إضافة شعبة</button></div></div><div style={{background:"var(--primary-subtle)",borderRadius:12,padding:"1rem",maxHeight:300,overflowY:"auto"}}>{gradeOptions.map(grade=>(<div key={grade} style={{marginBottom:".6rem",borderBottom:"1px solid var(--border)",paddingBottom:".6rem"}}><div style={{fontWeight:800,fontSize:".85rem",marginBottom:".4rem"}}>{grade}</div><div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>{classes.filter(c=>c.grade===grade).map(c=>(<span key={c.id} style={{display:"inline-flex",alignItems:"center",gap:".3rem",background:"var(--primary-subtle)",color:"var(--primary)",padding:".2rem .6rem",borderRadius:20,fontSize:".75rem",fontWeight:700}}>{c.section}<button onClick={()=>deleteClass(c.id)} style={{background:"#EF4444",color:"white",border:"none",borderRadius:"50%",width:14,height:14,cursor:"pointer",fontSize:".6rem",display:"inline-flex",alignItems:"center",justifyContent:"center"}}><AppIcon token="✕" size={12} /></button></span>))}</div></div>))}</div><div className="fa"><button className="ui-button ui-button--secondary" onClick={()=>setShowClassesMgr(false)}>إغلاق</button></div></div></div>)}

    {/* DETAIL PANEL */}
    {showDetail&&detailTeacher&&(
      <div className="det-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowDetail(false)}}>
        <div className="det-panel">
          <div className="det-hdr"><div className="det-ttl">تفاصيل — {detailTeacher.full_name}</div><button className="det-cls" onClick={()=>setShowDetail(false)}><AppIcon token="✕" size={12} /></button></div>
          <div className="dp-cards">
            <div className="dp-card"><div className="dp-ct">المعلومات</div><div className="dp-row"><span className="dp-lbl">الاسم:</span><span className="dp-val">{detailTeacher.full_name}</span></div><div className="dp-row"><span className="dp-lbl">المسمى:</span><span className="dp-val">{detailTeacher.job_title||"—"}</span></div><div className="dp-row"><span className="dp-lbl">المادة:</span><span className="dp-val">{detailTeacher.subject||"—"}</span></div><div className="dp-row"><span className="dp-lbl">الهاتف:</span><span className="dp-val">{detailTeacher.phone||"—"}</span></div></div>
            <div className="dp-card"><div className="dp-ct">الرواتب</div><div className="dp-row"><span className="dp-lbl">نظام الراتب:</span><span className="dp-val">{SALARY_TYPES.find(s=>s.value===detailTeacher.salary_type)?.label||"—"}</span></div><div className="dp-row"><span className="dp-lbl">الأساسي:</span><span className="dp-val">د.ع {formatNumber(detailTeacher.base_salary)}</span></div><div className="dp-row"><span className="dp-lbl">سعر المحاضرة:</span><span className="dp-val">د.ع {formatNumber(detailTeacher.lecture_price||0)}</span></div><div className="dp-row"><span className="dp-lbl">عدد الرواتب:</span><span className="dp-val">{teacherSalaries(detailTeacher.id).length}</span></div><div className="dp-row"><span className="dp-lbl">إجمالي المستلم:</span><span className="dp-val" style={{color:"var(--success)"}}>د.ع {formatNumber(teacherSalaries(detailTeacher.id).reduce((a,s)=>(a+(s.gross_salary||0)-(s.deductions||0)),0))}</span></div></div>
          </div>
          {detailTeacher.classes_taught?.length>0&&(<div style={{background:"var(--primary-subtle)",borderRadius:12,padding:"1rem",marginBottom:"1rem"}}><div style={{fontSize:".8rem",fontWeight:700,color:"var(--primary)",marginBottom:".6rem"}}>الصفوف والشعب</div><div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>{detailTeacher.classes_taught.map((c:any,i:number)=>(<span key={i} className="badge" style={{background:"var(--primary-subtle)",color:"var(--primary)",fontSize:".75rem"}}>{c.grade} ({c.section})</span>))}</div></div>)}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".8rem"}}><span style={{fontSize:".88rem",fontWeight:800}}>سجل الرواتب ({teacherSalaries(detailTeacher.id).length})</span><button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" style={{padding:".4rem .8rem",fontSize:".75rem"}} onClick={()=>{setSelectedTeacher(detailTeacher);setSalaryForm({gross_salary:detailTeacher.base_salary.toString(),deductions:"0",notes:"",month:currentMonth});setShowPaySalary(true);}}>+ دفع راتب</button></div>
          {teacherSalaries(detailTeacher.id).length===0?<div style={{textAlign:"center",padding:"2rem",color:"var(--text-tertiary)",fontSize:".85rem"}}>لا توجد رواتب بعد</div>:teacherSalaries(detailTeacher.id).map((s,i)=>{const net=(s.gross_salary||0)-(s.deductions||0);return <div className="sal-row" key={s.id}><div className="sal-num">{i+1}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:".5rem"}}><span style={{fontWeight:800,color:"var(--success)",fontSize:".85rem"}}>د.ع {formatNumber(net)}</span><span className="badge" style={{background:"var(--primary-subtle)",color:"var(--primary)",fontSize:".65rem"}}>{s.month}</span></div><div style={{fontSize:".7rem",color:"var(--text-tertiary)"}}>{s.paid_at?formatDate(s.paid_at):"—"}</div></div><button className="btn-print-sm" onClick={()=>printSalarySlip(s)}><AppIcon token="🖨️" size={12} /></button></div>;})}
        </div>
      </div>
    )}
  </ProtectedRoute>
  );
}
