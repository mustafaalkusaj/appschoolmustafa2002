"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import {
  derivePaletteFromLogo,
  getStoredSchoolBranding,
  setStoredSchoolBranding,
} from "@/lib/brand-palette";
import { AnalysisSkeleton } from "@/components/skeleton";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolBranchForProfile, resolveSchoolIdForProfile } from "@/lib/school-context";
import { requestRuntimeBrandingRefresh } from "@/hooks/useRuntimeBranding";
import { detectAppSchemaCompat } from "@/lib/schema-compat";

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

interface DashboardNotification {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
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
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingDeriving, setBrandingDeriving] = useState(false);
  const [brandingNotice, setBrandingNotice] = useState("");
  const [brandingForm, setBrandingForm] = useState({
    name: "",
    logo_url: "",
    primary_color: "#4f8cff",
    secondary_color: "#79d7ff",
  });

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
    const compat = await detectAppSchemaCompat();
    let feesQuery = supabase
      .from("class_fees")
      .select("*")
      .order("class_name", { ascending: true });
    if (compat.classFeesSchoolScope) {
      feesQuery = feesQuery.eq("school_id", schoolId);
    }
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

      // 3. Fetch class fees with schema compatibility
      feesQuery,
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
    const compat = await detectAppSchemaCompat();
    if (!schoolId && compat.classFeesSchoolScope) {
      setClassFees([]);
      return;
    }
    let query = supabase
      .from("class_fees")
      .select("*")
      .order("class_name", { ascending: true });
    if (compat.classFeesSchoolScope && schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data } = await query;
    
    if (data) setClassFees(data as ClassFee[]);
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchClasses = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setClasses([]);
      return;
    }
    if (compat.classesNameColumn) {
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("school_id", schoolId)
        .order("name", { ascending: true });
      if (data) setClasses(data);
      return;
    }

    const { data } = await supabase
      .from("classes")
      .select("id, school_id, branch_id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });

    if (!data) return;
    const groups = new Map<string, { id: string; name: string; legacyClassIds: string[]; branch_id: string | null }>();
    (data as Array<Record<string, unknown>>).forEach((row) => {
      const grade = typeof row.grade === "string" ? row.grade : "";
      if (!grade) return;
      const existing = groups.get(grade);
      if (existing) {
        existing.legacyClassIds.push(String(row.id));
        return;
      }
      groups.set(grade, {
        id: `legacy:${grade}`,
        name: grade,
        legacyClassIds: [String(row.id)],
        branch_id: typeof row.branch_id === "string" ? row.branch_id : null,
      });
    });

    setClasses(Array.from(groups.values()));
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchSections = useCallback(async () => {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (!schoolId) {
      setSections([]);
      return;
    }
    if (compat.classesNameColumn) {
      let query = supabase
        .from("sections")
        .select("*, classes(name)")
        .order("name", { ascending: true });
      if (compat.sectionsSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      const { data } = await query;
      if (data) setSections(data);
      return;
    }

    const { data } = await supabase
      .from("classes")
      .select("id, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("section", { ascending: true });

    if (!data) return;
    setSections(
      (data as Array<Record<string, unknown>>)
        .filter((row) => typeof row.grade === "string" && typeof row.section === "string" && row.section)
        .map((row) => ({
          id: String(row.id),
          class_id: `legacy:${String(row.grade)}`,
          name: String(row.section),
        })),
    );
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchSchoolBranding = useCallback(async () => {
    if (profile?.role !== "super_admin") return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setBrandingForm((prev) => ({ ...prev, name: "", logo_url: "" }));
      return;
    }

    const compat = await detectAppSchemaCompat();
    const storedBranding = getStoredSchoolBranding(schoolId);
    const schoolQuery = compat.schoolColors
      ? supabase.from("schools").select("name, logo_url, primary_color, secondary_color")
      : supabase.from("schools").select("name, logo_url");
    const { data } = await schoolQuery.eq("id", schoolId).maybeSingle();

    if (!data) return;

    let primaryColor =
      compat.schoolColors && "primary_color" in data && typeof data.primary_color === "string"
        ? data.primary_color
        : storedBranding?.primaryColor || "";
    let secondaryColor =
      compat.schoolColors && "secondary_color" in data && typeof data.secondary_color === "string"
        ? data.secondary_color
        : storedBranding?.secondaryColor || "";

    if (!primaryColor || !secondaryColor) {
      const derivedPalette = await derivePaletteFromLogo(
        typeof data.logo_url === "string" ? data.logo_url : null,
        typeof data.name === "string" ? data.name : "",
      );
      primaryColor = primaryColor || derivedPalette.primaryColor;
      secondaryColor = secondaryColor || derivedPalette.secondaryColor;
    }
    setBrandingForm({
      name: data.name || "",
      logo_url: data.logo_url || "",
      primary_color: primaryColor || "#4f8cff",
      secondary_color: secondaryColor || "#79d7ff",
    });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchDashboardNotifications = useCallback(async () => {
    if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      const relationMissing = error.message.includes('relation "notifications" does not exist');
      setNotificationsEnabled(!relationMissing);
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsEnabled(true);
    setNotifications((data || []) as DashboardNotification[]);
    setNotificationsLoading(false);
  }, [profile]);

  async function markNotificationAsRead(id: string) {
    if (!id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }

  async function saveBrandingFromDashboard() {
    if (profile?.role !== "super_admin") return;
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    if (!schoolId) {
      setBrandingNotice("اختر مدرسة أولاً لتخصيص الهوية البصرية.");
      return;
    }

    setBrandingSaving(true);
    setBrandingNotice("");
    const compat = await detectAppSchemaCompat();
    const payload = {
      name: brandingForm.name.trim(),
      logo_url: brandingForm.logo_url.trim() || null,
      ...(compat.schoolColors
        ? {
            primary_color: brandingForm.primary_color || null,
            secondary_color: brandingForm.secondary_color || null,
          }
        : {}),
    };
    if (!payload.name) {
      setBrandingNotice("اسم المدرسة مطلوب قبل الحفظ.");
      setBrandingSaving(false);
      return;
    }

    const { error } = await supabase.from("schools").update(payload).eq("id", schoolId);
    if (error) {
      setBrandingNotice(`تعذر حفظ الهوية: ${error.message}`);
      setBrandingSaving(false);
      return;
    }

    setStoredSchoolBranding(schoolId, {
      primaryColor: brandingForm.primary_color || null,
      secondaryColor: brandingForm.secondary_color || null,
      source: "manual",
    });
    requestRuntimeBrandingRefresh();
    setBrandingNotice(
      compat.schoolColors
        ? "تم تحديث الشعار والألوان واسم المدرسة بنجاح."
        : "تم تحديث الشعار واسم المدرسة، وحُفظت الألوان محلياً لأن أعمدة الألوان غير موجودة بعد في Supabase الحالي.",
    );
    setBrandingSaving(false);
  }

  async function deriveDashboardBrandingFromLogo() {
    setBrandingDeriving(true);
    setBrandingNotice("");
    try {
      const derivedPalette = await derivePaletteFromLogo(
        brandingForm.logo_url.trim() || null,
        brandingForm.name.trim(),
      );
      setBrandingForm((prev) => ({
        ...prev,
        primary_color: derivedPalette.primaryColor,
        secondary_color: derivedPalette.secondaryColor,
      }));
      setBrandingNotice(
        brandingForm.logo_url.trim()
          ? "تم استخراج الألوان من الشعار ويمكنك تعديلها قبل الحفظ."
          : "لا يوجد رابط شعار، لذا تم توليد ألوان احترافية اعتماداً على اسم المدرسة.",
      );
    } catch (error) {
      setBrandingNotice(
        `تعذر استخراج الألوان تلقائياً: ${error instanceof Error ? error.message : "خطأ غير متوقع"}`,
      );
    } finally {
      setBrandingDeriving(false);
    }
  }

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
    void fetchClasses();
    void fetchSections();
    void fetchSchoolBranding();
    void fetchDashboardNotifications();
  }, [
    profile,
    schoolScope.scopeLoading,
    fetchAll,
    fetchClasses,
    fetchSections,
    fetchSchoolBranding,
    fetchDashboardNotifications,
  ]);

  // ─── حفظ/تعديل سعر قسط الصف ─────────────────────────────────────────────
  async function handleSaveFee() {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
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
        ...(compat.classFeesSchoolScope ? { school_id: schoolId } : {}),
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
    const { branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!classForm.name.trim()) return;
    if (!schoolId) return;
    const sectionsToAdd = classForm.sections.filter(s => s.trim());
    if (compat.classesNameColumn) {
      if (editingClass) {
        await supabase.from("classes").update({ name: classForm.name.trim() }).eq("id", editingClass.id);
        let sectionDelete = supabase.from("sections").delete().eq("class_id", editingClass.id);
        if (compat.sectionsSchoolScope) {
          sectionDelete = sectionDelete.eq("school_id", schoolId);
        }
        await sectionDelete;
        for (const sec of sectionsToAdd) {
          await supabase.from("sections").insert({
            class_id: editingClass.id,
            ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
            name: sec.trim(),
          });
        }
      } else {
        const { data: newClass } = await supabase
          .from("classes")
          .insert({ name: classForm.name.trim(), school_id: schoolId })
          .select()
          .single();
        if (newClass) {
          for (const sec of sectionsToAdd) {
            await supabase.from("sections").insert({
              class_id: newClass.id,
              ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
              name: sec.trim(),
            });
          }
        }
      }
    } else {
      if (editingClass?.legacyClassIds?.length) {
        await supabase.from("classes").delete().in("id", editingClass.legacyClassIds);
      }
      const legacySections = sectionsToAdd.length > 0 ? sectionsToAdd : [""];
      for (const sec of legacySections) {
        await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: classForm.name.trim(),
          section: sec.trim() || null,
        });
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
    const compat = await detectAppSchemaCompat();
    if (compat.classesNameColumn) {
      let classDelete = supabase.from("classes").delete().eq("id", id);
      let sectionDelete = supabase.from("sections").delete().eq("class_id", id);
      if (schoolId) {
        classDelete = classDelete.eq("school_id", schoolId);
        if (compat.sectionsSchoolScope) {
          sectionDelete = sectionDelete.eq("school_id", schoolId);
        }
      }
      await classDelete;
      await sectionDelete;
    } else {
      const targetClass = classes.find((item) => item.id === id);
      const legacyIds = Array.isArray(targetClass?.legacyClassIds) ? targetClass.legacyClassIds : [];
      if (legacyIds.length > 0) {
        await supabase.from("classes").delete().in("id", legacyIds);
      }
    }
    await fetchClasses();
    await fetchSections();
  }

  async function handleSaveSection() {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const { branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    if (!sectionForm.class_id || !sectionForm.name.trim()) return;
    if (compat.classesNameColumn) {
      if (editingSection) {
        await supabase.from("sections").update({ name: sectionForm.name.trim() }).eq("id", editingSection.id);
      } else {
        if (!schoolId) return;
        await supabase.from("sections").insert({
          class_id: sectionForm.class_id,
          ...(compat.sectionsSchoolScope ? { school_id: schoolId } : {}),
          name: sectionForm.name.trim(),
        });
      }
    } else {
      const targetClass = classes.find((item) => item.id === sectionForm.class_id);
      const gradeName = typeof targetClass?.name === "string" ? targetClass.name : "";
      if (!gradeName || !schoolId) return;
      if (editingSection) {
        await supabase.from("classes").update({ section: sectionForm.name.trim() }).eq("id", editingSection.id);
      } else {
        await supabase.from("classes").insert({
          school_id: schoolId,
          branch_id: branchId || null,
          grade: gradeName,
          section: sectionForm.name.trim(),
        });
      }
    }
    await fetchSections();
    await fetchClasses();
    setEditingSection(null);
    setSectionForm({ class_id: "", name: "" });
    setShowSectionForm(false);
  }

  async function handleDeleteSection(id: string) {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    if (compat.classesNameColumn) {
      let query = supabase.from("sections").delete().eq("id", id);
      if (schoolId && compat.sectionsSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      await query;
    } else {
      await supabase.from("classes").delete().eq("id", id);
    }
    await fetchSections();
    await fetchClasses();
  }

  async function handleDeleteFee(id: string) {
    const schoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
    const compat = await detectAppSchemaCompat();
    let query = supabase.from("class_fees").delete().eq("id", id);
    if (schoolId && compat.classFeesSchoolScope) {
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
    { name: "إجمالي الرسوم", value: totalFees, fill: "#6C4AB6" },
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
  const canCustomizeBranding = profile?.role === "super_admin";
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;
  const dashboardSummary = schoolScope.shouldBlockContent
    ? "اختر مدرسة أولاً حتى تصبح بيانات الهيدر والإحصائيات مرتبطة بسياق واضح."
    : schoolScope.isSuperAdminScope
      ? "عرض مركّز حسب المدرسة المحددة حالياً مع الحفاظ على نفس البيانات والعمليات."
      : "نظرة سريعة على الرسوم والمدفوعات والطلاب ضمن المدرسة الحالية.";

  return (
  <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
  <>
    <div className="layout">
      <AppSidebar currentPath="/dashboard" />

      <div className="main">
        <AppShellTopbar title="لوحة التحكم" subtitle={dashboardSummary} scope={schoolScope} />

        <div className="content app-shell-content">
          <SchoolScopeBanner scope={schoolScope} showSelector={false} />
          {schoolScope.shouldBlockContent ? (
            <SchoolScopeEmptyState
              scope={schoolScope}
              title="لوحة التحكم"
              description="اختر مدرسة أولاً لعرض الإحصائيات والرسوم الدراسية والبيانات المالية الخاصة بها."
            />
          ) : loading ? <div className="spin"/> : <>

          {/* ─── أزرار الإجراءات ─── */}
          {canManageClasses && (
            <div style={{display:"flex",alignItems:"center",gap:".7rem",marginBottom:"1rem",flexWrap:"wrap"}}>
              <button className="fee-btn" onClick={openNewFee}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                + إضافة قسط دراسي
              </button>
              <button className="fee-btn-outline" onClick={() => setShowFeesTable(v=>!v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="3"/></svg>
                {showFeesTable ? "إخفاء الجدول" : "عرض جدول الأقساط"}
              </button>
              <button className="fee-btn-outline" onClick={() => setShowClassesModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                إدارة الصفوف والشعب
              </button>
            </div>
          )}

          {(canCustomizeBranding || (profile?.role === "admin" || profile?.role === "super_admin")) && (
            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", marginBottom: "1rem" }}>
              {canCustomizeBranding ? (
                <div style={{ background: "white", borderRadius: "14px", padding: "1rem", border: "1px solid rgba(108,74,182,0.12)" }}>
                  <div style={{ fontWeight: 900, color: "var(--p2)", marginBottom: ".75rem" }}>هوية المدرسة (سوبر أدمن)</div>
                  <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "1fr 1fr" }}>
                    <input
                      className="form-input"
                      style={{ gridColumn: "1 / -1" }}
                      placeholder="اسم المدرسة"
                      value={brandingForm.name}
                      onChange={(e) => setBrandingForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      className="form-input"
                      style={{ gridColumn: "1 / -1" }}
                      placeholder="رابط الشعار (اختياري)"
                      value={brandingForm.logo_url}
                      onChange={(e) => setBrandingForm((prev) => ({ ...prev, logo_url: e.target.value }))}
                    />
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gray)" }}>
                      اللون الأساسي
                      <input
                        type="color"
                        className="form-input"
                        style={{ height: "44px", padding: ".2rem", marginTop: ".25rem" }}
                        value={brandingForm.primary_color || "#4f8cff"}
                        onChange={(e) => setBrandingForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                      />
                    </label>
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gray)" }}>
                      اللون الثانوي
                      <input
                        type="color"
                        className="form-input"
                        style={{ height: "44px", padding: ".2rem", marginTop: ".25rem" }}
                        value={brandingForm.secondary_color || "#79d7ff"}
                        onChange={(e) => setBrandingForm((prev) => ({ ...prev, secondary_color: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div
                    style={{
                      marginTop: ".7rem",
                      borderRadius: "16px",
                      padding: ".85rem",
                      background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}14, ${brandingForm.secondary_color || "#79d7ff"}18)`,
                      border: "1px solid rgba(108,74,182,0.12)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      {brandingForm.logo_url ? (
                        <img
                          src={brandingForm.logo_url}
                          alt={brandingForm.name || "School logo"}
                          style={{ width: "50px", height: "50px", borderRadius: "14px", objectFit: "cover", border: "1px solid rgba(15,23,42,0.08)", background: "#fff" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "14px",
                            display: "grid",
                            placeItems: "center",
                            background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}, ${brandingForm.secondary_color || "#79d7ff"})`,
                            color: "#fff",
                            fontWeight: 900,
                          }}
                        >
                          {(brandingForm.name || "S").trim().charAt(0) || "S"}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 900, color: "var(--p2)" }}>{brandingForm.name || "اسم المدرسة"}</div>
                        <div style={{ fontSize: ".72rem", color: "var(--gray)" }}>
                          هذه الألوان ستنعكس على الأزرار والخلفيات والطباعة بالكامل.
                        </div>
                      </div>
                    </div>
                  </div>
                  {brandingNotice ? (
                    <div style={{ marginTop: ".55rem", fontSize: ".75rem", color: brandingNotice.includes("تعذر") ? "#DC2626" : "#15803D", fontWeight: 700 }}>
                      {brandingNotice}
                    </div>
                  ) : null}
                  <div style={{ marginTop: ".7rem", display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
                    <button
                      className="fee-btn-outline"
                      onClick={() => void deriveDashboardBrandingFromLogo()}
                      disabled={brandingDeriving}
                    >
                      {brandingDeriving ? "جارٍ تحليل الشعار..." : "استخراج الألوان من الشعار"}
                    </button>
                    <button className="fee-btn" onClick={() => void saveBrandingFromDashboard()} disabled={brandingSaving}>
                      {brandingSaving ? "جارٍ الحفظ..." : "حفظ الهوية"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ background: "white", borderRadius: "14px", padding: "1rem", border: "1px solid rgba(108,74,182,0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".65rem" }}>
                  <div style={{ fontWeight: 900, color: "var(--p2)" }}>
                    الإشعارات {notificationsEnabled ? `(${unreadNotifications} غير مقروءة)` : ""}
                  </div>
                  {notificationsEnabled ? (
                    <button className="fee-btn-outline" style={{ fontSize: ".72rem", padding: ".35rem .65rem" }} onClick={() => void fetchDashboardNotifications()}>
                      تحديث
                    </button>
                  ) : null}
                </div>
                {!notificationsEnabled ? (
                  <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>
                    جدول الإشعارات غير مفعّل في قاعدة البيانات الحالية.
                  </div>
                ) : notificationsLoading ? (
                  <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>جارٍ تحميل الإشعارات...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>لا توجد إشعارات جديدة حالياً.</div>
                ) : (
                  <div style={{ display: "grid", gap: ".45rem" }}>
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void markNotificationAsRead(item.id)}
                        style={{
                          textAlign: "right",
                          border: "1px solid rgba(108,74,182,0.1)",
                          background: item.is_read ? "#F8FAFC" : "#EEF6FF",
                          borderRadius: "10px",
                          padding: ".55rem .65rem",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--dark)" }}>{item.title || "تنبيه جديد"}</div>
                        <div style={{ fontSize: ".72rem", color: "var(--gray)", marginTop: ".2rem" }}>{item.message || "بدون تفاصيل إضافية"}</div>
                        <div style={{ fontSize: ".66rem", color: "var(--gray)", marginTop: ".25rem" }}>
                          {item.created_at ? formatDate(item.created_at) : "—"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

            {/* ── جدول / بطاقات الأقساط (عند الطلب) ── */}
            {canManageClasses && showFeesTable && (
              <div className="fees-section">
                <div className="section-header">
                  <div className="section-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                    <AppIcon token="💰" size={16} />
                    Tuition rates by class
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

            {/* إحصائيات سريعة */}
            <div className="row1">
              {([
                ["إجمالي الطلاب", formatNumber(students.length), "#EDE8FA","#6C4AB6"],
                ["الطلاب المنقولون", formatNumber(students.filter(s=>s.status==="transferred").length), "#DBEAFE","#3B82F6"],
                ["إجمالي الرسوم", `د.ع ${formatNumber(totalFees)}`, "#FEF3C7","#F59E0B"],
                ["المبلغ المدفوع", `د.ع ${formatNumber(totalPaid)}`, "#D1FAE5","#10B981"],
              ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                <div className="sc" key={i}>
                  <div className="sc-ico" style={{background:bg}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/></svg>
                  </div>
                  <div><div className="sc-label">{l}</div><div className="sc-val">{v}</div></div>
                </div>
              ))}
            </div>
            <div className="row2">
              {([
                ["الرصيد المتبقي", `د.ع ${formatNumber(totalRemaining)}`, "#FEE2E2","#EF4444"],
                ["رواتب هذا الشهر", "د.ع 0", "#EDE9FE","#8B5CF6"],
              ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                <div className="sc" key={i}>
                  <div className="sc-ico" style={{background:bg}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div><div className="sc-label">{l}</div><div className="sc-val">{v}</div></div>
                </div>
              ))}
            </div>

            {/* لوحة التحليل المالي */}
            <div className="analysis-section">
              <div className="section-header">
                <div className="section-title" style={{display:"flex",alignItems:"center",gap:".35rem"}}>
                  <AppIcon token="📊" size={16} />
                  لوحة التحليل المالي الكلي
                </div>
              </div>
              <div className="fin-stats">
                {([
                  ["إجمالي المبلغ المطلوب", totalFees, "#EDE8FA","#4C2F9E"],
                  ["التخفيض", totalDiscount, "#FEF3C7","#F59E0B"],
                  ["الواردات بعد التخفيض", afterDiscount, "#DBEAFE","#3B82F6"],
                  ["المبالغ المستحصلة", totalPaid, "#D1FAE5","#10B981"],
                  ["المبلغ المتبقي", totalRemaining, "#FEE2E2","#EF4444"],
                ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                  <div className="fin-card" key={i} style={{background:bg}}>
                    <div className="fin-label" style={{color:c}}>{l}</div>
                    <div className="fin-val" style={{color:c}}>د.ع {formatNumber(v)}</div>
                  </div>
                ))}
              </div>
              <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
              <div className="progress-section">
                <div className="progress-title">تقدم الدفع</div>
                <div className="prog-row">
                  <span className="prog-label">المبلغ المدفوع</span>
                  <div className="prog-bar"><div className="prog-fill" style={{width:`${paidPct}%`,background:"#10B981"}}/></div>
                  <span className="prog-val" style={{color:"#10B981"}}>د.ع {formatNumber(totalPaid)}</span>
                </div>
                <div className="prog-row">
                  <span className="prog-label">المبلغ المتبقي</span>
                  <div className="prog-bar"><div className="prog-fill" style={{width:`${remainingPct}%`,background:"#F59E0B"}}/></div>
                  <span className="prog-val" style={{color:"#F59E0B"}}>د.ع {formatNumber(totalRemaining)}</span>
                </div>
                <div className="prog-total">إجمالي المبلغ المطلوب: د.ع {formatNumber(totalFees)}</div>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="panel">
                <div className="ph">
                  <span className="pt" style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                    <AppIcon token="💳" size={14} />
                    آخر الحسابات
                  </span>
                  <Link href={paymentsPageHref} style={{fontSize:".72rem",color:"var(--p3)",fontWeight:600,textDecoration:"none"}}>عرض الكل</Link>
                </div>
                {recentPayments.length===0?(
                  <div style={{textAlign:"center",color:"var(--gray)",fontSize:".82rem",padding:"1rem"}}>لا توجد دفعات حتى الآن</div>
                ):recentPayments.map((p:any)=>{
                  const s = students.find(st=>st.id===p.student_id);
                  return <div className="pay-item" key={p.id}>
                    <div className="pay-av">{(s?.full_name||"؟")[0]}</div>
                    <div style={{flex:1}}>
                      <div className="pay-name">{s?.full_name||"—"}</div>
                      <div className="pay-meta">{s?.class_name} • {formatDate(p.created_at)}</div>
                    </div>
                    <div style={{fontWeight:800,color:"#10B981",fontSize:".8rem"}}>د.ع {formatNumber(p.amount)}</div>
                  </div>;
                })}
              </div>
              <div className="panel">
                <div className="ph">
                  <span className="pt" style={{color:"#EF4444",display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                    <AppIcon token="⚠️" size={14} />
                    Overdue students
                  </span>
                  <Link href={paymentsPageHref} style={{fontSize:".72rem",color:"var(--p3)",fontWeight:600,textDecoration:"none"}}>عرض الكل</Link>
                </div>
                {overdueStudents.length===0?(
                  <div style={{textAlign:"center",color:"#10B981",fontSize:".82rem",padding:"1rem",display:"flex",alignItems:"center",justifyContent:"center",gap:".3rem"}}>
                    <AppIcon token="✓" size={14} />
                    No overdue students
                  </div>
                ):overdueStudents.map(s=>(
                  <div className="ov-card" key={s.id}>
                    <div className="ov-name">{s.full_name}</div>
                    <div className="ov-class">{s.class_name}</div>
                    <div className="ov-amt">د.ع {formatNumber(s.remaining_fee)}</div>
                  </div>
                ))}
              </div>
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
              <div style={{background:"#F8F6FF",borderRadius:"12px",padding:"1rem",marginBottom:"1rem"}}>
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
            <div style={{background:"white",borderRadius:"12px",padding:"1rem",border:"1px solid rgba(108,74,182,0.1)"}}>
              <div style={{fontSize:".85rem",fontWeight:700,color:"var(--p2)",marginBottom:".6rem"}}>الصفوف الدراسية</div>
              {classes.length === 0 ? (
                <div style={{textAlign:"center",color:"var(--gray)",padding:"2rem",fontSize:".8rem"}}>لا توجد صفوف مضافة</div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                  <thead>
                    <tr style={{background:"#EDE8FA",color:"var(--p2)"}}>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>عدد الشعب</th>
                      <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => {
                      const clsSections = sections.filter(s => s.class_id === cls.id);
                      return (
                        <tr key={cls.id} style={{borderBottom:"1px solid rgba(108,74,182,0.05)"}}>
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
              <div style={{background:"white",borderRadius:"12px",padding:"1rem",marginTop:"1rem",border:"1px solid rgba(108,74,182,0.1)"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--p2)",marginBottom:".6rem"}}>الشعب الدراسية</div>
                {sections.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--gray)",padding:"2rem",fontSize:".8rem"}}>لا توجد شعب مضافة</div>
                ) : (
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                    <thead>
                      <tr style={{background:"#EDE8FA",color:"var(--p2)"}}>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الشعبة</th>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                        <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(sec => {
                        const cls = classes.find(c => c.id === sec.class_id);
                        return (
                          <tr key={sec.id} style={{borderBottom:"1px solid rgba(108,74,182,0.05)"}}>
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
