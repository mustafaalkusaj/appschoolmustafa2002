"use client";
import type { Student, StudentWithFees, StudentStatus, StudentFormData } from "@/types/student";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePagedSupabaseList, type PagedFetchResult } from "@/hooks/usePagedSupabaseList";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import type { ManagedUserAccountCard } from "@/lib/managed-users";
import { resolveSchoolBranchForProfile, resolveSchoolIdForProfile } from "@/lib/school-context";

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

function buildPrintableCardHtml(card: ManagedUserAccountCard, autoPrint = true) {
  const classLine = [card.class_name, card.section ? `الشعبة ${card.section}` : null].filter(Boolean).join(" • ");
  const instructions = card.instructions.map((instruction) => `<li>${instruction}</li>`).join("");

  return `
    <html dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>بطاقة حساب التطبيق</title>
        <style>
          body{margin:0;padding:24px;background:#eef4fb;font-family:Segoe UI,Tahoma,sans-serif;color:#112338}
          .card{max-width:760px;margin:0 auto;background:#fff;border:1px solid rgba(15,91,141,.14);border-radius:28px;padding:28px;box-shadow:0 24px 60px rgba(15,23,42,.1)}
          .row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px}
          .box{border:1px solid rgba(15,91,141,.12);background:#f8fbff;border-radius:20px;padding:18px}
          .label{font-size:13px;color:#6b8194;margin-bottom:6px}
          .value{font-size:18px;font-weight:800}
          .ltr{direction:ltr;text-align:left}
          ol{margin:0;padding-inline-start:22px}
          li{line-height:1.9}
          @media print{body{background:#fff;padding:0}.card{box-shadow:none;border:none;border-radius:0;max-width:none;padding:0}}
        </style>
      </head>
      <body>
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px">
            <div>
              <div style="font-size:24px;font-weight:900">${card.school_name}</div>
              <div style="margin-top:6px;color:#547086">بطاقة حساب التطبيق</div>
            </div>
            <div style="color:#547086">تم التوليد: ${formatCardDate(card.generated_at)}</div>
          </div>
          <div class="row">
            <div class="box"><div class="label">اسم الطالب</div><div class="value">${card.full_name}</div></div>
            <div class="box"><div class="label">الصف والشعبة</div><div class="value">${classLine || "—"}</div></div>
          </div>
          <div class="row">
            <div class="box"><div class="label">معرّف الدخول</div><div class="value ltr">${card.login_identifier}</div></div>
            <div class="box"><div class="label">كلمة المرور المؤقتة</div><div class="value ltr">${card.temporary_password}</div></div>
          </div>
          <div class="box"><div class="label">تعليمات الدخول</div><ol>${instructions}</ol></div>
        </div>
        ${autoPrint ? "<script>window.print();</script>" : ""}
      </body>
    </html>
  `;
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

export default function StudentsPage() {
  const { profile, canAny, isReadOnlyPath } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManageStudents = canAny(["add_students", "edit_students", "delete_students"]);
  const isReadOnlyView = isReadOnlyPath("/students") || !canManageStudents;
  // No local setPagedStudents needed - hook manages
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
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
  const [showImport, setShowImport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const [form, setForm] = useState({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});
  const [editForm, setEditForm] = useState({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});

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
    async (from: number, to: number): Promise<PagedFetchResult<StudentWithFees>> => {
    if (!profile) return { data: [], count: 0, error: null };
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) return { data: [], count: 0, error: null };
    
    let query = supabase
      .from("students")
      .select("*", { count: 'exact', head: false })
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    // Tab filter
    if (activeTab === "active") {
      query = query.in("status", ["active", "graduated", "archived", "withdrawn"]);
    } else {
      query = query.eq("status", activeTab);
    }

    // Search
    if (debouncedSearch) {
      query = query.or(`full_name.ilike.%${debouncedSearch}%,class_name.ilike.%${debouncedSearch}%`);
    }

    // Class filter
    if (filterClass) {
      query = query.eq("class_name", filterClass);
    }

    // Section filter
    if (filterSection) {
      query = query.eq("section", filterSection);
    }

      const { data, count, error } = await query.range(from, to);
      const typedData: StudentWithFees[] = ((data ?? []) as Student[]).map((student) => ({
        ...student,
        remaining_fee: student.total_fee - student.paid_fee - student.discount_value,
      }));
      return { data: typedData, count: count || 0, error };
    },
    [profile, schoolScope.selectedSchoolId, activeTab, debouncedSearch, filterClass, filterSection],
  );

  const { rows, totalCount, error: pagedError, loading: pagedLoading, reload } = usePagedSupabaseList<StudentWithFees>({
    enabled: Boolean(profile && !schoolScope.scopeLoading),
    page,
    pageSize,
    fetchPage: fetchPagedStudents,
  });

  const pagedStudents: StudentWithFees[] = rows || [];

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));
    setLoading(pagedLoading);
  }, [totalCount, pageSize, pagedLoading]);

  // Reload on filters
  useEffect(() => {
    setPage(1);
    reload();
  }, [debouncedSearch, filterClass, filterSection, activeTab, reload]);

  const fetchClassFees = useCallback(async () => {
    if (!profile) return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setClassFees([]);
      return;
    }
    const { data } = await supabase.from("class_fees").select("*").eq("school_id", schoolId).order("class_name", { ascending: true });
    setClassFees(data || []);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    void fetchClassFees();
  }, [fetchClassFees]);

  async function getSchoolBranch(){
    return resolveSchoolBranchForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }

  async function handleAdd(e:React.FormEvent){
    if (!canManageStudents) {
      setError("ليس لديك صلاحية لتعديل بيانات الطلاب");
      return;
    }
    e.preventDefault(); setSaving(true); setError("");
    const {school_id}=await getSchoolBranch();
    if(!school_id){setError("يجب إضافة مدرسة وفرع أولاً");setSaving(false);return;}
    const response = await fetch("/api/dashboard/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      setSuccess("تم إضافة الطالب وإنشاء حساب التطبيق ✓");setShowModal(false);
      setAccountCard((payload?.accountCard as ManagedUserAccountCard | null) ?? null);
      setForm({full_name:"",class_name:"",section:"",phone:"",address:"",total_fee:"",paid_fee:"",discount_value:"",status:"active"});
      reload(); setTimeout(()=>setSuccess(""),4000);
    }
    setSaving(false);
  }

  async function handleEdit(e:React.FormEvent){
    if (!canManageStudents) {
      setError("ليس لديك صلاحية لتعديل بيانات الطلاب");
      return;
    }
    e.preventDefault(); if(!selectedStudent)return; setSaving(true);
    const {error}=await supabase.from("students").update({
      full_name:editForm.full_name,class_name:editForm.class_name,section:editForm.section||"",
      phone:editForm.phone||null,address:editForm.address||null,
      total_fee:parseInt(editForm.total_fee)||0,
      paid_fee:parseInt(editForm.paid_fee)||0,
      discount_value:parseInt(editForm.discount_value)||0,
      status:editForm.status
    }).eq("id",selectedStudent.id);
    if(error)setError("خطأ: "+error.message);
    else{setSuccess("تم تحديث البيانات ✓");setShowEdit(false);reload();setTimeout(()=>setSuccess(""),3000);}
    setSaving(false);
  }

  async function changeStatus(student: StudentWithFees, status: StudentStatus, msg: string){
    if (!canManageStudents) {
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
    if (!canManageStudents) {
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

  async function exportExcel(data: StudentWithFees[]){
    const XLSX = await loadXLSX();
    const rows=data.map(s=>({
      "الاسم":s.full_name,"الصف":s.class_name,"الشعبة":s.section||"",
      "العنوان":s.address||"",
      "الهاتف":s.phone||"",
      "إجمالي الرسوم":s.total_fee,"المدفوع":s.paid_fee,"المتبقي":s.remaining_fee,
      "الحالة":statusMap[s.status]?.label||s.status
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"الطلاب");
    XLSX.writeFile(wb,`طلاب_${activeTab}_${formatDate(new Date())}.xlsx`);
  }

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
    const classLine = [s.class_name, s.section ? `الشعبة ${s.section}` : null].filter(Boolean).join(" • ");
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
            <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">العنوان</div>
            <div style="font-size: 16px; font-weight: 700;">${s.address || "—"}</div>
          </div>
          <div class="info-box" style="border: 1px solid #e2e8f0; background: #f8fbff; border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">الهاتف</div>
            <div style="font-size: 16px; font-weight: 700; direction: ltr;">${s.phone || "—"}</div>
          </div>
          <div class="info-box fees" style="border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #0369a1; margin-bottom: 0.5rem; font-weight: 600;">إجمالي الرسوم</div>
            <div style="font-size: 20px; font-weight: 900; color: #0c4a6e;">د.ع ${formatNumber(s.total_fee)}</div>
          </div>
          <div class="info-box paid" style="border: 1px solid #dcfce7; background: linear-gradient(135deg, #f0fdf4, #d1fae5); border-radius: 16px; padding: 1.2rem;">
            <div style="font-size: 13px; color: #166534; margin-bottom: 0.5rem; font-weight: 600;">مدفوع / متبقي</div>
            <div style="font-size: 18px; font-weight: 800;">
              <span style="color: #059669;">د.ع ${formatNumber(s.paid_fee)}</span> / 
              <span style="color: ${s.remaining_fee > 0 ? '#dc2626' : '#059669'}; font-weight: 900;">د.ع ${formatNumber(s.remaining_fee)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  w.document.write(`
    <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>قائمة الطلاب المطبوعة (${students.length} طالب)</title>
        <style>
          @page { margin: 1.5cm; size: A4; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            margin: 0; 
            padding: 2rem; 
            background: #eef4fb; 
            color: #112338; 
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 2.5rem; 
            padding-bottom: 1.5rem; 
            border-bottom: 3px solid #4C2F9E; 
          }
          .header h1 { 
            font-size: 28px; 
            font-weight: 900; 
            color: #4C2F9E; 
            margin: 0 0 0.5rem 0; 
          }
          .header p { 
            font-size: 16px; 
            color: #6B7280; 
            margin: 0; 
            font-weight: 600; 
          }
          .summary { 
            background: white; 
            border-radius: 20px; 
            padding: 1.5rem; 
            margin-bottom: 2rem; 
            box-shadow: 0 8px 24px rgba(15,23,42,0.08); 
            text-align: center; 
          }
          .summary-stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 1rem; 
            margin-top: 1rem; 
          }
          .stat-box { 
            background: linear-gradient(135deg, #EDE8FA, #E0D8F8); 
            border-radius: 16px; 
            padding: 1rem; 
          }
          .stat-label { 
            font-size: 13px; 
            color: #6C4AB6; 
            margin-bottom: 0.3rem; 
            font-weight: 600; 
          }
          .stat-value { 
            font-size: 20px; 
            font-weight: 900; 
            color: #4C2F9E; 
          }
          .print-footer { 
            margin-top: 3rem; 
            padding-top: 2rem; 
            border-top: 2px dashed #e5e7eb; 
            text-align: center; 
            color: #9CA3AF; 
            font-size: 13px; 
          }
          @media print {
            body { background: white !important; padding: 1cm !important; }
            .student-card { page-break-inside: avoid; margin-bottom: 1.5cm; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>قائمة الطلاب</h1>
          <p>تم الطباعة في ${formatDate(new Date().toLocaleString('ar-IQ'))} | ${students.length} طالب فلتر مجتمع</p>
        </div>
        <div class="summary">
          <p style="font-size: 16px; font-weight: 700; margin-bottom: 1rem;">ملخص الطلاب المختارين:</p>
          <div class="summary-stats">
            <div class="stat-box">
              <div class="stat-label">إجمالي الطلاب</div>
              <div class="stat-value">${students.length}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">إجمالي الرسوم</div>
	              <div class="stat-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.total_fee || 0), 0))}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">المتبقي الكلي</div>
	              <div class="stat-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.remaining_fee || 0), 0))}</div>
            </div>
          </div>
        </div>
        ${cardsHtml}
        <div class="print-footer">
          <p>تم إنشاء هذه القائمة من نظام إدارة المدرسة | بيانات الحالة: ${formatDate(new Date())}</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
}

function handlePrint(s: StudentWithFees){
  setError("");
  const w=window.open("","_blank");
  if(!w){ setError("يرجى السماح بالنوافذ المنبثقة للطباعة"); return; }
  w.document.write(`<html dir="rtl"><head><title>بيانات الطالب</title><style>body{font-family:var(--font-manrope),Segoe UI,sans-serif;padding:2rem}h2{color:#4C2F9E}.r{margin:.5rem 0}b{min-width:150px;display:inline-block}</style></head><body><h2>بيانات الطالب</h2><hr/><div class="r"><b>الاسم:</b>${s.full_name}</div><div class="r"><b>الصف:</b>${s.class_name}</div><div class="r"><b>الشعبة:</b>${s.section||"—"}</div><div class="r"><b>العنوان:</b>${s.address||"—"}</div><div class="r"><b>الهاتف:</b>${s.phone||"—"}</div><div class="r"><b>إجمالي الرسوم:</b>د.ع ${formatNumber(s.total_fee)}</div><div class="r"><b>المدفوع:</b>د.ع ${formatNumber(s.paid_fee)}</div><div class="r"><b>المتبقي:</b>د.ع ${formatNumber(s.remaining_fee)}</div><script>window.print();window.close();</script></body></html>`);
}

  function openAccountCardWindow(card: ManagedUserAccountCard, autoPrint = true){
    const w=window.open("","_blank");
    if(!w){ setError("يرجى السماح بالنوافذ المنبثقة لعرض بطاقة الحساب"); return; }
    w.document.open();
    w.document.write(buildPrintableCardHtml(card, autoPrint));
    w.document.close();
  }

  async function copyAccountCardCredentials(){
    if(!accountCard) return;
    await navigator.clipboard.writeText(`معرّف الدخول: ${accountCard.login_identifier}\nكلمة المرور المؤقتة: ${accountCard.temporary_password}`);
    setSuccess("تم نسخ بيانات الدخول المؤقتة"); setTimeout(()=>setSuccess(""),3000);
  }

  async function openStudentCredentialsCard(student: StudentWithFees){
    if (!student?.auth_user_id) {
      setError("لا يوجد حساب تطبيق مرتبط بهذا الطالب حتى الآن.");
      return;
    }

    setError("");
    const { school_id } = await getSchoolBranch();
    if (!school_id) {
      setError("يجب تحديد مدرسة قبل عرض بطاقة الدخول.");
      return;
    }

    try {
      const cardResponse = await fetch(
        `/api/dashboard/users/${student.auth_user_id}/card?schoolId=${encodeURIComponent(school_id)}`,
        { cache: "no-store" },
      );
      const cardPayload = await cardResponse.json().catch(() => null);

      if (cardResponse.ok && cardPayload?.accountCard) {
        setAccountCard(cardPayload.accountCard as ManagedUserAccountCard);
        return;
      }

      const resetResponse = await fetch(`/api/dashboard/users/${student.auth_user_id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_id }),
      });
      const resetPayload = await resetResponse.json().catch(() => null);

      if (!resetResponse.ok || !resetPayload?.accountCard) {
        throw new Error(
          readApiError(
            resetPayload ?? cardPayload,
            "تعذر فتح بطاقة الدخول لهذا الطالب. تأكد من ربط حساب التطبيق أولاً.",
          ),
        );
      }

      setAccountCard(resetPayload.accountCard as ManagedUserAccountCard);
      setSuccess("تم فتح بطاقة الدخول وتوليد كلمة مرور مؤقتة جديدة بأمان.");
      setTimeout(()=>setSuccess(""),3000);
    } catch (credentialsError) {
      setError(credentialsError instanceof Error ? credentialsError.message : "تعذر فتح بطاقة الدخول.");
    }
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

  function handleFileChange(e:React.ChangeEvent<HTMLInputElement>){
    setImportError(""); setImportPreview([]);
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try{
        const XLSX = await loadXLSX();
        const wb=XLSX.read(ev.target?.result,{type:"binary"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const data:any[]=XLSX.utils.sheet_to_json(ws);
        if(!data.length){setImportError("الملف فارغ");return;}
        if(!Object.keys(data[0]).includes("اسم الطالب")){setImportError("عمود 'اسم الطالب' مطلوب");return;}
        setImportPreview(data.slice(0,5));
      }catch{setImportError("خطأ في قراءة الملف");}
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport(){
    if (!canManageStudents) {
      setImportError("ليس لديك صلاحية استيراد البيانات");
      return;
    }
    const file=fileRef.current?.files?.[0]; if(!file)return;
    setImporting(true);
    const {school_id,branch_id}=await getSchoolBranch();
    if(!school_id||!branch_id){setImportError("يجب إضافة مدرسة وفرع أولاً");setImporting(false);return;}
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const XLSX = await loadXLSX();
      const wb=XLSX.read(ev.target?.result,{type:"binary"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data:any[]=XLSX.utils.sheet_to_json(ws);
      const rows=data.map((r:any)=>({
        school_id,branch_id,full_name:r["اسم الطالب"]||"",class_name:r["الصف"]||"",
        phone:r["الهاتف"]?.toString()||null,address:r["العنوان"]||null,
        total_fee:parseInt(r["إجمالي الرسوم"])||0,paid_fee:parseInt(r["المدفوع"])||0,
        discount_value:0,status:"active"
      })).filter(r=>r.full_name);
      const {error}=await supabase.from("students").insert(rows);
      if(error)setImportError("خطأ: "+error.message);
      else{
        setSuccess(`تم استيراد ${rows.length} طالب ✓`);
        setShowImport(false);setImportPreview([]);
        if(fileRef.current)fileRef.current.value="";
        reload();setTimeout(()=>setSuccess(""),4000);
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  }

  async function downloadTemplate(){
    const XLSX = await loadXLSX();
    const ws=XLSX.utils.aoa_to_sheet([
      ["اسم الطالب","الصف","العنوان","الهاتف","إجمالي الرسوم","المدفوع"],
      ["أحمد محمد علي","الصف الخامس - أ","بغداد","07701234567","500000","0"],
    ]);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"الطلاب");
    XLSX.writeFile(wb,"نموذج_الطلاب.xlsx");
  }

  const statusMap: Record<StudentStatus, {label: string, color: string, bg: string}> = {
    active:      {label:"نشط",    color:"#065F46",bg:"#D1FAE5"},
    transferred: {label:"منقول",  color:"#92400E",bg:"#FEF3C7"},
    graduated:   {label:"متخرج",  color:"#1E40AF",bg:"#DBEAFE"},
    withdrawn:   {label:"منسحب",  color:"#991B1B",bg:"#FEE2E2"},
    archived:    {label:"مؤرشف",  color:"#374151",bg:"#F3F4F6"},
    suspended:   {label:"موقوف",  color:"#7C2D12",bg:"#FEF3C7"},
    deleted:     {label:"محذوف",  color:"#6B7280",bg:"#F3F4F6"},
  };

  // Paged data already filtered server-side
  const tabStudents = pagedStudents;

  // فلترة حسب البحث والصف والشعبة
  const classes = Array.from(new Set(tabStudents.map((s) => s.class_name))).filter(Boolean) as string[];
  const students = tabStudents;

  // استخراج الشعب من بيانات الطلاب حسب الصف المختار
  const sectionsSource = filterClass ? tabStudents.filter(s=>s.class_name===filterClass) : tabStudents;
  const sectionsList = Array.from(new Set(sectionsSource.map((s) => s.section).filter(Boolean))) as string[];

  const filtered = tabStudents.filter(s=>{
    const matchSearch = s.full_name?.includes(search) || s.class_name?.includes(search);
    const matchClass  = filterClass ? s.class_name === filterClass : true;
    const matchSection = filterSection ? s.section === filterSection : true;
    return matchSearch && matchClass && matchSection;
  });

  // خيارات كل تبويب
  function getActions(s: StudentWithFees){
    if (isReadOnlyView) {
      return [
        { icon: "🔐", label: "بطاقة الدخول", fn: () => { void openStudentCredentialsCard(s); setActiveMenu(null); } },
        { icon: "🖨️", label: "طباعة", fn: () => { handlePrint(s); setActiveMenu(null); } },
      ];
    }

    if(activeTab==="active") return [
      {icon:"🔐",label:"بطاقة الدخول",fn:()=>{void openStudentCredentialsCard(s);setActiveMenu(null)}},
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      {icon:"📦",label:"نقل الطالب",fn:()=>{changeStatus(s,"transferred","تم نقل الطالب ✓");setActiveMenu(null)}},
      {icon:"⏸️",label:"توقيف الطالب",fn:()=>{changeStatus(s,"suspended","تم توقيف الطالب ✓");setActiveMenu(null)}},
      {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
      {sep:true},
      {icon:"🗑️",label:"حذف",danger:true,fn:()=>{setSelectedStudent(s);setShowDeleteConfirm(true);setActiveMenu(null)}},
    ];
    if(activeTab==="transferred") return [
      {icon:"🔐",label:"بطاقة الدخول",fn:()=>{void openStudentCredentialsCard(s);setActiveMenu(null)}},
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      {icon:"↩️",label:"استعادة الطالب",fn:()=>{changeStatus(s,"active","تم استعادة الطالب ✓");setActiveMenu(null)}},
      {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
    ];
    if(activeTab==="suspended") return [
      {icon:"🔐",label:"بطاقة الدخول",fn:()=>{void openStudentCredentialsCard(s);setActiveMenu(null)}},
      {icon:"🖨️",label:"طباعة",fn:()=>{handlePrint(s);setActiveMenu(null)}},
      {icon:"↩️",label:"إعادة التفعيل",fn:()=>{changeStatus(s,"active","تم تفعيل الطالب ✓");setActiveMenu(null)}},
      {icon:"✏️",label:"تعديل",fn:()=>openEdit(s)},
    ];
    if(activeTab==="deleted") return [
      {icon:"↩️",label:"استعادة الطالب",fn:()=>{changeStatus(s,"active","تم استعادة الطالب ✓");setActiveMenu(null)}},
    ];
    return [];
  }

  return(
  <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
  <>
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280;}
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
      .srch input{width:100%;padding:.55rem 2.1rem .55rem .8rem;background:white;border:1px solid rgba(108,74,182,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none}
      .srch input:focus{border-color:var(--p3)}
      .filter-sel{padding:.55rem .8rem;background:white;border:1px solid rgba(108,74,182,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;outline:none;color:var(--dark)}
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
      .fi,.fs{padding:.65rem .85rem;background:#F8F6FF;border:1.5px solid rgba(108,74,182,0.12);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none}
      .fi:focus,.fs:focus{border-color:var(--p3);background:white}
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
    `}</style>

    <div className="layout">
      <AppSidebar currentPath="/students" />

      <div className="main">
        <div className="topbar">
          <div>
          <div className="topbar-title">إدارة الطلاب</div>
            <div className="topbar-sub">{totalCount} طالب إجمالي | صفحة {page} من {totalPages}</div>
          </div>
        </div>

        <div className="content">
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
          <SchoolScopeBanner scope={schoolScope} />
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
                  const count=students.filter(s=>{
                    if(tab.id==="active") return s.status==="active"||s.status==="graduated"||s.status==="archived"||s.status==="withdrawn";
                    return s.status===tab.id;
                  }).length;
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
                    ["إجمالي الطلاب",formatNumber(tabStudents.length)],
                    ["الطلاب النشطون",formatNumber(tabStudents.filter(s=>s.status==="active").length)],
                    ["إجمالي الرسوم",`د.ع ${formatNumber(tabStudents.reduce((a,s)=>a+s.total_fee,0))}`],
                    ["الرصيد المتبقي",`د.ع ${formatNumber(tabStudents.reduce((a,s)=>a+s.remaining_fee,0))}`],
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
                <button className="btn-export" onClick={()=>exportExcel(filtered)}><AppIcon token="📤" size={14} />تصدير إكسل</button>
                <button className="btn-print" onClick={()=>printFilteredStudents(filtered)}><AppIcon token="🖨️" size={14} />طباعة الطلاب المفلترين</button>
                {activeTab==="active" && !isReadOnlyView && <>
                  <button className="btn-excel" onClick={()=>setShowImport(true)}><AppIcon token="📊" size={14} />استيراد إكسل</button>
                  <button className="btn-add" onClick={()=>setShowModal(true)}>+ إضافة طالب</button>
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
                      ? activeTab === "active" && !isReadOnlyView 
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
                          const st=statusMap[s.status]||statusMap.active;
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

    {/* MODAL إضافة */}
    {!isReadOnlyView && showModal&&(
      <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
        <div className="modal">
          <div className="mh"><div className="mt">إضافة طالب جديد</div><button className="mc" onClick={()=>setShowModal(false)}><AppIcon token="✕" size={13} /></button></div>
          {error&&<div className="err">{error}</div>}
          <form onSubmit={handleAdd}>
            <div className="fg">
              <div className="ff full"><label className="fl">اسم الطالب *</label><input className="fi" required placeholder="أحمد محمد علي" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></div>
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
              <div className="ff"><label className="fl">العنوان *</label><input className="fi" required placeholder="بغداد - الكرخ" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
              <div className="ff"><label className="fl">الهاتف <span className="opt">(اختياري)</span></label><input className="fi" placeholder="07XXXXXXXXX" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              <div className="ff">
                <label className="fl">إجمالي الرسوم (د.ع) *
                  {form.class_name&&classFees.find(x=>x.class_name===form.class_name)&&(
                    <span className="opt"> — تلقائي من الصف</span>
                  )}
                </label>
                <input className="fi" type="number" required placeholder="500000" value={form.total_fee} onChange={e=>setForm({...form,total_fee:e.target.value})}/>
              </div>
              <div className="ff"><label className="fl">المدفوع مسبقاً <span className="opt">(اختياري)</span></label><input className="fi" type="number" placeholder="0" value={form.paid_fee} onChange={e=>setForm({...form,paid_fee:e.target.value})}/></div>
              <div className="ff">
                <label className="fl">التخفيض (د.ع) <span className="opt">(اختياري)</span></label>
                <input className="fi" type="number" placeholder="0" value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})}/>
                {form.discount_value&&parseInt(form.discount_value)>0&&form.total_fee&&parseInt(form.total_fee)>0&&(
                  <div style={{background:"#FEF3C7",borderRadius:7,padding:".35rem .6rem",marginTop:".35rem",fontSize:".7rem",color:"#92400E",fontWeight:700}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}><AppIcon token="✂️" size={12} /> بعد الخصم: د.ع {(parseInt(form.total_fee)-parseInt(form.discount_value)).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="fa">
              <button type="submit" className="bs" disabled={saving}>{saving?"جارٍ الحفظ...":"حفظ الطالب"}</button>
              <button type="button" className="bc" onClick={()=>setShowModal(false)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* MODAL تعديل */}
    {!isReadOnlyView && showEdit&&selectedStudent&&(
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
    {!isReadOnlyView && showDeleteConfirm&&selectedStudent&&(
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
    {!isReadOnlyView && showImport&&(
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
            <div style={{fontSize:".75rem",color:"var(--gray)"}}>xlsx أو xls</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleFileChange}/>
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
