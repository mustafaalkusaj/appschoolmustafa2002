"use client";
import type { Student, StudentWithFees, StudentStatus } from "@/types/student";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePagedSupabaseList, type PagedFetchResult } from "@/hooks/usePagedSupabaseList";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import type { ManagedUserAccountCard } from "@/lib/managed-users";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { resolveSchoolBranchForProfile, resolveSchoolIdForProfile } from "@/lib/school/context";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
import { fetchJsonWithAuthorizedSession, fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { StudentListRow, StudentsMetaPayload } from "@/lib/students/overview";

const TABS = [
  { id:"active",      label:"جميع الطلاب",      icon:"👥" },
  { id:"transferred", label:"الطلاب المنقولون",  icon:"📦" },
  { id:"suspended",   label:"الطلاب الموقوفون",  icon:"⏸️" },
  { id:"deleted",     label:"المحذوفون",          icon:"🗑️" },
];

function formatCardDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildPrintableCardHtml(
  card: ManagedUserAccountCard,
  options: {
    locale: "ar" | "en";
    primaryColor?: string | null;
    secondaryColor?: string | null;
  },
  autoPrint = true,
) {
  const locale = options.locale;
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const instructions = card.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`).join("");

  return wrapPrintDocument({
    title: locale === "en" ? "Student app account card" : "بطاقة حساب التطبيق",
    subtitle: locale === "en" ? "Managed access details" : "بيانات الدخول للطباعة الفورية",
    branding: {
      schoolName: card.school_name,
      logoUrl: card.school_logo_url,
      primaryColor: options.primaryColor,
      secondaryColor: options.secondaryColor,
      locale,
    },
    autoPrint,
    bodyHtml: `
      <div class="print-grid" style="margin-bottom:16px">
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Student name" : "اسم الطالب"}</span>
          <div class="print-value">${escapeHtml(card.full_name)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Class and section" : "الصف والشعبة"}</span>
          <div class="print-value">${escapeHtml(classLine || "—")}</div>
        </div>
      </div>
      <div class="print-grid" style="margin-bottom:16px">
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Login identifier" : "معرّف الدخول"}</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.login_identifier)}</div>
        </div>
        <div class="print-panel">
          <span class="print-label">${locale === "en" ? "Temporary password" : "كلمة المرور المؤقتة"}</span>
          <div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(card.temporary_password)}</div>
        </div>
      </div>
      <div class="print-panel">
        <span class="print-label">${locale === "en" ? "Login instructions" : "تعليمات الدخول"}</span>
        <ol class="print-list">${instructions}</ol>
      </div>
    `,
  });
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

function normalizeStudentSearchValue(value: string, maxLength = 80) {
  return value
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const STUDENT_IMPORT_ALLOWED_EXTENSIONS = [".xlsx"] as const;
const STUDENT_IMPORT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function validateStudentImportFile(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  if (!normalizedName) {
    return "اسم الملف غير صالح";
  }

  const hasAllowedExtension = STUDENT_IMPORT_ALLOWED_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
  if (!hasAllowedExtension) {
    return "صيغة الملف غير مدعومة. استخدم ملف xlsx فقط.";
  }

  if (file.size <= 0) {
    return "الملف فارغ";
  }

  if (file.size > STUDENT_IMPORT_MAX_FILE_SIZE_BYTES) {
    return "حجم الملف كبير جداً. الحد الأقصى 2 ميغابايت.";
  }

  return null;
}

type StudentCredentialTarget = Pick<StudentWithFees, "id" | "auth_user_id" | "full_name" | "class_name" | "section">;

type StudentDatasetRow = {
  id: string;
  full_name: string;
  class_name?: string | null;
  section?: string | null;
  phone?: string | null;
  address?: string | null;
  total_fee?: number | null;
  paid_fee?: number | null;
  remaining_fee?: number | null;
  discount_value?: number | null;
  status?: StudentStatus | null;
  auth_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const EMPTY_STUDENT_META: StudentsMetaPayload = {
  summary: {
    totalStudents: 0,
    activeStudents: 0,
    totalFee: 0,
    totalRemaining: 0,
  },
  tabCounts: {
    active: 0,
    transferred: 0,
    suspended: 0,
    deleted: 0,
  },
  sectionOptions: [],
};

function mapStudentRecordToStudentWithFees(
  item: StudentListRow | StudentDatasetRow,
  fallbackSchoolId: string,
): StudentWithFees {
  const totalFee = item.total_fee ?? 0;
  const paidFee = item.paid_fee ?? 0;
  const discountValue = item.discount_value ?? 0;
  const remainingFeeRaw = "remaining_fee" in item ? item.remaining_fee : null;
  const remainingFee =
    remainingFeeRaw === null || remainingFeeRaw === undefined
      ? totalFee - paidFee - discountValue
      : remainingFeeRaw;

  return {
    id: item.id,
    school_id: ("school_id" in item && typeof item.school_id === "string" && item.school_id) ? item.school_id : fallbackSchoolId,
    auth_user_id: item.auth_user_id ?? null,
    full_name: item.full_name,
    class_name: item.class_name ?? "",
    section: item.section ?? null,
    phone: item.phone ?? null,
    address: item.address ?? null,
    total_fee: totalFee,
    paid_fee: paidFee,
    discount_value: discountValue,
    status: (item.status ?? "active") as StudentStatus,
    remaining_fee: remainingFee,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? null,
  };
}

const STATUS_MAP: Record<StudentStatus, {label: string, color: string, bg: string}> = {
  active:      {label:"نشط",    color:"#065F46",bg:"#D1FAE5"},
  transferred: {label:"منقول",  color:"#92400E",bg:"#FEF3C7"},
  graduated:   {label:"متخرج",  color:"#1E40AF",bg:"#DBEAFE"},
  withdrawn:   {label:"منسحب",  color:"#991B1B",bg:"#FEE2E2"},
  archived:    {label:"مؤرشف",  color:"#374151",bg:"#F3F4F6"},
  suspended:   {label:"موقوف",  color:"#7C2D12",bg:"#FEF3C7"},
  deleted:     {label:"محذوف",  color:"#6B7280",bg:"#F3F4F6"},
};

export default function StudentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile, can, isReadOnlyPath } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const canAddStudents = can("add_students");
  const canEditStudents = can("edit_students");
  const canDeleteStudents = can("delete_students");
  const canManageStudents = canAddStudents || canEditStudents || canDeleteStudents;
  const canManageStudentAccounts = profile?.role === "super_admin" || profile?.role === "admin";
  const isReadOnlyView = isReadOnlyPath("/students") || !canManageStudents;
  // No local setPagedStudents needed - hook manages
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); 

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [showModal, setShowModal] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [printingCards, setPrintingCards] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [accountCard, setAccountCard] = useState<ManagedUserAccountCard | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState("");
  const [activeMenu, setActiveMenu] = useState<string|null>(null);
  const [menuPos, setMenuPos] = useState({top:0,left:0});
  const [selectedStudent, setSelectedStudent] = useState<StudentWithFees | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [classFees, setClassFees] = useState<any[]>([]);
  const [studentsMeta, setStudentsMeta] = useState<StudentsMetaPayload>(EMPTY_STUDENT_META);

  const [form, setForm] = useState({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});
  const [editForm, setEditForm] = useState({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});
  const listScopeRef = useRef<string | null>(null);
  const listScopeKey = [
    profile?.id || "guest",
    schoolScope.selectedSchoolId || "none",
    activeTab,
    debouncedSearch.trim(),
    filterClass.trim(),
    filterSection.trim(),
  ].join("::");
  const effectivePage =
    listScopeRef.current !== null && listScopeRef.current !== listScopeKey && page !== 1 ? 1 : page;

  useEffect(()=>{ 
    setSearch(""); 
    setFilterClass(""); 
    setFilterSection(""); 
    setPage(1);
    setDebouncedSearch("");
  },[activeTab]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Don't close when interacting with the dropdown or its toggle button.
      if (target.closest(".dropdown-menu")) return;
      if (target.closest(".btn-action")) return;
      if (target.closest(".student-name")) return;

      setActiveMenu(null);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchPagedStudents = useCallback(
    async (from: number): Promise<PagedFetchResult<StudentWithFees>> => {
    if (!profile) return { data: [], count: 0, error: null };
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) return { data: [], count: 0, error: null };
    const safeSearch = normalizeStudentSearchValue(debouncedSearch);

    const currentPage = Math.floor(from / pageSize) + 1;
    const params = new URLSearchParams({
      schoolId,
      page: String(currentPage),
      pageSize: String(pageSize),
      status: activeTab,
    });
    if (safeSearch) params.set("search", safeSearch);
    if (filterClass) params.set("className", filterClass);
    if (filterSection) params.set("sectionName", filterSection);

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      students?: StudentListRow[];
      totalCount?: number;
      error?: { message?: string };
    }>(`/api/web/students/list?${params.toString()}`);

    if (!response.ok) {
      return {
        data: [],
        count: 0,
        error: { message: payload?.error?.message || "تعذر تحميل قائمة الطلاب." } as any,
      };
    }

    const typedData = (payload?.students ?? []).map((student) =>
      mapStudentRecordToStudentWithFees(student, schoolId),
    );
    return { data: typedData, count: payload?.totalCount ?? 0, error: null };
    },
    [profile, schoolScope.selectedSchoolId, debouncedSearch, pageSize, activeTab, filterClass, filterSection],
  );

  const { rows, totalCount, error: pagedError, loading: pagedLoading, reload } = usePagedSupabaseList<StudentWithFees>({
    enabled: Boolean(profile && !schoolScope.scopeLoading),
    page: effectivePage,
    pageSize,
    fetchPage: fetchPagedStudents,
    cacheKey: [
      "students",
      profile?.id || "guest",
      schoolScope.selectedSchoolId || "none",
      activeTab,
      debouncedSearch,
      filterClass,
      filterSection,
    ].join("::"),
  });

  const pagedStudents: StudentWithFees[] = rows || [];

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));
  }, [totalCount, pageSize]);

  useEffect(() => {
    if (listScopeRef.current === listScopeKey) return;
    listScopeRef.current = listScopeKey;
    if (page !== 1) {
      setPage(1);
    }
  }, [listScopeKey, page]);

  const fetchClassFees = useCallback(async () => {
    if (!profile) return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId && compat.classFeesSchoolScope) {
      setClassFees([]);
      return;
    }
    let query = supabase.from("class_fees").select("*").order("class_name", { ascending: true });
    if (compat.classFeesSchoolScope && schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data } = await query;
    setClassFees(data || []);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    void fetchClassFees();
  }, [fetchClassFees]);

  const fetchStudentsMeta = useCallback(async () => {
    if (!profile) return;

    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setStudentsMeta(EMPTY_STUDENT_META);
      return;
    }

    const safeSearch = normalizeStudentSearchValue(debouncedSearch);
    const params = new URLSearchParams({
      schoolId,
      status: activeTab,
    });
    if (safeSearch) params.set("search", safeSearch);
    if (filterClass) params.set("className", filterClass);
    if (filterSection) params.set("sectionName", filterSection);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        summary?: StudentsMetaPayload["summary"];
        tabCounts?: StudentsMetaPayload["tabCounts"];
        sectionOptions?: string[];
        error?: { message?: string };
      }>(`/api/web/students/meta?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل ملخص الطلاب.");
      }

      setStudentsMeta({
        summary: payload?.summary ?? EMPTY_STUDENT_META.summary,
        tabCounts: payload?.tabCounts ?? EMPTY_STUDENT_META.tabCounts,
        sectionOptions: payload?.sectionOptions ?? [],
      });
    } catch (metaError) {
      console.error("fetchStudentsMeta error:", metaError);
      setStudentsMeta(EMPTY_STUDENT_META);
    }
  }, [profile, schoolScope.selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchStudentsMeta();
  }, [fetchStudentsMeta, profile, schoolScope.scopeLoading]);

  async function getSchoolBranch(){
    return resolveSchoolBranchForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }

  async function fetchStudentsForCredentialsPrinting() {
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      setError("يجب تحديد مدرسة قبل طباعة بطاقات الدخول.");
      return null;
    }

    const searchTerm = debouncedSearch.trim();
    const hasSearchFilter = Boolean(searchTerm);
    const hasClassFilter = Boolean(filterClass);
    const hasSectionFilter = Boolean(filterSection);
    const hasStatusFilter = activeTab !== "active";
    const hasFilters = hasSearchFilter || hasClassFilter || hasSectionFilter || hasStatusFilter;
    const params = new URLSearchParams({
      schoolId: school_id,
      status: activeTab,
    });
    if (hasSearchFilter) params.set("search", searchTerm);
    if (hasClassFilter) params.set("className", filterClass);
    if (hasSectionFilter) params.set("section", filterSection);

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      students?: Array<Pick<Student, "id" | "school_id" | "auth_user_id" | "full_name" | "class_name" | "section" | "status">>;
      error?: { message?: string };
    }>(`/api/web/students/credential-cards?${params.toString()}`);

    if (!response.ok) {
      setError(payload?.error?.message || "خطأ في تحميل الطلاب للطباعة.");
      return null;
    }

    return {
      schoolId: school_id,
      hasFilters,
      students: payload?.students ?? [],
    };
  }

  async function handleAdd(e:React.FormEvent){
    if (!canManageStudentAccounts) {
      setError("ليس لديك صلاحية إنشاء طالب مع حساب التطبيق.");
      return;
    }
    e.preventDefault(); setSaving(true); setError("");
    const {school_id}=await getSchoolBranch();
    if(!school_id){setError("يجب إضافة مدرسة وفرع أولاً");setSaving(false);return;}
    const response = await fetchWithAuthorizedSession("/api/dashboard/users", {
      method: "POST",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        school_id,
        role: "student",
        full_name: form.full_name,
        email: "",
        password: "",
        phone: form.phone,
        is_active: true,
        student: {
          class_name: form.class_name,
          section: form.section,
          address: form.address,
          total_fee: form.total_fee,
          paid_fee: form.paid_fee,
          discount_value: form.discount_value,
        },
        teacher: null,
      }),
    });
    const payload = await response.json().catch(() => null);
    if(!response.ok)setError(payload?.error?.message || "تعذر إنشاء الطالب مع حساب التطبيق.");
    else{
      setSuccess("تم إضافة الطالب وإنشاء حساب التطبيق ✓");setShowModal(false);setAddStep(1);
      setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
      setForm({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});
      reload(); setTimeout(()=>setSuccess(""),4000);
    }
    setSaving(false);
  }

  async function handleEdit(e:React.FormEvent){
    if (!canEditStudents) {
      setError("ليس لديك صلاحية لتعديل بيانات الطلاب");
      return;
    }
    e.preventDefault(); if(!selectedStudent)return; setSaving(true);
    const { school_id } = await getSchoolBranch();
    if(!school_id){setError("يجب تحديد مدرسة قبل تعديل الطالب");setSaving(false);return;}
    const {error}=await supabase.from("students").update({
      full_name:editForm.full_name,class_name:editForm.class_name,section:editForm.section||"",
      phone:editForm.phone||null,address:editForm.address||null,
      total_fee:parseInt(editForm.total_fee)||0,
      paid_fee:parseInt(editForm.paid_fee)||0,
      discount_value:parseInt(editForm.discount_value)||0,
      status:editForm.status
    }).eq("id",selectedStudent.id);
    if(error)setError("خطأ: "+error.message);
    else{
      try {
        await fetchWithAuthorizedSession(`/api/dashboard/students/${selectedStudent.id}/sync-teachers`, {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id,
            class_name: editForm.class_name,
            section: editForm.section || "",
          }),
        });
      } catch {
        // keep update successful even if sync endpoint is unavailable
      }
      setSuccess("تم تحديث البيانات وربط الطالب تلقائياً بالأساتذة حسب الصف والشعبة ✓");
      setShowEdit(false);reload();setTimeout(()=>setSuccess(""),3000);
    }
    setSaving(false);
  }

  async function changeStatus(student: StudentWithFees, status: StudentStatus, msg: string){
    if (!canEditStudents) {
      setError("ليس لديك صلاحية تعديل حالة الطالب");
      return;
    }
    setError("");
    const { error } = await supabase.from("students").update({status}).eq("id",student.id);
    if (error) {
      setError("خطأ: " + error.message);
      return;
    }
    if (status === "active" || status === "transferred" || status === "suspended") {
      setActiveTab(status);
    }
    setSuccess(msg); reload(); setTimeout(()=>setSuccess(""),3000);
  }

  async function handleDeleteConfirmed(){
    if (!canDeleteStudents) {
      setError("ليس لديك صلاحية حذف الطالب");
      return;
    }
    if(!selectedStudent)return;
    setError("");
    const { error } = await supabase.from("students").update({status:"deleted"}).eq("id",selectedStudent.id);
    if (error) {
      setError("خطأ: " + error.message);
      return;
    }
    setShowDeleteConfirm(false); setSelectedStudent(null);
    setActiveTab("deleted");
    setSuccess("تم نقل الطالب للمحذوفين"); reload(); setTimeout(()=>setSuccess(""),3000);
  }

  const exportExcel = useCallback(async (data: StudentWithFees[]) => {
    const XLSX = await loadXLSX();
    const rows=data.map(s=>({
      "الاسم":s.full_name,"الصف":s.class_name,"الشعبة":s.section||"",
      "العنوان":s.address||"",
      "الهاتف":s.phone||"",
      "إجمالي الرسوم":s.total_fee,"المدفوع":s.paid_fee,"المتبقي":s.remaining_fee,
      "الحالة":STATUS_MAP[s.status]?.label||s.status
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"الطلاب");
    await XLSX.writeFile(wb,`طلاب_${activeTab}_${formatDate(new Date())}.xlsx`);
  }, [activeTab]);

function printFilteredStudents(students: StudentWithFees[]) {
  if (students.length === 0) {
    setError("لا يوجد طلاب للطباعة بعد تطبيق الفلاتر.");
    return;
  }

  setError("");
  const w = window.open("", "_blank");
  if (!w) {
    setError("يرجى السماح بالنوافذ المنبثقة للطباعة");
    return;
  }

  const cardsHtml = students.map((s) => {
    const classLine = [
      s.class_name,
      s.section ? `${locale === "en" ? "Section" : "الشعبة"} ${s.section}` : null,
    ]
      .filter(Boolean)
      .join(" • ");
    return `
      <div class="student-card" style="break-inside: avoid; margin-bottom: 2rem;">
        <div class="card-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #eef4fb;">
          <div>
            <h3 style="font-size: 22px; font-weight: 900; margin: 0;">${s.full_name}</h3>
            <p style="margin: 0.3rem 0 0 0; color: #547086; font-size: 14px;">${classLine || "—"}</p>
          </div>
          <div style="color: #547086; font-size: 13px;">${formatDate(s.updated_at || s.created_at)}</div>
        </div>
          <div class="info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div class="info-box" style="border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Address" : "العنوان"}</div>
            <div style="font-size: 16px; font-weight: 700;">${s.address || "—"}</div>
          </div>
          <div class="info-box" style="border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Phone" : "الهاتف"}</div>
            <div style="font-size: 16px; font-weight: 700; direction: ltr;">${s.phone || "—"}</div>
          </div>
          <div class="info-box fees" style="border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #0369a1; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</div>
            <div style="font-size: 20px; font-weight: 900; color: #0c4a6e;">د.ع ${formatNumber(s.total_fee)}</div>
          </div>
          <div class="info-box paid" style="border: 1px solid #dcfce7; background: linear-gradient(135deg, #f0fdf4, #d1fae5); border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #166534; margin-bottom: 0.5rem; font-weight: 600;">${locale === "en" ? "Paid / remaining" : "مدفوع / متبقي"}</div>
            <div style="font-size: 18px; font-weight: 800;">
              <span style="color: #059669;">د.ع ${formatNumber(s.paid_fee)}</span> / 
              <span style="color: ${s.remaining_fee > 0 ? '#dc2626' : '#059669'}; font-weight: 900;">د.ع ${formatNumber(s.remaining_fee)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  w.document.write(
    wrapPrintDocument({
      title: locale === "en" ? "Students list" : "قائمة الطلاب",
      subtitle:
        locale === "en"
          ? `${students.length} filtered students`
          : `${students.length} طالب بعد تطبيق الفلاتر`,
      branding: {
        schoolName: runtimeBranding.schoolName,
        logoUrl: runtimeBranding.logoUrl,
        primaryColor: runtimeBranding.primaryColor,
        secondaryColor: runtimeBranding.secondaryColor,
        locale: locale === "en" ? "en" : "ar",
      },
      bodyHtml: `
        <div class="print-panel" style="margin-bottom:20px">
          <div class="print-grid">
            <div>
              <span class="print-label">${locale === "en" ? "Total students" : "إجمالي الطلاب"}</span>
              <div class="print-value">${students.length}</div>
            </div>
            <div>
              <span class="print-label">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</span>
              <div class="print-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.total_fee || 0), 0))}</div>
            </div>
            <div>
              <span class="print-label">${locale === "en" ? "Total remaining" : "المتبقي الكلي"}</span>
              <div class="print-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.remaining_fee || 0), 0))}</div>
            </div>
          </div>
        </div>
        ${cardsHtml}
      `,
      extraStyles: `
        @page { margin: 1.5cm; size: A4; }
        .student-card { page-break-inside: avoid; }
      `,
    }),
  );
  w.document.close();
}

function handlePrint(s: StudentWithFees){
  setError("");
  const w=window.open("","_blank");
  if(!w){ setError("يرجى السماح بالنوافذ المنبثقة للطباعة"); return; }
  w.document.write(
    wrapPrintDocument({
      title: locale === "en" ? "Student profile" : "بيانات الطالب",
      subtitle: s.full_name,
      branding: {
        schoolName: runtimeBranding.schoolName,
        logoUrl: runtimeBranding.logoUrl,
        primaryColor: runtimeBranding.primaryColor,
        secondaryColor: runtimeBranding.secondaryColor,
        locale: locale === "en" ? "en" : "ar",
      },
      bodyHtml: `
        <div class="print-grid">
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Name" : "الاسم"}</span><div class="print-value">${escapeHtml(s.full_name)}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Class" : "الصف"}</span><div class="print-value">${escapeHtml(s.class_name)}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Section" : "الشعبة"}</span><div class="print-value">${escapeHtml(s.section || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Address" : "العنوان"}</span><div class="print-value">${escapeHtml(s.address || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Phone" : "الهاتف"}</span><div class="print-value" style="direction:ltr;text-align:left">${escapeHtml(s.phone || "—")}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</span><div class="print-value">د.ع ${formatNumber(s.total_fee)}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Paid" : "المدفوع"}</span><div class="print-value">د.ع ${formatNumber(s.paid_fee)}</div></div>
          <div class="print-panel"><span class="print-label">${locale === "en" ? "Remaining" : "المتبقي"}</span><div class="print-value">د.ع ${formatNumber(s.remaining_fee)}</div></div>
        </div>
      `,
    }),
  );
  w.document.close();
}

  function openAccountCardWindow(card: ManagedUserAccountCard, autoPrint = true){
    const w=window.open("","_blank");
    if(!w){ setError("يرجى السماح بالنوافذ المنبثقة لعرض بطاقة الحساب"); return; }
    w.document.open();
    w.document.write(
      buildPrintableCardHtml(
        card,
        {
          locale: locale === "en" ? "en" : "ar",
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
        },
        autoPrint,
      ),
    );
    w.document.close();
  }

  async function copyAccountCardCredentials(){
    if(!accountCard) return;
    await navigator.clipboard.writeText(`معرّف الدخول: ${accountCard.login_identifier}\nكلمة المرور المؤقتة: ${accountCard.temporary_password}`);
    setSuccess("تم نسخ بيانات الدخول المؤقتة"); setTimeout(()=>setSuccess(""),3000);
  }

  async function ensureStudentCredentialCard(student: StudentCredentialTarget, schoolId: string) {
    if (!student?.id) {
      throw new Error("تعذر تحديد الطالب المطلوب.");
    }

    if (!student.auth_user_id) {
      const ensureResponse = await fetchWithAuthorizedSession(`/api/dashboard/students/${student.id}/ensure-account`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: schoolId }),
      });
      const ensurePayload = await ensureResponse.json().catch(() => null);
      if (!ensureResponse.ok || !ensurePayload?.accountCard) {
        throw new Error(
          readApiError(
            ensurePayload,
            `تعذر إنشاء حساب التطبيق للطالب ${student.full_name}.`,
          ),
        );
      }

      return {
        accountCard: ensurePayload.accountCard as ManagedUserAccountCard,
        createdNewAccount: Boolean(ensurePayload.createdNewAccount),
      };
    }

    const cardResponse = await fetchWithAuthorizedSession(
      `/api/dashboard/users/${student.auth_user_id}/card?schoolId=${encodeURIComponent(schoolId)}`,
      { cache: "no-store" },
    );
    const cardPayload = await cardResponse.json().catch(() => null);

    if (cardResponse.ok && cardPayload?.accountCard) {
      return {
        accountCard: cardPayload.accountCard as ManagedUserAccountCard,
        createdNewAccount: false,
      };
    }

    const resetResponse = await fetchWithAuthorizedSession(`/api/dashboard/users/${student.auth_user_id}/reset-password`, {
      method: "POST",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id: schoolId }),
    });
    const resetPayload = await resetResponse.json().catch(() => null);

    if (!resetResponse.ok || !resetPayload?.accountCard) {
      throw new Error(
        readApiError(
          resetPayload ?? cardPayload,
          `تعذر إنشاء بطاقة دخول للطالب ${student.full_name}.`,
        ),
      );
    }

    return {
      accountCard: resetPayload.accountCard as ManagedUserAccountCard,
      createdNewAccount: false,
    };
  }

  async function openStudentCredentialsCard(student: StudentWithFees){
    if (!canManageStudentAccounts) {
      setError("إدارة بطاقات الدخول متاحة للإدارة فقط.");
      return;
    }
    setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      setError("يجب تحديد مدرسة قبل عرض بطاقة الدخول.");
      return;
    }

    try {
      const result = await ensureStudentCredentialCard(student, school_id);
      setAccountCard(result.accountCard);
      if (result.createdNewAccount) {
        setSuccess("تم إنشاء حساب التطبيق لهذا الطالب وتجهيز بطاقة الدخول فوراً.");
      } else if (!student.auth_user_id) {
        setSuccess("تم تجهيز حساب التطبيق للطالب وربطه ببطاقة الدخول.");
      } else {
        setSuccess("تم فتح بطاقة الدخول بنجاح.");
      }
      void reload();
      setTimeout(()=>setSuccess(""),3000);
    } catch (credentialsError) {
      setError(credentialsError instanceof Error ? credentialsError.message : "تعذر فتح بطاقة الدخول.");
    }
  }

  async function printAllStudentCards() {
    if (!canManageStudentAccounts) {
      setError("طباعة بطاقات الدخول متاحة للإدارة فقط.");
      return;
    }
    setError("");
    const printable = await fetchStudentsForCredentialsPrinting();
    if (!printable) {
      return;
    }

    const { schoolId, hasFilters, students } = printable;
    if (students.length === 0) {
      setError(
        hasFilters
          ? "لا يوجد طلاب يطابقون الفلاتر الحالية لطباعة البطاقات."
          : "لا يوجد طلاب ضمن نطاق المدرسة لطباعة البطاقات.",
      );
      return;
    }

    setPrintingCards(true);
    setError("");
    const cards: ManagedUserAccountCard[] = [];
    const issues: string[] = [];

    for (const student of students) {
      try {
        const result = await ensureStudentCredentialCard(student, schoolId);
        if (result.accountCard) cards.push(result.accountCard);
      } catch (issue) {
        issues.push(issue instanceof Error ? issue.message : `تعذر تجهيز بطاقة الطالب ${student.full_name}.`);
      }
    }

    setPrintingCards(false);

    if (cards.length === 0) {
      setError(issues[0] || "تعذر تجهيز بطاقات الدخول.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=900");
    if (!popup) {
      setError("يرجى السماح بالنوافذ المنبثقة للطباعة.");
      return;
    }

    const cardsMarkup = cards
      .map((card, index) => {
        const classLine = [
          card.class_name,
          card.section ? `${locale === "en" ? "Section" : "الشعبة"} ${card.section}` : null,
        ]
          .filter(Boolean)
          .join(" • ");
        return `
          <section class="credential-card${index < cards.length - 1 ? " card-break" : ""}">
            <div class="card-head">
              <div>
                <h2>${card.school_name}</h2>
                <p>${locale === "en" ? "Student login card" : "بطاقة دخول الطالب"}</p>
              </div>
              <span>${formatCardDate(card.generated_at)}</span>
            </div>
            <div class="grid">
              <div class="item"><label>${locale === "en" ? "Student name" : "اسم الطالب"}</label><strong>${card.full_name}</strong></div>
              <div class="item"><label>${locale === "en" ? "Class and section" : "الصف والشعبة"}</label><strong>${classLine || "—"}</strong></div>
              <div class="item"><label>${locale === "en" ? "Login identifier" : "معرّف الدخول"}</label><strong dir="ltr">${card.login_identifier}</strong></div>
              <div class="item"><label>${locale === "en" ? "Temporary password" : "كلمة المرور المؤقتة"}</label><strong dir="ltr">${card.temporary_password}</strong></div>
            </div>
            <ol>${card.instructions.map((instruction) => `<li>${instruction}</li>`).join("")}</ol>
          </section>
        `;
      })
      .join("");

    popup.document.write(
      wrapPrintDocument({
        title: locale === "en" ? "Student login cards" : "بطاقات دخول الطلاب",
        subtitle:
          locale === "en"
            ? `${cards.length} printable cards prepared`
            : `تم تجهيز ${cards.length} بطاقة للطباعة`,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: locale === "en" ? "en" : "ar",
        },
        bodyHtml: cardsMarkup,
        extraStyles: `
          .credential-card{background:#fff;border:1px solid rgba(16,35,58,.08);border-radius:20px;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.08);margin-bottom:18px}
          .card-break{page-break-after:always}
          .card-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
          .card-head h2{margin:0;font-size:22px}
          .card-head p{margin:4px 0 0;color:#475569}
          .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:10px 0}
          .item{border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#f8fbff}
          label{font-size:12px;color:#64748b;display:block;margin-bottom:4px}
          strong{font-size:16px}
          ol{margin:0;padding-inline-start:20px;line-height:1.8}
          @media print{body{background:#fff;padding:0}.credential-card{box-shadow:none}}
        `,
      }),
    );
    popup.document.close();

    if (issues.length > 0) {
      setSuccess(
        hasFilters
          ? `تمت طباعة ${cards.length} بطاقة ضمن الفلاتر الحالية، وتعذر تجهيز ${issues.length} بطاقة.`
          : `تمت طباعة ${cards.length} بطاقة لكل طلاب المدرسة ضمن النطاق الحالي، وتعذر تجهيز ${issues.length} بطاقة.`,
      );
    } else {
      setSuccess(
        hasFilters
          ? `تمت طباعة ${cards.length} بطاقة دخول ضمن الفلاتر الحالية بنجاح.`
          : `تمت طباعة ${cards.length} بطاقة دخول لكل طلاب المدرسة ضمن النطاق الحالي بنجاح.`,
      );
    }
    setTimeout(()=>setSuccess(""),4000);
  }

  function openMenu(e:React.MouseEvent,student: StudentWithFees){
    e.stopPropagation();
    const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({top:rect.bottom+4,left:rect.left-100});
    setActiveMenu(activeMenu===student.id?null:student.id);
    setSelectedStudent(student);
  }

  function openEdit(student: StudentWithFees){
    setError("");
    setSelectedStudent(student);
    setEditForm({
      full_name:student.full_name,class_name:student.class_name,section:student.section||"",
      phone:student.phone||"",address:student.address||"",
      total_fee:student.total_fee?.toString()||"0",
      paid_fee:student.paid_fee?.toString()||"0",
      discount_value:student.discount_value?.toString()||"",
      status:student.status
    });
    setShowEdit(true); setActiveMenu(null);
  }

  async function handleFileChange(e:React.ChangeEvent<HTMLInputElement>){
    setImportError(""); setImportPreview([]);
    const file=e.target.files?.[0]; if(!file)return;
    const fileValidationError = validateStudentImportFile(file);
    if (fileValidationError) {
      setImportError(fileValidationError);
      e.target.value = "";
      return;
    }
    try{
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer,{type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data:any[]=XLSX.utils.sheet_to_json(ws);
      if(!data.length){setImportError("الملف فارغ");return;}
      if(!Object.keys(data[0]).includes("اسم الطالب")){setImportError("عمود 'اسم الطالب' مطلوب");return;}
      setImportPreview(data.slice(0,5));
    }catch{
      setImportError("خطأ في قراءة الملف");
    }
  }

  async function handleImport(){
    if (!canManageStudentAccounts) {
      setImportError("ليس لديك صلاحية استيراد الطلاب مع حسابات الدخول");
      return;
    }
    const file=fileRef.current?.files?.[0]; if(!file)return;
    const fileValidationError = validateStudentImportFile(file);
    if (fileValidationError) {
      setImportError(fileValidationError);
      return;
    }
    setImporting(true);
    const {school_id,branch_id}=await getSchoolBranch();
    if(!school_id||!branch_id){setImportError("يجب إضافة مدرسة وفرع أولاً");setImporting(false);return;}
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = await XLSX.read(buffer,{type:"array"});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data:any[]=XLSX.utils.sheet_to_json(ws);
      const rows=data.map((r:any)=>({
        school_id,branch_id,full_name:r["اسم الطالب"]||"",class_name:r["الصف"]||"",
        section:r["الشعبة"]||"",
        phone:r["الهاتف"]?.toString()||null,address:r["العنوان"]||null,
        total_fee:parseInt(r["إجمالي الرسوم"])||0,paid_fee:parseInt(r["المدفوع"])||0,
        discount_value:parseInt(r["التخفيض"])||0,status:"active"
      })).filter(r=>r.full_name && r.class_name);

      let successCount = 0;
      const failures: string[] = [];

      for (const row of rows) {
        const response = await fetchWithAuthorizedSession("/api/dashboard/users", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id,
            role: "student",
            full_name: row.full_name,
            email: "",
            password: "",
            phone: row.phone,
            is_active: true,
            student: {
              class_name: row.class_name,
              section: row.section,
              address: row.address,
              total_fee: row.total_fee,
              paid_fee: row.paid_fee,
              discount_value: row.discount_value,
            },
            teacher: null,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          failures.push(payload?.error?.message || `تعذر استيراد الطالب ${row.full_name}`);
        } else {
          successCount += 1;
        }
      }

      if(failures.length > 0 && successCount === 0)setImportError(failures[0]);
      else{
        setSuccess(
          failures.length > 0
            ? `تم استيراد ${successCount} طالب مع إنشاء حسابات الدخول، وتعذر استيراد ${failures.length} سجل.`
            : `تم استيراد ${successCount} طالب مع إنشاء حسابات الدخول ✓`,
        );
        setShowImport(false);setImportPreview([]);
        if(fileRef.current)fileRef.current.value="";
        reload();setTimeout(()=>setSuccess(""),4000);
      }
    } catch {
      setImportError("تعذر معالجة ملف الاستيراد");
    } finally {
      setImporting(false);
    }
  }

  async function downloadTemplate(){
    const XLSX = await loadXLSX();
    const ws=XLSX.utils.aoa_to_sheet([
      ["اسم الطالب","الصف","العنوان","الهاتف","إجمالي الرسوم","المدفوع"],
      ["أحمد محمد علي","الصف الخامس - أ","بغداد","07701234567","500000","0"],
    ]);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"الطلاب");
    await XLSX.writeFile(wb,"نموذج_الطلاب.xlsx");
  }

// Paged data already filtered server-side
  const tabStudents = pagedStudents;

  // Full students dataset (all pages)
  const [allStudentsDataset, setAllStudentsDataset] = useState<StudentWithFees[]>([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const datasetFilterKeyRef = useRef<string>("");

  const loadStudentsDataset = useCallback(async () => {
    if (!profile) return [];

    const filterKey = [
      profile.id,
      schoolScope.selectedSchoolId ?? "none",
      activeTab,
      debouncedSearch.trim(),
      filterClass.trim(),
      filterSection.trim(),
    ].join("::");

    if (datasetFilterKeyRef.current === filterKey) {
      return allStudentsDataset;
    }

    const schoolId = await resolveSchoolIdForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });
    if (!schoolId) return [];

    setDatasetLoading(true);
    try {
      const params = new URLSearchParams({
        schoolId,
        type: "students",
        status: activeTab,
      });
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (filterClass.trim()) params.append("className", filterClass.trim());
      if (filterSection.trim()) params.append("sectionName", filterSection.trim());

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: StudentDatasetRow[];
        error?: { message?: string };
      }>(`/api/web/reports/dataset?${params.toString()}`);
      
      if (!response.ok) {
        console.error("Dataset fetch failed:", payload?.error?.message);
        return [];
      }

      const rawStudents: StudentDatasetRow[] = payload?.students ?? [];
      const fullDataset: StudentWithFees[] = rawStudents.map((item) =>
        mapStudentRecordToStudentWithFees(item, schoolId),
      );

      setAllStudentsDataset(fullDataset);
      datasetFilterKeyRef.current = filterKey;
      return fullDataset;
    } catch (err) {
      console.error("loadStudentsDataset error:", err);
      return [];
    } finally {
      setDatasetLoading(false);
    }
  }, [profile, schoolScope.selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection, allStudentsDataset]);

  const exportAllStudentsExcel = useCallback(async () => {
    const fullDataset = await loadStudentsDataset();
    if (fullDataset.length === 0) {
      setError("تعذر تحميل بيانات التصدير الكاملة");
      return;
    }

    exportExcel(fullDataset);
    setSuccess(`${fullDataset.length} طالب مصدر بنجاح (الكل)`);
    setTimeout(() => setSuccess(""), 3000);
  }, [exportExcel, loadStudentsDataset]);

  // فلترة حسب البحث والصف والشعبة
  const classes = Array.from(
    new Set(
      classFees
        .map((item) => (typeof item.class_name === "string" ? item.class_name.trim() : ""))
        .filter(Boolean),
    ),
  ) as string[];
  const sectionsList = studentsMeta.sectionOptions;

  const filtered = tabStudents.filter(s=>{
    const matchSearch = s.full_name?.includes(search) || s.class_name?.includes(search);
    const matchClass  = filterClass ? s.class_name === filterClass : true;
    const matchSection = filterSection ? s.section === filterSection : true;
    return matchSearch && matchClass && matchSection;
  });

  // خيارات كل تبويب
  function getActions(s: StudentWithFees){
    const credentialActions = canManageStudentAccounts
      ? [{ icon: "🔐", label: "بطاقة الدخول", fn: () => { void openStudentCredentialsCard(s); setActiveMenu(null); } }]
      : [];

    if (isReadOnlyView) {
      return [
        ...credentialActions,
        { icon: "🖨️", label: "طباعة", fn: () => { handlePrint(s); setActiveMenu(null); } },
      ];
    }

    if(activeTab==="active") return [
      ...credentialActions,
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      ...(canEditStudents ? [
        {icon:"📦",label:"نقل الطالب",fn:()=>{changeStatus(s,"transferred","تم نقل الطالب ✓");setActiveMenu(null)}},
        {icon:"⏸️",label:"توقيف الطالب",fn:()=>{changeStatus(s,"suspended","تم توقيف الطالب ✓");setActiveMenu(null)}},
        {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
      ] : []),
      ...(canDeleteStudents ? [
        {sep:true},
        {icon:"🗑️",label:"حذف",danger:true,fn:()=>{setSelectedStudent(s);setShowDeleteConfirm(true);setActiveMenu(null)}},
      ] : []),
    ];
    if(activeTab==="transferred") return [
      ...credentialActions,
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      ...(canEditStudents ? [
        {icon:"↩️",label:"استعادة الطالب",fn:()=>{changeStatus(s,"active","تم استعادة الطالب ✓");setActiveMenu(null)}},
        {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
      ] : []),
    ];
    if(activeTab==="suspended") return [
      ...credentialActions,
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      ...(canEditStudents ? [
        {icon:"↩️",label:"إعادة التفعيل",fn:()=>{changeStatus(s,"active","تم تفعيل الطالب ✓");setActiveMenu(null)}},
        {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
      ] : []),
    ];
    if(activeTab==="deleted") return canEditStudents
      ? [{icon:"↩️",label:"استعادة الطالب",fn:()=>{changeStatus(s,"active","تم استعادة الطالب ✓");setActiveMenu(null)}}]
      : [];
    return [];
  }

  return(
  <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
  <>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280;--field-bg:#F9FBFF;--field-text:#0F172A;--field-border:rgba(15,23,42,0.1);--field-border-strong:rgba(79,140,255,0.42);--field-ring:rgba(79,140,255,0.14);--field-shadow:inset 0 1px 0 rgba(255,255,255,0.82);}
      body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
      .layout{display:flex;height:100vh}
      .sidebar{width:200px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(108,74,182,0.1);flex-shrink:0}
      .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
      .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
      .logo-ico svg{width:18px;height:18px;fill:white}
      .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
      .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
      .nav:hover{background:rgba(108,74,182,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
      .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
      .sep{height:1px;background:rgba(108,74,182,0.12);margin:.4rem 0}
      .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
      .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(108,74,182,0.08);flex-shrink:0}
      .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
      .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}

      /* TABS */
      .tabs{display:flex;gap:.4rem;margin-bottom:1rem;background:white;border-radius:13px;padding:.5rem;box-shadow:0 2px 8px rgba(108,74,182,0.07)}
      .tab{flex:1;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .8rem;border-radius:9px;cursor:pointer;font-size:.8rem;font-weight:700;color:var(--gray);transition:all .2s;border:none;background:none;font-family:var(--font-manrope),Segoe UI,sans-serif}
      .tab-ico{display:inline-flex;align-items:center;justify-content:center}
      .tab:hover{background:#F0EEFF;color:var(--p3)}
      .tab.active{background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 4px 12px rgba(108,74,182,0.3)}
      .tab-count{background:rgba(255,255,255,0.25);padding:.1rem .4rem;border-radius:10px;font-size:.7rem}
      .tab:not(.active) .tab-count{background:rgba(108,74,182,0.1);color:var(--p3)}

      /* STATS */
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1rem}
      .sc{background:white;border-radius:12px;padding:.8rem 1rem;border:1px solid rgba(108,74,182,0.06);box-shadow:0 2px 8px rgba(108,74,182,0.06)}
      .sc-label{font-size:.7rem;color:var(--gray);font-weight:500}.sc-val{font-size:1rem;font-weight:800;margin-top:.1rem}

      /* TOOLBAR */
      .toolbar{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem;flex-wrap:wrap}
      .srch{position:relative;flex:1;min-width:160px}
      .srch svg{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--gray)}
      .srch input{width:100%;padding:.55rem 2.1rem .55rem .8rem;background:var(--field-bg);border:1px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .srch input:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .filter-sel{padding:.55rem .8rem;background:var(--field-bg);border:1px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .filter-sel:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .btn-add{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-excel{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#D1FAE5;color:#065F46;border:1.5px solid #6EE7B7;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-export{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#DBEAFE;color:#1E40AF;border:1.5px solid #93C5FD;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
      .btn-print{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#fef3c7;color:#92400e;border:1.5px solid #f59e0b;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}

      /* TABLE */
      .tbl-wrap{background:white;border-radius:13px;border:1px solid rgba(108,74,182,0.06);overflow:hidden;box-shadow:0 2px 8px rgba(108,74,182,0.06)}
      table{width:100%;border-collapse:collapse}
      thead{background:#F8F6FF}
      th{padding:.6rem .9rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:left;border-bottom:1px solid rgba(108,74,182,0.08)}
      td{padding:.6rem .9rem;font-size:.78rem;border-bottom:1px solid rgba(108,74,182,0.04)}
      tr:last-child td{border-bottom:none}
      tr:hover td{background:#FAFAFE}
      .badge{display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.66rem;font-weight:700}
      .empty{text-align:center;padding:3rem;color:var(--gray);font-size:.85rem}
      .spin{width:22px;height:22px;border:3px solid rgba(108,74,182,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:2rem auto}
      @keyframes sp{to{transform:rotate(360deg)}}

      /* ACTION MENU */
      .btn-action{padding:.28rem .7rem;background:#EDE8FA;color:var(--p3);border:none;border-radius:7px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer}
      .btn-action:hover{background:#C8B8F0}
      .dropdown-menu{position:fixed;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);border:1px solid rgba(108,74,182,0.1);z-index:9999;min-width:180px;overflow:hidden}
      .d-item{display:flex;align-items:center;gap:.6rem;padding:.62rem 1rem;font-size:.8rem;font-weight:600;cursor:pointer;color:var(--dark);white-space:nowrap}
      .d-item svg{flex-shrink:0}
      .d-item:hover{background:#F8F6FF}
      .d-item.danger{color:#EF4444}.d-item.danger:hover{background:#FEE2E2}
      .d-sep{height:1px;background:rgba(108,74,182,0.08)}

      /* MODALS */
      .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
      .modal{background:white;border-radius:18px;padding:1.6rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
      .modal-sm{max-width:400px}.modal-lg{max-width:620px}
      .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
      .mt{font-size:1rem;font-weight:800}
      .mc{width:30px;height:30px;border-radius:7px;background:#F3F4F6;border:none;cursor:pointer;font-size:1rem}
      .fg{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      .ff{display:flex;flex-direction:column;gap:.32rem}.ff.full{grid-column:1/-1}
      .fl{font-size:.76rem;font-weight:600}.opt{font-size:.68rem;color:var(--gray);font-weight:400}
      .fi,.fs{padding:.65rem .85rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
      .fi:focus,.fs:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
      .fa{display:flex;gap:.7rem;margin-top:1.1rem}
      .bs{flex:1;padding:.75rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bs:disabled{opacity:.65;cursor:not-allowed}
      .bs-danger{flex:1;padding:.75rem;background:#EF4444;color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
      .bc{padding:.75rem 1.2rem;background:#F3F4F6;color:var(--gray);border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
      .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
      .del-ico{font-size:2.5rem;text-align:center;margin-bottom:.8rem}
      .del-msg{text-align:center;font-size:.88rem;color:var(--gray);margin-bottom:1.2rem;line-height:1.7}
      .upload-area{border:2px dashed rgba(108,74,182,0.3);border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;background:#FAFAFE;margin-bottom:1rem}
      .upload-area:hover{border-color:var(--p3);background:#F0EEFF}
      .upload-area svg{width:36px;height:36px;color:var(--p4);margin-bottom:.5rem}
      .template-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1rem;background:#EDE8FA;color:var(--p3);border:none;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;margin-bottom:1rem}
      .preview-table{width:100%;border-collapse:collapse;font-size:.72rem;margin-bottom:.5rem}
      .preview-table th{background:#F8F6FF;padding:.4rem .6rem;text-align:left;font-weight:700;color:var(--p2);border-bottom:1px solid rgba(108,74,182,0.1)}
      .preview-table td{padding:.4rem .6rem;border-bottom:1px solid rgba(108,74,182,0.05)}
      .cols-info{background:#F0EEFF;border-radius:10px;padding:.8rem 1rem;margin-bottom:1rem}
      .cols-title{font-size:.78rem;font-weight:700;color:var(--p2);margin-bottom:.4rem}
      .cols-grid{display:grid;grid-template-columns:1fr 1fr;gap:.2rem}
      .col-item{font-size:.72rem;display:flex;align-items:center;gap:.3rem}
      @media (max-width: 1080px){
        .stats{grid-template-columns:repeat(2,1fr)}
      }
      @media (max-width: 820px){
        .tabs{flex-wrap:wrap}
        .tab{min-width:calc(50% - .2rem)}
        .stats,.fg,.cols-grid{grid-template-columns:1fr}
        .toolbar,.fa{flex-direction:column;align-items:stretch}
        .srch,.filter-sel,.btn-add,.btn-export,.btn-excel,.btn-print,.bc,.bs,.bs-danger{width:100%}
        .tbl-wrap{overflow:auto}
        th,td{white-space:nowrap}
        .modal,.modal-lg,.modal-sm{max-width:100%}
      }
    `}</style>

    <div className="layout">
      <AppSidebar currentPath="/students" showFloatingToggle />

      <div className="main">
        <div className="content app-shell-content">
          {success&&(
            <div className="ok">
              <div>{success}</div>
              {accountCard ? (
                <div style={{marginTop:".45rem",display:"flex",gap:".45rem",flexWrap:"wrap"}}>
                  <button className="bc" style={{padding:".45rem .8rem"}} onClick={()=>openAccountCardWindow(accountCard,true)}>طباعة بيانات الدخول</button>
                  <button className="bc" style={{padding:".45rem .8rem"}} onClick={()=>void copyAccountCardCredentials()}>نسخ اسم المستخدم/المرور</button>
                </div>
              ) : null}
            </div>
          )}
          {error&&<div className="err">{error}</div>}
          <SchoolScopeBanner scope={schoolScope} showSelector={false} />
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="بيانات الطلاب"
              description="لن يتم تحميل الطلاب أو الأقساط أو عمليات الإضافة قبل اختيار مدرسة صريحة لهذا القسم."
            />
          ) : (
            <>
              {/* TABS */}
              <div className="tabs">
                {TABS.map(tab=>{
                  const count = studentsMeta.tabCounts[tab.id as keyof typeof studentsMeta.tabCounts] ?? 0;
                  return(
                    <button key={tab.id} className={`tab${activeTab===tab.id?" active":""}`} onClick={()=>setActiveTab(tab.id)}>
                      <span className="tab-ico"><AppIcon token={tab.icon} size={16} /></span>
                      <span>{tab.label}</span>
                      <span className="tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* STATS */}
              {activeTab==="active"&&(
                <div className="stats">
                  {([
                    ["إجمالي الطلاب",formatNumber(studentsMeta.summary.totalStudents)],
                    ["الطلاب النشطون",formatNumber(studentsMeta.summary.activeStudents)],
                    ["إجمالي الرسوم",`د.ع ${formatNumber(studentsMeta.summary.totalFee)}`],
                    ["الرصيد المتبقي",`د.ع ${formatNumber(studentsMeta.summary.totalRemaining)}`],
                  ] as any[]).map(([l,v]:any,i:number)=>(
                    <div className="sc" key={i}><div className="sc-label">{l}</div><div className="sc-val">{v}</div></div>
                  ))}
                </div>
              )}

              {/* TOOLBAR */}
              <div className="toolbar">
                <div className="srch">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <select className="filter-sel" value={filterClass} onChange={e=>{setFilterClass(e.target.value);setFilterSection("");}}>
                  <option value="">كل الصفوف</option>
                  {classes.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select className="filter-sel" value={filterSection} onChange={e=>setFilterSection(e.target.value)}>
                  <option value="">كل الشعب</option>
                  {sectionsList.map(sec=><option key={sec} value={sec}>شعبة {sec}</option>)}
                </select>
                <>
                  <button 
                    className="btn-export" 
                    onClick={()=>exportExcel(filtered)}
                    title="تصدير الصفحة الحالية فقط (50 طالب)"
                  >
                    <AppIcon token="📤" size={14} />تصدير الصفحة الحالية
                  </button>
                  <button 
                    className="btn-excel" 
                    onClick={exportAllStudentsExcel}
                    disabled={datasetLoading}
                    title="تصدير جميع الطلاب بغض النظر عن الصفحة أو الفلتر"
                  >
                    <AppIcon token="📥" size={14} />
                    {datasetLoading ? "جارٍ التحضير..." : "تصدير الكل إكسل"}
                  </button>
                </>
                <button className="btn-print" onClick={()=>printFilteredStudents(filtered)}><AppIcon token="🖨️" size={14} />طباعة الطلاب المفلترين</button>
                {canManageStudentAccounts && (
                  <button className="btn-print" onClick={()=>void printAllStudentCards()} disabled={printingCards}>
                    <AppIcon token="🪪" size={14} />
                    {printingCards ? "جارٍ تجهيز البطاقات..." : "طباعة جميع بطاقات الطلاب"}
                  </button>
                )}
                {activeTab==="active" && !isReadOnlyView && <>
                  {canManageStudentAccounts && (
                    <>
                      <button className="btn-add" onClick={()=>setShowModal(true)}>+ إضافة طالب</button>
                    </>
                  )}
                </>}
              </div>

              {/* TABLE */}
              <div className="tbl-wrap">
                {pagedLoading ? <div className="spin" /> : error || pagedError ? (
                  <div className="empty">
                    خطأ في تحميل البيانات: {error || (pagedError as any)?.message || "غير معروف"}
                  </div>
                ) : pagedStudents.length === 0 ? (
                  <div className="empty">
                    {totalCount === 0
                      ? activeTab === "active" && canManageStudentAccounts
                        ? "لا يوجد طلاب — اضغط إضافة طالب" 
                        : `لا يوجد طلاب في هذه القائمة (${activeTab})`
                      : "لا توجد نتائج مطابقة للفلاتر الحالية"
                    }
                  </div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th><th>الاسم</th><th>الصف</th><th>الشعبة</th><th>العنوان</th><th>الهاتف</th>
                          <th>الرسوم</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>خيارات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedStudents.map((s,i)=>{
                          const st=STATUS_MAP[s.status]||STATUS_MAP.active;
                          const actions=getActions(s);
                          return <tr key={s.id}>
                            <td style={{color:"var(--gray)",fontSize:".7rem"}}>{(page - 1) * pageSize + i + 1}</td>
                            <td>
                              <span
                                className="student-name"
                                style={{fontWeight:700,color:"var(--p2)",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:"3px"}}
                                onClick={(e)=>openMenu(e,s)}
                              >{s.full_name}</span>
                            </td>
                            <td>{s.class_name}</td>
                            <td>{s.section||"—"}</td>
                            <td style={{color:"var(--gray)"}}>{s.address||"—"}</td>
                            <td style={{color:"var(--gray)"}}>{s.phone||"—"}</td>
                            <td>د.ع {formatNumber(s.total_fee)}</td>
                            <td style={{color:"#10B981",fontWeight:600}}>د.ع {formatNumber(s.paid_fee)}</td>
                            <td style={{color:s.remaining_fee>0?"#EF4444":"#10B981",fontWeight:600}}>د.ع {formatNumber(s.remaining_fee)}</td>
                            <td><span className="badge" style={{background:st.bg,color:st.color}}>{st.label}</span></td>
                            <td>
                              {actions.length>0&&(
                                <button className="btn-action" onMouseDown={(e)=>e.stopPropagation()} onClick={(e)=>openMenu(e,s)}>خيارات ▾</button>
                              )}
                            </td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <button className="btn-nav disabled:opacity-50 px-4 py-2 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg cursor-pointer hover:shadow-md transition-all disabled:cursor-not-allowed" disabled={page === 1} onClick={()=>setPage(page - 1)}>
                          السابق
                        </button>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          صفحة {page} من {totalPages} | {totalCount} طالب
                        </span>
                        <button className="btn-nav disabled:opacity-50 px-4 py-2 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg cursor-pointer hover:shadow-md transition-all disabled:cursor-not-allowed" disabled={page === totalPages} onClick={()=>setPage(page + 1)}>
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* DROPDOWN */}
    {activeMenu&&selectedStudent&&(
	      <div className="dropdown-menu" style={{top:menuPos.top,left:menuPos.left}} onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
        {getActions(selectedStudent).map((a:any,i:number)=>
          a.sep?<div key={i} className="d-sep"/>:
          <div key={i} className={`d-item${a.danger?" danger":""}`} onClick={a.fn}>
            <AppIcon token={a.icon} size={14} />{a.label}
          </div>
        )}
      </div>
    )}

    {/* MODAL إضافة — Wizard */}
    {!isReadOnlyView && canManageStudentAccounts && showModal&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setAddStep(1);}}}>
        <div className="modal">
          <div className="mh">
            <div className="mt">إضافة طالب جديد</div>
            <button className="mc" onClick={()=>{setShowModal(false);setAddStep(1);}}><AppIcon token="✕" size={13} /></button>
          </div>

          {/* Step indicator */}
          <div style={{display:"flex",alignItems:"flex-start",gap:0,marginBottom:"1.2rem"}}>
            {([{n:1,label:"المعلومات"},{n:2,label:"التواصل"},{n:3,label:"الرسوم"}] as const).map(({n,label},i)=>(
              <div key={n} style={{display:"flex",alignItems:"center",flex:n<3?1:undefined}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:".25rem"}}>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:700,fontSize:".76rem",transition:"all .2s",
                    background:addStep>n?"#22C55E":addStep===n?"linear-gradient(135deg,var(--p3),var(--p2))":"rgba(108,74,182,0.1)",
                    color:addStep>=n?"white":"var(--p2)",
                    border:addStep===n?"none":"1px solid rgba(108,74,182,0.2)",
                    flexShrink:0,
                  }}>
                    {addStep>n?"✓":n}
                  </div>
                  <span style={{fontSize:".62rem",color:"var(--gray)",whiteSpace:"nowrap"}}>{label}</span>
                </div>
                {i<2&&<div style={{flex:1,height:2,background:addStep>n?"#22C55E":"rgba(108,74,182,0.15)",margin:"0 .35rem",marginBottom:"1.1rem"}}/>}
              </div>
            ))}
          </div>

          {error&&<div className="err">{error}</div>}
          <form onSubmit={e=>{if(addStep<3){e.preventDefault();setAddStep(s=>s+1);}else{void handleAdd(e);}}}>
            <div className="fg">

              {/* ── خطوة 1: المعلومات الأساسية ── */}
              {addStep===1&&<>
                <div className="ff full"><label className="fl">اسم الطالب *</label><input className="fi" required autoFocus placeholder="أحمد محمد علي" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
                <div className="ff">
                  <label className="fl">الصف الدراسي *</label>
                  <select className="fs" required value={form.class_name} onChange={e=>{
                    const cls=e.target.value;
                    const cf=classFees.find(x=>x.class_name===cls);
                    setForm({...form,class_name:cls,total_fee:cf?String(cf.total_fee):form.total_fee});
                  }}>
                    <option value="">— اختر الصف —</option>
                    {classFees.map(cf=><option key={cf.id} value={cf.class_name}>{cf.class_name}</option>)}
                    <option value="__manual__">أدخل يدوياً...</option>
                  </select>
                  {form.class_name==="__manual__"&&(
                    <input className="fi" style={{marginTop:".4rem"}} placeholder="اكتب اسم الصف" onChange={e=>setForm({...form,class_name:e.target.value})}/>
                  )}
                  {form.class_name&&form.class_name!=="__manual__"&&(()=>{
                    const cf=classFees.find(x=>x.class_name===form.class_name);
                    if(!cf)return null;
                    return(
                      <div style={{background:"linear-gradient(135deg,#EDE8FA,#E0D8F8)",borderRadius:8,padding:".45rem .7rem",marginTop:".4rem",fontSize:".72rem",color:"var(--p2)",fontWeight:700}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}><AppIcon token="💰" size={12} /> قسط واحد: د.ع {cf.installment_amount?.toLocaleString()} × {cf.installments} أقساط</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="ff"><label className="fl">الشعبة <span className="opt">(اختياري)</span></label>
                  <input className="fi" placeholder="مثال: أ، ب، ج" value={form.section} onChange={e=>setForm({...form,section:e.target.value})}/>
                </div>
              </>}

              {/* ── خطوة 2: التواصل ── */}
              {addStep===2&&<>
                <div className="ff full"><label className="fl">العنوان *</label><input className="fi" required autoFocus placeholder="بغداد - الكرخ" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
                <div className="ff full"><label className="fl">الهاتف <span className="opt">(اختياري)</span></label><input className="fi" placeholder="07XXXXXXXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              </>}

              {/* ── خطوة 3: الرسوم ── */}
              {addStep===3&&<>
                <div className="ff">
                  <label className="fl">إجمالي الرسوم (د.ع) *
                    {form.class_name&&classFees.find(x=>x.class_name===form.class_name)&&(
                      <span className="opt"> — تلقائي من الصف</span>
                    )}
                  </label>
                  <input className="fi" type="number" required autoFocus placeholder="500000" value={form.total_fee} onChange={e=>setForm({...form,total_fee:e.target.value})}/>
                </div>
                <div className="ff"><label className="fl">المدفوع مسبقاً <span className="opt">(اختياري)</span></label><input className="fi" type="number" placeholder="0" value={form.paid_fee} onChange={e=>setForm({...form,paid_fee:e.target.value})}/></div>
                <div className="ff full">
                  <label className="fl">التخفيض (د.ع) <span className="opt">(اختياري)</span></label>
                  <input className="fi" type="number" placeholder="0" value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})}/>
                  {form.discount_value&&parseInt(form.discount_value)>0&&form.total_fee&&parseInt(form.total_fee)>0&&(
                    <div style={{background:"#FEF3C7",borderRadius:7,padding:".35rem .6rem",marginTop:".35rem",fontSize:".7rem",color:"#92400E",fontWeight:700}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}><AppIcon token="✂️" size={12} /> بعد الخصم: د.ع {(parseInt(form.total_fee)-parseInt(form.discount_value)).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </>}

            </div>
            <div className="fa">
              {addStep>1&&(
                <button type="button" className="bc" onClick={()=>setAddStep(s=>s-1)}>→ السابق</button>
              )}
              {addStep<3?(
                <button type="submit" className="bs">← التالي</button>
              ):(
                <button type="submit" className="bs" disabled={saving}>{saving?"جارٍ الحفظ...":"✓ حفظ الطالب"}</button>
              )}
              {addStep===1&&(
                <button type="button" className="bc" onClick={()=>{setShowModal(false);setAddStep(1);}}>إلغاء</button>
              )}
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL تعديل */}
    {!isReadOnlyView && showEdit && selectedStudent && (
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowEdit(false)}}>
        <div className="modal">
          <div className="mh"><div className="mt">تعديل بيانات الطالب</div><button className="mc" onClick={()=>setShowEdit(false)}><AppIcon token="✕" size={13} /></button></div>
          <form onSubmit={handleEdit}>
            <div className="fg">
              <div className="ff full"><label className="fl">اسم الطالب *</label><input className="fi" required value={editForm.full_name} onChange={e=>setEditForm({...editForm,full_name:e.target.value})}/></div>
              <div className="ff">
                <label className="fl">الصف الدراسي *</label>
                <select className="fs" required value={editForm.class_name} onChange={e=>{
                  const cls=e.target.value;
                  const cf=classFees.find(x=>x.class_name===cls);
                  setEditForm({...editForm,class_name:cls,total_fee:cf?String(cf.total_fee):editForm.total_fee});
                }}>
                  <option value="">— اختر الصف —</option>
                  {classFees.map(cf=><option key={cf.id} value={cf.class_name}>{cf.class_name}</option>)}
                  <option value="__manual__">أدخل يدوياً...</option>
                </select>
                {editForm.class_name==="__manual__"&&(
                  <input className="fi" style={{marginTop:".4rem"}} placeholder="اكتب اسم الصف" onChange={e=>setEditForm({...editForm,class_name:e.target.value})}/>
                )}
                {editForm.class_name&&editForm.class_name!=="__manual__"&&(()=>{
                  const cf=classFees.find(x=>x.class_name===editForm.class_name);
                  if(!cf)return null;
                  return(
                    <div style={{background:"linear-gradient(135deg,#EDE8FA,#E0D8F8)",borderRadius:8,padding:".45rem .7rem",marginTop:".4rem",fontSize:".72rem",color:"var(--p2)",fontWeight:700}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}><AppIcon token="💰" size={12} /> قسط واحد: د.ع {cf.installment_amount?.toLocaleString()} × {cf.installments} أقساط</span>
                    </div>
                  );
                })()}
              </div>
              <div className="ff"><label className="fl">الشعبة <span className="opt">(اختياري)</span></label>
                <input className="fi" placeholder="مثال: أ، ب، ج" value={editForm.section} onChange={e=>setEditForm({...editForm,section:e.target.value})}/>
              </div>
              <div className="ff"><label className="fl">العنوان</label><input className="fi" value={editForm.address} onChange={e=>setEditForm({...editForm,address:e.target.value})}/></div>
              <div className="ff"><label className="fl">الهاتف</label><input className="fi" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></div>
              <div className="ff">
                <label className="fl">إجمالي الرسوم (د.ع)
                  {editForm.class_name&&classFees.find(x=>x.class_name===editForm.class_name)&&(
                    <span className="opt"> — تلقائي من الصف</span>
                  )}
                </label>
                <input className="fi" type="number" value={editForm.total_fee} onChange={e=>setEditForm({...editForm,total_fee:e.target.value})}/>
              </div>
              <div className="ff"><label className="fl">المدفوع (د.ع)</label><input className="fi" type="number" value={editForm.paid_fee} onChange={e=>setEditForm({...editForm,paid_fee:e.target.value})}/></div>
              <div className="ff">
                <label className="fl">التخفيض (د.ع) <span className="opt">(اختياري)</span></label>
                <input className="fi" type="number" placeholder="0" value={editForm.discount_value} onChange={e=>setEditForm({...editForm,discount_value:e.target.value})}/>
                {editForm.discount_value&&parseInt(editForm.discount_value)>0&&editForm.total_fee&&parseInt(editForm.total_fee)>0&&(
                  <div style={{background:"#FEF3C7",borderRadius:7,padding:".35rem .6rem",marginTop:".35rem",fontSize:".7rem",color:"#92400E",fontWeight:700}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}><AppIcon token="✂️" size={12} /> بعد الخصم: د.ع {(parseInt(editForm.total_fee)-parseInt(editForm.discount_value)).toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="ff"><label className="fl">الحالة</label>
                <select className="fs" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}>
                  <option value="active">نشط</option><option value="transferred">منقول</option>
                  <option value="graduated">متخرج</option><option value="withdrawn">منسحب</option>
                  <option value="archived">مؤرشف</option><option value="suspended">موقوف</option>
                </select>
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="bs" disabled={saving}>{saving?"جارٍ الحفظ...":"حفظ التعديلات"}</button>
              <button type="button" className="bc" onClick={()=>setShowEdit(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL تأكيد الحذف */}
    {!isReadOnlyView && canDeleteStudents && showDeleteConfirm && selectedStudent && (
      <div className="overlay">
        <div className="modal modal-sm">
          <div className="del-ico"><AppIcon token="🗑️" size={26} /></div>
          <div className="mh" style={{justifyContent:"center"}}><div className="mt">تأكيد الحذف</div></div>
          <div className="del-msg">
            هل تريد حذف الطالب<br/>
            <strong>"{selectedStudent.full_name}"</strong>؟<br/>
            <span style={{color:"var(--gray)",fontSize:".8rem"}}>سيتم نقله لقائمة المحذوفين ويمكن استعادته لاحقاً</span>
          </div>
          <div className="fa">
            <button className="bs-danger" onClick={handleDeleteConfirmed}>نعم، احذف</button>
            <button className="bc" onClick={()=>{setShowDeleteConfirm(false);setSelectedStudent(null)}}>إلغاء</button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL استيراد إكسل */}
    {!isReadOnlyView && canManageStudentAccounts && showImport&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget){setShowImport(false);setImportPreview([]);setImportError("");}}}>
        <div className="modal modal-lg">
          <div className="mh"><div className="mt">استيراد طلاب من إكسل</div><button className="mc" onClick={()=>{setShowImport(false);setImportPreview([]);setImportError("");}}><AppIcon token="✕" size={13} /></button></div>
          <div className="cols-info">
            <div className="cols-title">أعمدة الملف:</div>
            <div className="cols-grid">
              <div className="col-item"><span style={{color:"#EF4444"}}>*</span> اسم الطالب (إلزامي)</div>
              <div className="col-item"><span style={{color:"#EF4444"}}>*</span> الصف (إلزامي)</div>
              <div className="col-item"><span style={{color:"var(--gray)"}}>○</span> العنوان</div>
              <div className="col-item"><span style={{color:"var(--gray)"}}>○</span> الهاتف</div>
              <div className="col-item"><span style={{color:"var(--gray)"}}>○</span> هاتف ولي الأمر</div>
              <div className="col-item"><span style={{color:"var(--gray)"}}>○</span> إجمالي الرسوم</div>
              <div className="col-item"><span style={{color:"var(--gray)"}}>○</span> المدفوع</div>
            </div>
          </div>
          <button className="template-btn" onClick={downloadTemplate}><AppIcon token="⬇️" size={15} />تحميل نموذج إكسل جاهز</button>
          <div className="upload-area" onClick={()=>fileRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
            <div style={{fontWeight:700,marginBottom:".2rem"}}>اضغط لرفع ملف إكسل</div>
            <div style={{fontSize:".75rem",color:"var(--gray)"}}>xlsx فقط</div>
            <input ref={fileRef} type="file" accept=".xlsx" style={{display:"none"}} onChange={handleFileChange}/>
          </div>
          {importError&&<div className="err">{importError}</div>}
          {importPreview.length>0&&(
            <>
              <div style={{fontSize:".8rem",fontWeight:700,marginBottom:".5rem"}}>معاينة أول {importPreview.length} صفوف:</div>
              <div style={{overflowX:"auto"}}>
                <table className="preview-table">
                  <thead><tr>{Object.keys(importPreview[0]).map((k,i)=><th key={i}>{k}</th>)}</tr></thead>
                  <tbody>{importPreview.map((row,i)=><tr key={i}>{Object.values(row).map((v:any,j)=><td key={j}>{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </>
          )}
          <div className="fa">
            <button className="bs" disabled={importing||importPreview.length===0} onClick={handleImport}>{importing?"جارٍ الاستيراد...":"استيراد الطلاب"}</button>
            <button className="bc" onClick={()=>{setShowImport(false);setImportPreview([]);setImportError("");}}>إلغاء</button>
          </div>
        </div>
      </div>
    )}

    {accountCard&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setAccountCard(null)}}>
        <div className="modal modal-lg">
          <div className="mh">
            <div className="mt">بطاقة حساب التطبيق جاهزة</div>
            <button className="mc" onClick={()=>setAccountCard(null)}><AppIcon token="✕" size={13} /></button>
          </div>
          <div style={{display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",marginBottom:"1rem"}}>
            <div style={{background:"#F8FBFF",border:"1px solid rgba(15,91,141,0.12)",borderRadius:18,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:800,color:"var(--gray)"}}>الاسم الكامل</div>
              <div style={{marginTop:".4rem",fontSize:"1.05rem",fontWeight:900,color:"var(--p2)"}}>{accountCard.full_name}</div>
            </div>
            <div style={{background:"#F8FBFF",border:"1px solid rgba(15,91,141,0.12)",borderRadius:18,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:800,color:"var(--gray)"}}>الصف والشعبة</div>
              <div style={{marginTop:".4rem",fontSize:"1.05rem",fontWeight:900,color:"var(--p2)"}}>
                {[accountCard.class_name, accountCard.section ? `الشعبة ${accountCard.section}` : null].filter(Boolean).join(" • ") || "—"}
              </div>
            </div>
            <div style={{background:"#F8FBFF",border:"1px solid rgba(15,91,141,0.12)",borderRadius:18,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:800,color:"var(--gray)"}}>معرّف الدخول</div>
              <div style={{marginTop:".4rem",fontSize:"1rem",fontWeight:900,color:"var(--p2)",direction:"ltr",textAlign:"left"}}>{accountCard.login_identifier}</div>
            </div>
            <div style={{background:"#F8FBFF",border:"1px solid rgba(15,91,141,0.12)",borderRadius:18,padding:"1rem"}}>
              <div style={{fontSize:".75rem",fontWeight:800,color:"var(--gray)"}}>كلمة المرور المؤقتة</div>
              <div style={{marginTop:".4rem",fontSize:"1rem",fontWeight:900,color:"var(--p2)",direction:"ltr",textAlign:"left"}}>{accountCard.temporary_password}</div>
            </div>
          </div>
          <div style={{background:"#F8FBFF",border:"1px solid rgba(15,91,141,0.12)",borderRadius:18,padding:"1rem",marginBottom:"1rem"}}>
            <div style={{fontSize:".82rem",fontWeight:900,color:"var(--p2)",marginBottom:".5rem"}}>تعليمات الدخول</div>
            <ol style={{margin:0,paddingRight:"1.2rem",fontSize:".8rem",color:"var(--gray)",lineHeight:1.9}}>
              {accountCard.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </div>
          <div className="fa">
            <button className="bc" onClick={()=>void copyAccountCardCredentials()}>نسخ البيانات</button>
            <button className="bc" onClick={()=>openAccountCardWindow(accountCard,true)}>طباعة</button>
            <button className="bs" onClick={()=>setAccountCard(null)}>إغلاق</button>
          </div>
        </div>
      </div>
    )}
  </>
  </ProtectedRoute>
  );
}
