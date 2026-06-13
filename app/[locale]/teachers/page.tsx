"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useBranchScope } from "@/hooks/useBranchScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Button } from "@/components/ui/button";
import { GraduationCap, FileSpreadsheet, CreditCard, Plus } from "@/lib/icons";
import { TeacherExportFieldsModal, type TeacherExportFieldKey } from "./_components/TeacherExportFieldsModal";
import { TeachersStats } from "./_components/TeachersStats";
import { TeachersFilters } from "./_components/TeachersFilters";
import { TeachersTable } from "./_components/TeachersTable";
import { TeacherFormModal } from "./_components/TeacherFormModal";
import { TeacherAccountsModal } from "./_components/TeacherAccountsModal";
import { useTeachersData } from "./_hooks/useTeachersData";
import type { TeacherRecord, TeacherFormData } from "./_types";

export default function TeachersPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const isEn = locale === "en";

  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);

  const canManage = can("manage_teachers");

  const {
    teachers,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    subjectFilter,
    setSubjectFilter,
    refetch,
    saveTeacher,
    deleteTeacher,
  } = useTeachersData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeacherRecord | null>(null);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const handlePrint = async (teacher: TeacherRecord) => {
    const QRCode = (await import("qrcode")).default;
    const qrSrc = teacher.app_username && teacher.app_password_plain
      ? await QRCode.toDataURL(JSON.stringify({ u: teacher.app_username, p: teacher.app_password_plain }), { width: 140, margin: 1 })
      : "";
    const initials = teacher.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
    const isEn = locale === "en";
    const html = `<!DOCTYPE html><html dir="${isEn ? "ltr" : "rtl"}"><head><meta charset="utf-8"><title>${teacher.full_name}</title><style>body{margin:0;padding:20px;font-family:system-ui,sans-serif;background:#f8fafc}.card{width:148mm;min-height:105mm;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 16px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px}.header{display:flex;align-items:center;gap:8px;border-bottom:1px solid #f1f5f9;padding-bottom:8px}.logo{width:32px;height:32px;border-radius:6px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:900}.school-name{font-size:13px;font-weight:700;color:#334155}.badge{margin-inline-start:auto;font-size:9px;font-weight:600;color:#94a3b8;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px}.body{display:flex;gap:12px;align-items:flex-start;flex:1}.avatar{width:52px;height:52px;border-radius:10px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900;border:2px solid #e2e8f0;flex-shrink:0}.info{flex:1}.name{font-size:15px;font-weight:900;color:#0f172a;margin-bottom:4px}.emp-id{display:inline-block;font-size:10px;font-weight:700;color:#6366f1;background:#ede9fe;border-radius:4px;padding:2px 7px;margin-bottom:4px}.meta{font-size:11px;color:#64748b;font-weight:600;margin-bottom:2px}.meta span{color:#334155}.qr img{width:72px;height:72px;border:1px solid #e2e8f0;border-radius:6px}.creds{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px}.cred-label{font-size:9px;font-weight:700;color:#94a3b8;margin-bottom:2px}.cred-value{font-size:12px;font-weight:700;color:#0f172a;direction:ltr;text-align:start}@media print{body{padding:0}}</style></head><body><div class="card"><div class="header"><div class="logo">${"م"}</div><div class="school-name">${isEn ? "School" : "المدرسة"}</div><div class="badge">${isEn ? "Teacher Card" : "بطاقة أستاذ"}</div></div><div class="body"><div class="avatar">${initials}</div><div class="info"><div class="name">${teacher.full_name}</div>${teacher.employee_id ? `<div class="emp-id">${teacher.employee_id}</div>` : ""}${teacher.subject ? `<div class="meta">${isEn ? "Subject" : "المادة"}: <span>${teacher.subject}</span></div>` : ""}${teacher.job_title ? `<div class="meta">${isEn ? "Title" : "المسمى"}: <span>${teacher.job_title}</span></div>` : ""}</div>${qrSrc ? `<div class="qr"><img src="${qrSrc}" alt="QR"/></div>` : ""}</div>${teacher.app_username ? `<div class="creds"><div><div class="cred-label">${isEn ? "USERNAME" : "اسم المستخدم"}</div><div class="cred-value">${teacher.app_username}</div></div><div><div class="cred-label">${isEn ? "PASSWORD" : "كلمة المرور"}</div><div class="cred-value">${teacher.app_password_plain ?? "—"}</div></div></div>` : ""}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) { win.addEventListener("load", () => { win.print(); }); }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handlePrintInfo = (teacher: TeacherRecord) => {
    const isEnLocal = locale === "en";
    const fmt = (val: string | null | undefined) => val || "—";
    const fmtDate = (val: string | null | undefined) => {
      if (!val) return "—";
      try { return new Date(val).toLocaleDateString(isEnLocal ? "en-GB" : "ar-IQ-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }); }
      catch { return val; }
    };
    const genderLabel = (g: string | null) => {
      if (!g) return "—";
      if (isEnLocal) return g === "male" ? "Male" : "Female";
      return g === "male" ? "ذكر" : "أنثى";
    };
    const contractLabel = (c: string | null) => {
      if (!c) return "—";
      if (isEnLocal) return c.replace("_", " ");
      const map: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", substitute: "بديل", volunteer: "متطوع" };
      return map[c] ?? c;
    };
    const maritalLabel = (m: string | null) => {
      if (!m) return "—";
      if (isEnLocal) return m;
      const map: Record<string, string> = { single: "أعزب", married: "متزوج", divorced: "مطلق", widowed: "أرمل" };
      return map[m] ?? m;
    };
    const initials = teacher.full_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

    const html = `<!DOCTYPE html>
<html dir="${isEnLocal ? "ltr" : "rtl"}" lang="${isEnLocal ? "en" : "ar"}">
<head>
<meta charset="utf-8">
<title>${teacher.full_name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${isEnLocal ? "system-ui,sans-serif" : "'Noto Sans Arabic',system-ui,sans-serif"};background:#f1f5f9;color:#1e293b;direction:${isEnLocal ? "ltr" : "rtl"};padding:24px}
  .page{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  /* Header */
  .hero{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#9333ea 100%);padding:24px 28px 40px;display:flex;align-items:center;gap:16px}
  .avatar{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.2);border:3px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;flex-shrink:0;overflow:hidden}
  .avatar img{width:100%;height:100%;object-fit:cover}
  .hero-info{flex:1}
  .hero-name{font-size:20px;font-weight:900;color:#fff;margin-bottom:4px}
  .hero-meta{font-size:12px;color:rgba(255,255,255,0.75);display:flex;flex-wrap:wrap;gap:8px 16px}
  .hero-badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;color:#fff}
  /* Body */
  .body{padding:24px 28px;margin-top:-20px;position:relative}
  .section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px}
  .section-title{font-size:11px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;display:flex;align-items:center;gap:6px}
  .section-title::after{content:'';flex:1;height:1px;background:#e0e7ff}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
  .field{display:flex;flex-direction:column;gap:2px}
  .label{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px}
  .value{font-size:12px;font-weight:600;color:#334155}
  /* Print */
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
  <div class="hero">
    <div class="avatar">${teacher.photo ? `<img src="${teacher.photo}" alt="">` : initials}</div>
    <div class="hero-info">
      <div class="hero-name">${teacher.full_name}</div>
      <div class="hero-meta">
        ${teacher.employee_id ? `<span class="hero-badge"># ${teacher.employee_id}</span>` : ""}
        ${teacher.subject ? `<span>${isEnLocal ? "Subject" : "المادة"}: ${teacher.subject}</span>` : ""}
        ${teacher.job_title ? `<span>${isEnLocal ? "Title" : "المسمى"}: ${teacher.job_title}</span>` : ""}
      </div>
    </div>
  </div>
  <div class="body">

    <!-- Personal Info -->
    <div class="section">
      <div class="section-title">${isEnLocal ? "Personal Information" : "المعلومات الشخصية"}</div>
      <div class="grid2">
        <div class="field"><span class="label">${isEnLocal ? "Phone" : "الهاتف"}</span><span class="value" dir="ltr">${fmt(teacher.phone)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Email" : "البريد الإلكتروني"}</span><span class="value" dir="ltr">${fmt(teacher.email)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Gender" : "الجنس"}</span><span class="value">${genderLabel(teacher.gender)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Date of Birth" : "تاريخ الميلاد"}</span><span class="value">${fmtDate(teacher.date_of_birth)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Nationality" : "الجنسية"}</span><span class="value">${fmt(teacher.nationality)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Marital Status" : "الحالة الاجتماعية"}</span><span class="value">${maritalLabel(teacher.marital_status)}</span></div>
      </div>
    </div>

    <!-- Work Info -->
    <div class="section">
      <div class="section-title">${isEnLocal ? "Work Information" : "معلومات الوظيفة"}</div>
      <div class="grid2">
        <div class="field"><span class="label">${isEnLocal ? "Contract Type" : "نوع العقد"}</span><span class="value">${contractLabel(teacher.contract_type)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Hire Date" : "تاريخ التعيين"}</span><span class="value">${fmtDate(teacher.hire_date)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Years of Experience" : "سنوات الخبرة"}</span><span class="value">${teacher.years_experience != null ? (isEnLocal ? `${teacher.years_experience} years` : `${teacher.years_experience} سنة`) : "—"}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Subject" : "المادة"}</span><span class="value">${fmt(teacher.subject)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Specialization" : "التخصص"}</span><span class="value">${fmt(teacher.specialization)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Job Title" : "المسمى الوظيفي"}</span><span class="value">${fmt(teacher.job_title)}</span></div>
      </div>
    </div>

    <!-- Qualification -->
    <div class="section">
      <div class="section-title">${isEnLocal ? "Qualification" : "المؤهل العلمي"}</div>
      <div class="grid2">
        <div class="field"><span class="label">${isEnLocal ? "Degree" : "الشهادة"}</span><span class="value">${fmt(teacher.qualification)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "University" : "الجامعة"}</span><span class="value">${fmt(teacher.university)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Graduation Year" : "سنة التخرج"}</span><span class="value">${teacher.graduation_year ?? "—"}</span></div>
      </div>
    </div>

    <!-- Emergency Contact -->
    ${(teacher.emergency_contact_name || teacher.emergency_contact_phone) ? `
    <div class="section">
      <div class="section-title">${isEnLocal ? "Emergency Contact" : "جهة الطوارئ"}</div>
      <div class="grid2">
        <div class="field"><span class="label">${isEnLocal ? "Name" : "الاسم"}</span><span class="value">${fmt(teacher.emergency_contact_name)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Phone" : "الهاتف"}</span><span class="value" dir="ltr">${fmt(teacher.emergency_contact_phone)}</span></div>
        <div class="field"><span class="label">${isEnLocal ? "Relation" : "الصلة"}</span><span class="value">${fmt(teacher.emergency_contact_relation)}</span></div>
      </div>
    </div>` : ""}

  </div>
</div>
<script>window.addEventListener("load",()=>{window.print();})</script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleExcelExport = async (fields: Set<TeacherExportFieldKey>) => {
    setExportLoading(true);
    try {
      const { downloadExcelExport } = await import("@/lib/excel-client");
      const isEnLocal = locale === "en";
      const contractLabel = (c: string | null) => {
        if (!c) return "";
        if (isEnLocal) return c.replace("_", " ");
        const map: Record<string, string> = { full_time: "دوام كامل", part_time: "دوام جزئي", substitute: "بديل", volunteer: "متطوع" };
        return map[c] ?? c;
      };
      const genderLabel = (g: string | null) => {
        if (!g) return "";
        if (isEnLocal) return g === "male" ? "Male" : "Female";
        return g === "male" ? "ذكر" : "أنثى";
      };
      const statusLabel = (s: string) => {
        if (isEnLocal) return s;
        const map: Record<string, string> = { active: "فعّال", on_leave: "إجازة", suspended: "موقوف", resigned: "مستقيل", terminated: "منتهي" };
        return map[s] ?? s;
      };

      const allColumns: Array<{ header: string; key: string; width: number; fieldKey: TeacherExportFieldKey }> = [
        { header: isEnLocal ? "Employee ID" : "رقم الموظف", key: "employeeId", width: 14, fieldKey: "employeeId" },
        { header: isEnLocal ? "Full Name" : "الاسم الكامل", key: "fullName", width: 28, fieldKey: "fullName" },
        { header: isEnLocal ? "Subject" : "المادة", key: "subject", width: 16, fieldKey: "subject" },
        { header: isEnLocal ? "Job Title" : "المسمى الوظيفي", key: "jobTitle", width: 18, fieldKey: "jobTitle" },
        { header: isEnLocal ? "Contract Type" : "نوع العقد", key: "contractType", width: 14, fieldKey: "contractType" },
        { header: isEnLocal ? "Phone" : "الهاتف", key: "phone", width: 14, fieldKey: "phone" },
        { header: isEnLocal ? "Email" : "البريد", key: "email", width: 24, fieldKey: "email" },
        { header: isEnLocal ? "Gender" : "الجنس", key: "gender", width: 10, fieldKey: "gender" },
        { header: isEnLocal ? "Hire Date" : "تاريخ التعيين", key: "hireDate", width: 14, fieldKey: "hireDate" },
        { header: isEnLocal ? "Years of Experience" : "سنوات الخبرة", key: "experience", width: 14, fieldKey: "experience" },
        { header: isEnLocal ? "Status" : "الحالة", key: "status", width: 12, fieldKey: "status" },
        { header: isEnLocal ? "App Account" : "حساب التطبيق", key: "appAccount", width: 16, fieldKey: "appAccount" },
      ];

      const columns = allColumns.filter(c => fields.has(c.fieldKey)).map(({ fieldKey: _, ...rest }) => rest);

      await downloadExcelExport({
        filename: isEnLocal ? "teachers.xlsx" : "الأساتذة.xlsx",
        sheets: [{
          name: isEnLocal ? "Teachers" : "الأساتذة",
          title: isEnLocal ? "Teachers List" : "قائمة الأساتذة",
          columns,
          rows: teachers.map((t) => ({
            employeeId: t.employee_id ?? "",
            fullName: t.full_name,
            subject: t.subject ?? "",
            jobTitle: t.job_title ?? "",
            contractType: contractLabel(t.contract_type),
            phone: t.phone ?? "",
            email: t.email ?? "",
            gender: genderLabel(t.gender),
            hireDate: t.hire_date ?? "",
            experience: t.years_experience ?? "",
            status: statusLabel(t.status),
            appAccount: t.app_username ?? "",
          })),
        }],
      });
      setShowExportModal(false);
    } finally {
      setExportLoading(false);
    }
  };

  const schoolId = schoolScope.selectedSchoolId ?? profile?.school_id ?? "";

  const subjects = useMemo(() => {
    const set = new Set(
      teachers.map((t) => t.subject).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [teachers]);

  const handleSave = async (form: TeacherFormData) => {
    setFormLoading(true);
    setFormError("");
    try {
      await saveTeacher(form, editingTeacher?.id ?? null);
      setShowForm(false);
      setEditingTeacher(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeacher(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // silently ignore — the hook already surfaces errors in its own state
    }
  };

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/teachers" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={isEn ? "Teachers" : "الأساتذة"}
            subtitle={
              isEn
                ? "Manage school teaching staff"
                : "إدارة الكادر التعليمي للمدرسة"
            }
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={isEn ? "Teachers" : "الأساتذة"}
                    description={
                      isEn
                        ? "Select a school to view teachers"
                        : "اختر مدرسة لعرض الأساتذة"
                    }
                  />
                </div>
              ) : (
                <div className="space-y-5">

                  {/* ── Hero Banner ── */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{
                      background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)",
                    }}
                  >
                    <div
                      className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none"
                      style={{ background: "white", transform: "translate(35%, -40%)" }}
                    />
                    <div
                      className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none"
                      style={{ background: "white", transform: "translateY(60%)" }}
                    />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                          {isEn ? "Administration · Staff" : "لوحة الإدارة · الكادر التعليمي"}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          {isEn ? "Teachers" : "الأساتذة"}
                        </h1>
                        <p className="text-white/70 text-sm mb-4">
                          {isEn
                            ? "Manage school teaching staff and accounts"
                            : "إدارة الكادر التعليمي وحساباتهم في المدرسة"}
                        </p>
                        {canManage && (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setShowExportModal(true)}
                              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.28)", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
                            >
                              <FileSpreadsheet size={14} />
                              {isEn ? "Export Excel" : "تصدير Excel"}
                            </button>
                            <button
                              onClick={() => setShowAccountsModal(true)}
                              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.28)", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
                            >
                              <CreditCard size={14} />
                              {isEn ? "Account Cards" : "بطاقات الحسابات"}
                            </button>
                            <button
                              onClick={() => { setEditingTeacher(null); setShowForm(true); }}
                              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold transition-all active:scale-95"
                              style={{ background: "#fff", color: "var(--primary)", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.92"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                            >
                              <Plus size={14} />
                              {isEn ? "Add Teacher" : "إضافة أستاذ"}
                            </button>
                          </div>
                        )}
                      </div>
                      <div
                        className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                      >
                        <GraduationCap size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* ── Stats ── */}
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TeachersStats teachers={teachers} locale={locale} />
                  </motion.div>

                  {/* ── Error Banner ── */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 py-3 rounded-xl bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] text-sm border border-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Filters + Table ── */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)]">
                      <TeachersFilters
                        search={search}
                        onSearchChange={setSearch}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        subjectFilter={subjectFilter}
                        onSubjectChange={setSubjectFilter}
                        subjects={subjects}
                        locale={locale}
                      />
                    </div>
                    <TeachersTable
                      teachers={teachers}
                      loading={loading}
                      canManage={canManage}
                      locale={locale}
                      onEdit={(t) => {
                        setEditingTeacher(t);
                        setShowForm(true);
                      }}
                      onDelete={(t) => setDeleteTarget(t)}
                      onPrint={handlePrint}
                      onPrintInfo={handlePrintInfo}
                    />
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

        {/* Account Cards Modal */}
        <TeacherAccountsModal
          show={showAccountsModal}
          teachers={teachers}
          locale={locale}
          schoolId={schoolId}
          onClose={() => setShowAccountsModal(false)}
          onAccountsGenerated={refetch}
        />

        <TeacherExportFieldsModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExcelExport}
          loading={exportLoading}
          locale={locale}
        />

        {/* Add / Edit Modal */}
        <TeacherFormModal
          show={showForm}
          editing={editingTeacher}
          loading={formLoading}
          error={formError}
          onConfirm={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingTeacher(null);
            setFormError("");
          }}
          locale={locale}
          schoolId={schoolId}
        />

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-xl p-6 max-w-sm w-full space-y-4">
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {isEn ? "Delete Teacher?" : "حذف المعلم؟"}
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {isEn
                  ? `Are you sure you want to delete ${deleteTarget.full_name}?`
                  : `هل تريد حذف ${deleteTarget.full_name}؟`}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  {isEn ? "Delete" : "حذف"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
