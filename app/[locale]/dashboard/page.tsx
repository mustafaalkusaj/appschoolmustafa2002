"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { ROLE_LABELS } from "@/lib/auth";
import { AnalysisSkeleton } from "@/components/skeleton";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school-context";
import { KpiMetricCard } from "@/components/dashboard/KpiMetricCard";
import styles from "./dashboard-redesign.module.css";

const DashboardFinanceCharts = dynamic(
  () => import("@/components/DashboardFinanceCharts").then((module) => module.DashboardFinanceCharts),
  {
    ssr: false,
    loading: () => <AnalysisSkeleton />,
  },
);

// ─── أنواع البيانات ───────────────────────────────────────────────────────────
interface ClassFee {
  id: string;
  class_name: string;
  total_fee: number;
  installments: number;
  installment_amount: number;
  notes: string;
  created_at: string;
}

function getAcademicYearLabel(date = new Date()) {
  const currentYear = date.getFullYear();
  const startYear = date.getMonth() >= 7 ? currentYear : currentYear - 1;
  const formatter = new Intl.NumberFormat("ar-IQ");
  return `${formatter.format(startYear)} - ${formatter.format(startYear + 1)}`;
}

export default function DashboardPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── حالة Modal الأقساط ───────────────────────────────────────────────────
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState({
    class_name: "",
    total_fee: "",
    installments: "4",
    notes: "",
  });
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSuccess, setFeeSuccess] = useState("");
  const [editingFee, setEditingFee] = useState<ClassFee | null>(null);
  const [showFeesTable, setShowFeesTable] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── حالة Manage classes and sections ─────────────────────────────────────────────
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [classForm, setClassForm] = useState({ name: "", sections: [""] });
  const [sectionForm, setSectionForm] = useState({ class_id: "", name: "" });
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [showSectionsTable, setShowSectionsTable] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);

  const fetchAll = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    setLoading(true);
    if (!schoolId) {
      setStudents([]);
      setPayments([]);
      setClassFees([]);
      setLoading(false);
      return;
    }

    // Parallel fetch for better performance
    const [studentsResult, paymentsResult, feesResult] = await Promise.all([
      // 1. Fetch students (optimized columns)
      supabase
        .from("students")
        .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", schoolId)
        .neq("status", "deleted"),
      
      // 2. Fetch recent payments only (Limit 5)
      supabase
        .from("payments")
        .select("id, amount, created_at, student_id")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5),

      // 3. Fetch class fees
      supabase
        .from("class_fees")
        .select("*")
        .eq("school_id", schoolId)
        .order("class_name", { ascending: true })
    ]);

    if (studentsResult.data) setStudents(studentsResult.data);
    if (paymentsResult.data) setPayments(paymentsResult.data);
    if (feesResult.data) setClassFees(feesResult.data);
    
    setLoading(false);
  }, [profile, schoolScope.selectedSchoolId]);

  // Optimized fetchClassFees is no longer needed separately in the main flow, 
  // but kept if called individually by other actions.
  const fetchClassFees = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setClassFees([]);
      return;
    }
    const { data } = await supabase
      .from("class_fees")
      .select("*")
      .eq("school_id", schoolId)
      .order("class_name", { ascending: true });
    
    if (data) setClassFees(data as ClassFee[]);
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchClasses = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setClasses([]);
      return;
    }
    let query = supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true });
    query = query.eq("school_id", schoolId);
    const { data } = await query;
    if (data) setClasses(data);
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchSections = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setSections([]);
      return;
    }
    let query = supabase
      .from("sections")
      .select("*, classes(name)")
      .order("name", { ascending: true });
    query = query.eq("school_id", schoolId);
    const { data } = await query;
    if (data) setSections(data);
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
    void fetchClasses();
    void fetchSections();
  }, [profile, schoolScope.scopeLoading, fetchAll, fetchClasses, fetchSections]);

  // ─── حفظ/تعديل سعر قسط الصف ─────────────────────────────────────────────
  async function handleSaveFee() {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    setFeeError("");
    setFeeSuccess("");
    if (!feeForm.class_name.trim()) { setFeeError("يرجى إدخال اسم الصف"); return; }
    if (!feeForm.total_fee || isNaN(Number(feeForm.total_fee)) || Number(feeForm.total_fee) <= 0) {
      setFeeError("يرجى إدخال المبلغ الكلي بشكل صحيح"); return;
    }
    const installments = parseInt(feeForm.installments) || 1;
    const total_fee = parseFloat(feeForm.total_fee);
    const installment_amount = Math.round(total_fee / installments);

    setFeeLoading(true);
    if (editingFee) {
      const { error } = await supabase.from("class_fees").update({
        class_name: feeForm.class_name.trim(),
        total_fee,
        installments,
        installment_amount,
        notes: feeForm.notes.trim(),
      }).eq("id", editingFee.id);
      if (error) { setFeeError("حدث خطأ أثناء التعديل: " + error.message); }
      else { setFeeSuccess("تم تعديل سعر القسط بنجاح ✓"); }
    } else {
      if (!schoolId) {
        setFeeError("لا يمكن تحديد المدرسة الحالية");
        setFeeLoading(false);
        return;
      }
      // التحقق من عدم التكرار
      const exists = classFees.find(cf => cf.class_name.trim() === feeForm.class_name.trim());
      if (exists) { setFeeError("هذا الصف موجود مسبقاً، يمكنك تعديله"); setFeeLoading(false); return; }
      const { error } = await supabase.from("class_fees").insert({
        school_id: schoolId,
        class_name: feeForm.class_name.trim(),
        total_fee,
        installments,
        installment_amount,
        notes: feeForm.notes.trim(),
      });
      if (error) { setFeeError("حدث خطأ أثناء الحفظ: " + error.message); }
      else { setFeeSuccess("تم حفظ سعر القسط بنجاح ✓"); }
    }
    setFeeLoading(false);
    if (!feeError) {
      await fetchClassFees();
      setTimeout(() => {
        setFeeSuccess("");
        setShowFeeModal(false);
        setEditingFee(null);
        setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
      }, 1200);
    }
  }

  async function handleSaveClass() {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!classForm.name.trim()) return;
    if (!schoolId) return;
    const sectionsToAdd = classForm.sections.filter(s => s.trim());
    if (editingClass) {
      await supabase.from("classes").update({ name: classForm.name.trim() }).eq("id", editingClass.id);
      // Update sections
      await supabase.from("sections").delete().eq("class_id", editingClass.id).eq("school_id", schoolId);
      for (const sec of sectionsToAdd) {
        await supabase.from("sections").insert({ class_id: editingClass.id, school_id: schoolId, name: sec.trim() });
      }
    } else {
      const { data: newClass } = await supabase
        .from("classes")
        .insert({ name: classForm.name.trim(), school_id: schoolId })
        .select()
        .single();
      if (newClass) {
        for (const sec of sectionsToAdd) {
          await supabase.from("sections").insert({ class_id: newClass.id, school_id: schoolId, name: sec.trim() });
        }
      }
    }
    await fetchClasses();
    await fetchSections();
    setShowClassesModal(false);
    setEditingClass(null);
    setClassForm({ name: "", sections: [""] });
    setShowClassForm(false);
  }

  async function handleDeleteClass(id: string) {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    let classDelete = supabase.from("classes").delete().eq("id", id);
    let sectionDelete = supabase.from("sections").delete().eq("class_id", id);
    if (schoolId) {
      classDelete = classDelete.eq("school_id", schoolId);
      sectionDelete = sectionDelete.eq("school_id", schoolId);
    }
    await classDelete;
    await sectionDelete;
    await fetchClasses();
    await fetchSections();
  }

  async function handleSaveSection() {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!sectionForm.class_id || !sectionForm.name.trim()) return;
    if (editingSection) {
      await supabase.from("sections").update({ name: sectionForm.name.trim() }).eq("id", editingSection.id);
    } else {
      if (!schoolId) return;
      await supabase.from("sections").insert({ class_id: sectionForm.class_id, school_id: schoolId, name: sectionForm.name.trim() });
    }
    await fetchSections();
    setEditingSection(null);
    setSectionForm({ class_id: "", name: "" });
    setShowSectionForm(false);
  }

  async function handleDeleteSection(id: string) {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    let query = supabase.from("sections").delete().eq("id", id);
    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }
    await query;
    await fetchSections();
  }

  async function handleDeleteFee(id: string) {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    let query = supabase.from("class_fees").delete().eq("id", id);
    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }
    await query;
    setDeleteConfirm(null);
    await fetchClassFees();
  }

  function openEditFee(cf: ClassFee) {
    setEditingFee(cf);
    setFeeForm({
      class_name: cf.class_name,
      total_fee: String(cf.total_fee),
      installments: String(cf.installments),
      notes: cf.notes || "",
    });
    setFeeError("");
    setFeeSuccess("");
    setShowFeeModal(true);
  }

  function openNewFee() {
    setEditingFee(null);
    setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
    setFeeError("");
    setFeeSuccess("");
    setShowFeeModal(true);
  }

  // ─── احصائيات الأقساط لكل صف (مرتبطة بالطلاب) ──────────────────────────
  function getClassStats(cf: ClassFee) {
    const classStudents = students.filter(s => s.class_name === cf.class_name);
    const totalExpected = classStudents.length * cf.total_fee;
    const totalPaid = classStudents.reduce((a, s) => a + (s.paid_fee || 0), 0);
    const totalRemaining = classStudents.reduce((a, s) => a + (s.remaining_fee || 0), 0);
    const paidPct = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
    return { count: classStudents.length, totalExpected, totalPaid, totalRemaining, paidPct };
  }

  const totalFees     = students.reduce((a,s) => a + s.total_fee, 0);
  const totalPaid     = students.reduce((a,s) => a + s.paid_fee, 0);
  const totalDiscount = students.reduce((a,s) => a + (s.discount_value||0), 0);
  const totalRemaining = students.reduce((a,s) => a + s.remaining_fee, 0);
  const afterDiscount = totalFees - totalDiscount;
  const paidPct = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;
  const remainingPct = 100 - paidPct;

  const barData = [
    { name: "إجمالي الرسوم", value: totalFees, fill: "#1689C9" },
    { name: "الواردات بعد الخصم", value: afterDiscount, fill: "#3B82F6" },
    { name: "المدفوع", value: totalPaid, fill: "#10B981" },
    { name: "الخصم", value: totalDiscount, fill: "#F59E0B" },
    { name: "المتبقي", value: totalRemaining, fill: "#EF4444" },
  ];

  const pieData = [
    { name: "المدفوع", value: totalPaid, color: "#10B981" },
    { name: "المتبقي", value: totalRemaining, color: "#F59E0B" },
  ];

  const recentPayments = payments.slice(0, 5);
  const overdueStudents = students.filter(s => s.remaining_fee > 0).sort((a,b) => b.remaining_fee - a.remaining_fee).slice(0, 3);

  const paymentsPageHref = schoolScope.buildLocalizedPath("/payments", locale);
  const currentSchoolName = schoolScope.selectedSchool?.name || profile?.school?.name || "اختر مدرسة";
  const currentSchoolCity = schoolScope.selectedSchool?.city || null;
  const academicYearLabel = getAcademicYearLabel();
  const roleLabel = profile ? ROLE_LABELS[profile.role] : "المستخدم الحالي";
  const activeStudentsCount = students.filter((student) => student.status !== "deleted").length;
  const transferredStudentsCount = students.filter((student) => student.status === "transferred").length;
  const graduatedStudentsCount = students.filter((student) => student.status === "graduated").length;
  const dashboardSummary = schoolScope.shouldBlockContent
    ? "اختر مدرسة أولاً حتى تصبح بيانات الهيدر والإحصائيات مرتبطة بسياق واضح."
    : schoolScope.isSuperAdminScope
      ? "عرض مركّز حسب المدرسة المحددة حالياً مع الحفاظ على نفس البيانات والعمليات."
      : "نظرة سريعة على الرسوم والمدفوعات والطلاب ضمن المدرسة الحالية.";

  return (
  <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
  <>
    <div className={styles.dashboardLayout}>
      <AppSidebar
        currentPath="/dashboard"
        containerClassName={`sidebar ${styles.dashboardSidebar}`}
        navClassName={`nav ${styles.dashboardNav}`}
        separatorClassName={`sep ${styles.dashboardSeparator}`}
      />

      <div className={`main ${styles.dashboardMain}`}>
        <div className={`topbar ${styles.dashboardTopbar}`}>
          <div>
            <div className={styles.sectionEyebrow}>نظرة عامة</div>
            <div className="topbar-title">لوحة التحكم</div>
            <div className="topbar-sub">{dashboardSummary}</div>
          </div>
          <div className={styles.topbarMeta}>
            <div className={`ui-pill ${styles.topbarChip}`}>{currentSchoolName}</div>
            <div className={`ui-pill ${styles.topbarChip}`}>العام الدراسي: {academicYearLabel}</div>
            <div className={`ui-pill ${styles.topbarChip}`}>{roleLabel}</div>
            {currentSchoolCity ? <div className={`ui-pill ${styles.topbarChip}`}>{currentSchoolCity}</div> : null}
          </div>
        </div>

        <div className={`content ${styles.dashboardContent}`}>
          <div className={styles.scopeSpacing}>
            <SchoolScopeBanner scope={schoolScope} />
          </div>
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="لوحة التحكم"
              description="اختر مدرسة أولاً لعرض الإحصائيات والرسوم الدراسية والبيانات المالية الخاصة بها."
            />
          ) : loading ? <div className="spin"/> : <>

          {canManageClasses && (
            <section className={styles.actionsBar}>
              <div className={styles.actionsCopy}>
                <div className={styles.sectionEyebrow}>إجراءات سريعة</div>
                <div className={styles.sectionTitle}>تشغيل الأقساط والصفوف بسرعة</div>
                <div className={styles.sectionDescription}>
                  نفس الإجراءات القديمة ما زالت موجودة، لكن داخل شريط عمليات أخف وأكثر اتزاناً على الشاشات الكثيفة.
                </div>
              </div>
              <div className={styles.actionsRow}>
                <button className="ui-button ui-button--primary" onClick={openNewFee}>
                  + إضافة قسط دراسي
                </button>
                <button className="ui-button ui-button--secondary" onClick={() => setShowFeesTable((value) => !value)}>
                  {showFeesTable ? "إخفاء جدول الأقساط" : "عرض جدول الأقساط"}
                </button>
                <button className="ui-button ui-button--secondary" onClick={() => setShowClassesModal(true)}>
                  إدارة الصفوف والشعب
                </button>
              </div>
            </section>
          )}

          <div className={styles.kpiPrimaryGrid}>
            <KpiMetricCard
              eyebrow="الطلاب"
              title="إجمالي الطلاب"
              value={formatNumber(activeStudentsCount)}
              helper="عدد الطلاب النشطين ضمن المدرسة الحالية."
              delta={`${formatNumber(transferredStudentsCount)} منقول`}
              iconToken="🎓"
              tone="neutral"
              series={[activeStudentsCount, Math.max(activeStudentsCount - transferredStudentsCount, 0), activeStudentsCount, activeStudentsCount]}
            />
            <KpiMetricCard
              eyebrow="الرسوم"
              title="إجمالي الرسوم"
              value={`د.ع ${formatNumber(totalFees)}`}
              helper="الرسوم الكلية قبل الخصومات."
              delta={`د.ع ${formatNumber(afterDiscount)}`}
              iconToken="🧾"
              tone="warning"
              series={[totalFees, afterDiscount, totalFees - totalDiscount, totalFees]}
            />
            <KpiMetricCard
              eyebrow="التحصيل"
              title="المبلغ المدفوع"
              value={`د.ع ${formatNumber(totalPaid)}`}
              helper="مجموع ما تم تحصيله حتى الآن."
              delta={`${paidPct}% تحصيل`}
              iconToken="💳"
              tone="positive"
              series={recentPayments.map((payment) => payment.amount || 0).reverse()}
            />
            <KpiMetricCard
              eyebrow="الرصيد المفتوح"
              title="الرصيد المتبقي"
              value={`د.ع ${formatNumber(totalRemaining)}`}
              helper="الذمم المفتوحة التي تحتاج متابعة."
              delta={`${formatNumber(overdueStudents.length)} حالات متأخرة`}
              iconToken="⚠️"
              tone="danger"
              series={overdueStudents.map((student) => student.remaining_fee || 0).reverse()}
            />
          </div>

          <div className={styles.kpiSecondaryGrid}>
            <KpiMetricCard
              compact
              eyebrow="التخفيضات"
              title="إجمالي التخفيض"
              value={`د.ع ${formatNumber(totalDiscount)}`}
              helper="إجمالي التخفيضات الممنوحة للطلاب."
              delta={`${formatNumber(graduatedStudentsCount)} متخرج`}
              iconToken="🏷️"
              tone="warning"
              series={[totalDiscount, totalDiscount / 2, totalDiscount, Math.max(totalDiscount - 1, 0)]}
            />
            <KpiMetricCard
              compact
              eyebrow="النشاط الأخير"
              title="آخر الدفعات"
              value={formatNumber(recentPayments.length)}
              helper="عدد الدفعات الحديثة المعروضة في اللوحة."
              delta={recentPayments[0] ? formatDate(recentPayments[0].created_at) : "لا توجد دفعات"}
              iconToken="🕘"
              tone="neutral"
              series={recentPayments.map((payment) => payment.amount || 0)}
            />
          </div>

            {/* ── جدول / بطاقات الأقساط (عند الطلب) ── */}
            {canManageClasses && showFeesTable && (
              <div className="fees-section">
                <div className="section-header">
                  <div className="section-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                    <AppIcon token="💰" size={16} />
                    الأقساط حسب الصف
                  </div>
                  <button className="fee-btn" onClick={openNewFee} style={{fontSize:".75rem",padding:".4rem .9rem"}}>
                    + إضافة صف جديد
                  </button>
                </div>

                {classFees.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--gray)",padding:"2rem",fontSize:".85rem"}}>
                    لا توجد أقساط مضافة حتى الآن. اضغط على "إضافة قسط دراسي" للبدء.
                  </div>
                ) : (<>
                  {/* بطاقات سريعة */}
                  <div className="fee-cards-row">
                    {classFees.map(cf => {
                      const stats = getClassStats(cf);
                      return (
                        <div className="fee-card" key={cf.id} onClick={() => openEditFee(cf)}>
                          <div className="fc-class" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                            <AppIcon token="🏫" size={14} />
                            {cf.class_name}
                          </div>
                          <div className="fc-amount">د.ع {formatNumber(cf.total_fee)}</div>
                          <div className="fc-sub">إجمالي الموسم</div>
                          <div className="fc-inst">
                            <span className="fc-inst-lbl">لكل قسط:</span>
                            <span className="fc-inst-val">د.ع {formatNumber(cf.installment_amount)}</span>
                            <span className="inst-badge">×{cf.installments}</span>
                          </div>
                          <div style={{marginTop:".5rem",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:".67rem",color:"var(--gray)"}}>
                            <span>{stats.count} طالب</span>
                            <span style={{color:"#10B981",fontWeight:700}}>{stats.paidPct}% مدفوع</span>
                          </div>
                          <div className="prog-mini">
                            <div className="prog-mini-fill" style={{width:`${stats.paidPct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* جدول تفصيلي */}
                  <table className="fees-table">
                    <thead>
                      <tr>
                        <th>الصف الدراسي</th>
                        <th>المبلغ الكلي</th>
                        <th>عدد الأقساط</th>
                        <th>قيمة القسط الواحد</th>
                        <th>عدد الطلاب</th>
                        <th>المدفوع</th>
                        <th>المتبقي</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classFees.map(cf => {
                        const stats = getClassStats(cf);
                        return (
                          <tr key={cf.id}>
                            <td><span className="class-chip">{cf.class_name}</span></td>
                            <td style={{fontWeight:800,color:"var(--p2)"}}>د.ع {formatNumber(cf.total_fee)}</td>
                            <td><span className="inst-badge">× {cf.installments} قسط</span></td>
                            <td style={{fontWeight:700,color:"#10B981"}}>د.ع {formatNumber(cf.installment_amount)}</td>
                            <td style={{textAlign:"center",fontWeight:700}}>{stats.count}</td>
                            <td style={{color:"#10B981",fontWeight:700}}>د.ع {formatNumber(stats.totalPaid)}</td>
                            <td style={{color:"#EF4444",fontWeight:700}}>د.ع {formatNumber(stats.totalRemaining)}</td>
                            <td>
                              <div style={{display:"flex",gap:".4rem"}}>
                                <button className="action-btn edit-btn" onClick={() => openEditFee(cf)}>تعديل</button>
                                {deleteConfirm === cf.id ? (
                                  <div style={{display:"flex",gap:".3rem"}}>
                                    <button className="action-btn del-btn" onClick={() => handleDeleteFee(cf.id)}>تأكيد</button>
                                    <button className="action-btn" style={{background:"#F3F4F6",color:"var(--dark)"}} onClick={() => setDeleteConfirm(null)}>إلغاء</button>
                                  </div>
                                ) : (
                                  <button className="action-btn del-btn" onClick={() => setDeleteConfirm(cf.id)}>حذف</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>)}
              </div>
            )}

            {/* لوحة التحليل المالي */}
            <section className={styles.financeSurface}>
              <div className={styles.surfaceHeader}>
                <div>
                  <div className={styles.sectionEyebrow}>نظرة مالية</div>
                  <div className={styles.sectionTitle}>لوحة التحليل المالي</div>
                  <div className={styles.sectionDescription}>
                    قراءة موحدة للرسوم، الخصومات، التحصيل، والذمم المفتوحة ضمن المدرسة الحالية.
                  </div>
                </div>
                <div className={styles.surfaceMeta}>تحديث مباشر من البيانات الحالية</div>
              </div>
              <div className={styles.miniSummaryGrid}>
                {[
                  ["إجمالي المبلغ المطلوب", `د.ع ${formatNumber(totalFees)}`, "قبل الخصومات"],
                  ["الواردات بعد الخصم", `د.ع ${formatNumber(afterDiscount)}`, "بعد احتساب الخصومات"],
                  ["المبالغ المستحصلة", `د.ع ${formatNumber(totalPaid)}`, `${paidPct}% من الإجمالي`],
                  ["المبلغ المتبقي", `د.ع ${formatNumber(totalRemaining)}`, `${remainingPct}% لم يُحصّل بعد`],
                ].map(([label, value, meta]) => (
                  <div key={label} className={styles.miniSummaryCard}>
                    <div className={styles.miniSummaryLabel}>{label}</div>
                    <div className={styles.miniSummaryValue}>{value}</div>
                    <div className={styles.miniSummaryMeta}>{meta}</div>
                  </div>
                ))}
              </div>
              <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
              <div className={styles.progressGrid}>
                <div className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>نسبة التحصيل</span>
                    <span className={styles.progressValue}>{paidPct}%</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${paidPct}%`, background: "rgb(var(--dashboard-success-rgb))" }} />
                  </div>
                </div>
                <div className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>المبلغ المتبقي</span>
                    <span className={styles.progressValue}>د.ع {formatNumber(totalRemaining)}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${remainingPct}%`, background: "rgb(var(--dashboard-warning-rgb))" }} />
                  </div>
                </div>
                <div className={styles.progressItem}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>التخفيضات</span>
                    <span className={styles.progressValue}>د.ع {formatNumber(totalDiscount)}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${totalFees > 0 ? Math.min(100, Math.round((totalDiscount / totalFees) * 100)) : 0}%`, background: "rgb(var(--dashboard-secondary-rgb))" }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.lowerGrid}>
              <section className={styles.listCard}>
                <div className={styles.listHeader}>
                  <div className={styles.listHeading}>
                    <div className={styles.listTitle}>آخر الحسابات</div>
                    <div className={styles.listSubtitle}>آخر الحركات المالية على مستوى الطلاب.</div>
                  </div>
                  <Link href={paymentsPageHref} className={styles.listLink}>عرض الكل</Link>
                </div>
                <div className={styles.listBody}>
                  {recentPayments.length === 0 ? (
                    <div className={styles.emptyState}>لا توجد دفعات حديثة حتى الآن.</div>
                  ) : recentPayments.map((payment: any) => {
                    const student = students.find((item) => item.id === payment.student_id);
                    return (
                      <div key={payment.id} className={styles.activityRow}>
                        <div className={styles.activityAvatar}>{(student?.full_name || "؟").slice(0, 1)}</div>
                        <div className={styles.activityCopy}>
                          <div className={styles.activityName}>{student?.full_name || "طالب غير معروف"}</div>
                          <div className={styles.activityMeta}>
                            {(student?.class_name || "بدون صف")} • {formatDate(payment.created_at)}
                          </div>
                        </div>
                        <div className={styles.activityAmount}>د.ع {formatNumber(payment.amount)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={styles.listCard}>
                <div className={styles.listHeader}>
                  <div className={styles.listHeading}>
                    <div className={styles.listTitle}>الطلاب المتأخرون</div>
                    <div className={styles.listSubtitle}>أعلى الذمم التي تحتاج متابعة مباشرة.</div>
                  </div>
                  <Link href={paymentsPageHref} className={styles.listLink}>فتح الحسابات</Link>
                </div>
                <div className={styles.listBody}>
                  {overdueStudents.length === 0 ? (
                    <div className={styles.emptyState}>لا توجد ذمم متأخرة حالياً.</div>
                  ) : overdueStudents.map((student) => (
                    <div key={student.id} className={styles.statusRow}>
                      <div className={styles.statusTone}>!</div>
                      <div className={styles.statusCopy}>
                        <div className={styles.statusName}>{student.full_name}</div>
                        <div className={styles.statusMeta}>{student.class_name || "بدون صف"}</div>
                      </div>
                      <div className={styles.statusAmount}>د.ع {formatNumber(student.remaining_fee)}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

          </>}
        </div>
      </div>
    </div>

    {/* ══════════════════════════════════════════════════
        Modal Manage classes and sections
    ══════════════════════════════════════════════════ */}
    {showClassesModal && (
      <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget){setShowClassesModal(false);setEditingClass(null);setClassForm({name:"",sections:[""]});} }}>
        <div className="modal-box" style={{width:"600px"}}>
          <div className="modal-title">
            <AppIcon token="🏫" size={18} />
            إدارة الصفوف والشعب الدراسية
          </div>

          <div style={{marginBottom:"1rem"}}>
            <div style={{display:"flex",gap:".5rem",marginBottom:".8rem"}}>
              <button className="fee-btn" onClick={() => {setEditingClass(null);setClassForm({name:"",sections:[""]});setShowClassForm(true);setShowSectionForm(false);}} style={{fontSize:".75rem",padding:".4rem .8rem"}}>+ إضافة صف جديد</button>
              <button className="fee-btn" onClick={() => {setEditingSection(null);setSectionForm({class_id:"",name:""});setShowSectionForm(true);setShowClassForm(false);}} style={{fontSize:".75rem",padding:".4rem .8rem"}}>+ إضافة شعبة جديدة</button>
                <button className="fee-btn-outline" onClick={() => setShowSectionsTable(v=>!v)} style={{fontSize:".75rem"}}>{showSectionsTable ? "إخفاء الشعب" : "عرض الشعب"}</button>
            </div>

            {/* نموذج إضافة/تعديل صف */}
            {(showClassForm || editingClass) && (
              <div style={{background:"#F6FBFF",borderRadius:"12px",padding:"1rem",marginBottom:"1rem"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--p2)",marginBottom:".6rem"}}>{editingClass ? "تعديل الصف" : "إضافة صف جديد"}</div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">اسم الصف <span>*</span></label>
                    <input className="form-input" value={classForm.name} onChange={e=>setClassForm({...classForm,name:e.target.value})} placeholder="مثال: الصف الخامس"/>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">الشعب <span style={{fontWeight:400,color:"var(--gray)",fontSize:".7rem"}}>(كل شعبة في سطر — مثال: أ، ب، ج)</span></label>
                    <textarea className="form-input" rows={3} value={classForm.sections.join('\n')} onChange={e=>setClassForm({...classForm,sections:e.target.value.split('\n')})} placeholder={"أ\nب\nج"} style={{resize:"none"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end",marginTop:".8rem"}}>
                  <button className="btn-cancel" onClick={()=>{setEditingClass(null);setClassForm({name:"",sections:[""]});setShowClassForm(false);}}>إلغاء</button>
                  <button className="btn-save" onClick={handleSaveClass}>{editingClass ? "حفظ التعديلات" : "إضافة صف"}</button>
                </div>
              </div>
            )}

            {/* نموذج إضافة/تعديل شعبة */}
            {(showSectionForm || editingSection) && (
              <div style={{background:"#F0FDF4",borderRadius:"12px",padding:"1rem",marginBottom:"1rem",border:"1px solid #BBF7D0"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"#166534",marginBottom:".6rem"}}>{editingSection ? "تعديل الشعبة" : "إضافة شعبة جديدة"}</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">الصف <span>*</span></label>
                    <select className="form-select" value={sectionForm.class_id} onChange={e=>setSectionForm({...sectionForm,class_id:e.target.value})}>
                      <option value="">اختر الصف</option>
                      {classes.map(cls=><option key={cls.id} value={cls.id}>{cls.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">اسم الشعبة <span>*</span></label>
                    <input className="form-input" value={sectionForm.name} onChange={e=>setSectionForm({...sectionForm,name:e.target.value})} placeholder="مثال: أ"/>
                  </div>
                </div>
                <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end",marginTop:".8rem"}}>
                  <button className="btn-cancel" onClick={()=>{setEditingSection(null);setSectionForm({class_id:"",name:""});setShowSectionForm(false);}}>إلغاء</button>
                  <button className="btn-save" onClick={handleSaveSection}>{editingSection ? "حفظ التعديلات" : "إضافة شعبة"}</button>
                </div>
              </div>
            )}
            <div style={{background:"white",borderRadius:"12px",padding:"1rem",border:"1px solid rgba(22,137,201,0.1)"}}>
              <div style={{fontSize:".85rem",fontWeight:700,color:"var(--p2)",marginBottom:".6rem"}}>الصفوف الدراسية</div>
              {classes.length === 0 ? (
                <div style={{textAlign:"center",color:"var(--gray)",padding:"2rem",fontSize:".8rem"}}>لا توجد صفوف مضافة</div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                  <thead>
                    <tr style={{background:"#E6F6FF",color:"var(--p2)"}}>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>عدد الشعب</th>
                      <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => {
                      const clsSections = sections.filter(s => s.class_id === cls.id);
                      return (
                        <tr key={cls.id} style={{borderBottom:"1px solid rgba(22,137,201,0.05)"}}>
                          <td style={{padding:".5rem",fontWeight:600}}>{cls.name}</td>
                          <td style={{padding:".5rem"}}>{clsSections.length} شعبة</td>
                          <td style={{padding:".5rem",textAlign:"center"}}>
                            <button className="action-btn edit-btn" onClick={()=>{setEditingClass(cls);setClassForm({name:cls.name,sections:clsSections.map(s=>s.name)});setShowClassForm(true);setShowSectionForm(false);}}>تعديل</button>
                            <button className="action-btn del-btn" onClick={()=>handleDeleteClass(cls.id)} style={{marginLeft:".3rem"}}>حذف</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* جدول الشعب */}
            {showSectionsTable && (
              <div style={{background:"white",borderRadius:"12px",padding:"1rem",marginTop:"1rem",border:"1px solid rgba(22,137,201,0.1)"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--p2)",marginBottom:".6rem"}}>الشعب الدراسية</div>
                {sections.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--gray)",padding:"2rem",fontSize:".8rem"}}>لا توجد شعب مضافة</div>
                ) : (
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                    <thead>
                      <tr style={{background:"#E6F6FF",color:"var(--p2)"}}>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الشعبة</th>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                        <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(sec => {
                        const cls = classes.find(c => c.id === sec.class_id);
                        return (
                          <tr key={sec.id} style={{borderBottom:"1px solid rgba(22,137,201,0.05)"}}>
                            <td style={{padding:".5rem",fontWeight:600}}>{sec.name}</td>
                            <td style={{padding:".5rem"}}>{cls?.name || "—"}</td>
                            <td style={{padding:".5rem",textAlign:"center"}}>
                              <button className="action-btn edit-btn" onClick={()=>{setEditingSection(sec);setSectionForm({class_id:sec.class_id,name:sec.name});setShowSectionForm(true);setShowClassForm(false);}}>تعديل</button>
                              <button className="action-btn del-btn" onClick={()=>handleDeleteSection(sec.id)} style={{marginLeft:".3rem"}}>حذف</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => { setShowClassesModal(false); setEditingClass(null); setClassForm({name:"",sections:[""]}); setShowClassForm(false); setShowSectionForm(false); setEditingSection(null); setSectionForm({class_id:"",name:""}); }}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════
        Modal إضافة / تعديل سعر القسط
    ══════════════════════════════════════════════════ */}
    {showFeeModal && (
      <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget){setShowFeeModal(false);setEditingFee(null);} }}>
        <div className="modal-box">
          <div className="modal-title">
            <AppIcon token={editingFee ? "✏️" : "💰"} size={18} />
            {editingFee ? `تعديل قسط: ${editingFee.class_name}` : "إضافة قسط دراسي"}
          </div>

          <div className="form-grid">
            {/* اسم الصف */}
            <div className="form-group full">
              <label className="form-label">اسم الصف الدراسي <span>*</span></label>
              <input
                className="form-input"
                placeholder="مثال: الصف الأول، الصف الثاني..."
                value={feeForm.class_name}
                onChange={e => setFeeForm(f=>({...f,class_name:e.target.value}))}
                disabled={!!editingFee}
              />
              {editingFee && <span style={{fontSize:".67rem",color:"var(--gray)"}}>لا يمكن تغيير اسم الصف عند التعديل</span>}
            </div>

            {/* المبلغ الكلي */}
            <div className="form-group">
              <label className="form-label">المبلغ الكلي (د.ع) <span>*</span></label>
              <input
                className="form-input"
                type="number"
                placeholder="مثال: 1500000"
                value={feeForm.total_fee}
                onChange={e => setFeeForm(f=>({...f,total_fee:e.target.value}))}
              />
            </div>

            {/* عدد الأقساط */}
            <div className="form-group">
              <label className="form-label">عدد الأقساط <span>*</span></label>
              <select
                className="form-select"
                value={feeForm.installments}
                onChange={e => setFeeForm(f=>({...f,installments:e.target.value}))}
              >
                {[1,2,3,4,5,6,8,10,12].map(n => (
                  <option key={n} value={n}>{n} {n===1?"قسط واحد":"أقساط"}</option>
                ))}
              </select>
            </div>

            {/* ملاحظات */}
            <div className="form-group full">
              <label className="form-label">ملاحظات (اختياري)</label>
              <input
                className="form-input"
                placeholder="مثال: يشمل الكتب والأنشطة..."
                value={feeForm.notes}
                onChange={e => setFeeForm(f=>({...f,notes:e.target.value}))}
              />
            </div>
          </div>

          {/* معاينة القسط الواحد */}
          {feeForm.total_fee && !isNaN(Number(feeForm.total_fee)) && Number(feeForm.total_fee) > 0 && (
            <div className="installment-preview">
              <div>
                <div className="ip-label">قيمة القسط الواحد</div>
                <div className="ip-sub">المبلغ الكلي ÷ {feeForm.installments} أقساط</div>
              </div>
              <div style={{textAlign:"left"}}>
                <div className="ip-val">د.ع {formatNumber(Math.round(Number(feeForm.total_fee) / parseInt(feeForm.installments)))}</div>
                <div className="ip-sub">لكل قسط</div>
              </div>
            </div>
          )}

          {/* ربط بالطلاب */}
          {feeForm.class_name && (() => {
            const linked = students.filter(s => s.class_name === feeForm.class_name.trim());
            if (linked.length === 0) return null;
            return (
              <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:9,padding:".6rem .9rem",marginBottom:".8rem",fontSize:".75rem",color:"#166534"}}>
                <strong style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                  <AppIcon token="🔗" size={13} />
                  مرتبط بـ {linked.length} طالب
                </strong>{" "}
                في هذا الصف
              </div>
            );
          })()}

          {feeError && <div className="msg-error" style={{display:"flex",alignItems:"center",gap:".35rem"}}><AppIcon token="⚠️" size={14} /> {feeError}</div>}
          {feeSuccess && <div className="msg-success">{feeSuccess}</div>}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => { setShowFeeModal(false); setEditingFee(null); setFeeError(""); setFeeSuccess(""); }}>
              إلغاء
            </button>
            <button className="btn-save" onClick={handleSaveFee} disabled={feeLoading}>
              {feeLoading ? "جارٍ الحفظ..." : editingFee ? "حفظ التعديلات" : "إضافة القسط"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  </ProtectedRoute>
  );
}
