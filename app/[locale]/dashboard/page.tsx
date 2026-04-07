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
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

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
  stats?: {
    count: number;
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    paidPct: number;
  };
}

interface DashboardNotification {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

type DashboardTotals = {
  studentsCount: number;
  transferredCount: number;
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalRemaining: number;
  afterDiscount: number;
  paidPct: number;
  remainingPct: number;
};

type DashboardRecentPayment = {
  id: string;
  amount: number;
  created_at: string | null;
  student_id: string | null;
  student_name: string | null;
  class_name: string | null;
};

type DashboardOverdueStudent = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  remaining_fee: number;
};

const EMPTY_DASHBOARD_TOTALS: DashboardTotals = {
  studentsCount: 0,
  transferredCount: 0,
  totalFees: 0,
  totalPaid: 0,
  totalDiscount: 0,
  totalRemaining: 0,
  afterDiscount: 0,
  paidPct: 0,
  remainingPct: 0,
};

export default function DashboardPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);
  const [dashboardTotals, setDashboardTotals] = useState<DashboardTotals>(EMPTY_DASHBOARD_TOTALS);
  const [recentPayments, setRecentPayments] = useState<DashboardRecentPayment[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<DashboardOverdueStudent[]>([]);
  const [studentCountByClass, setStudentCountByClass] = useState<Record<string, number>>({});
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
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
      setLoading(false);
      return;
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        totals?: DashboardTotals;
        recentPayments?: DashboardRecentPayment[];
        overdueStudents?: DashboardOverdueStudent[];
        classFees?: ClassFee[];
        studentCountByClass?: Record<string, number>;
        error?: { message?: string };
      }>(`/api/web/dashboard/overview?schoolId=${encodeURIComponent(schoolId)}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل لوحة التحكم.");
      }

      setDashboardTotals(payload?.totals ?? EMPTY_DASHBOARD_TOTALS);
      setRecentPayments(payload?.recentPayments ?? []);
      setOverdueStudents(payload?.overdueStudents ?? []);
      setStudentCountByClass(payload?.studentCountByClass ?? {});
      setClassFees(payload?.classFees ?? []);
    } catch {
      setDashboardTotals(EMPTY_DASHBOARD_TOTALS);
      setRecentPayments([]);
      setOverdueStudents([]);
      setStudentCountByClass({});
      setClassFees([]);
    } finally {
      setLoading(false);
    }
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchClassFees = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

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

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      school?: {
        name?: string | null;
        logo_url?: string | null;
        primary_color?: string | null;
        secondary_color?: string | null;
      };
      schemaCompat?: { schoolColors?: boolean };
      error?: { message?: string };
    }>(`/api/web/dashboard/branding?schoolId=${encodeURIComponent(schoolId)}`);

    if (!response.ok || !payload?.school) {
      setBrandingNotice(payload?.error?.message || "تعذر تحميل الهوية البصرية.");
      return;
    }

    const compat = {
      schoolColors: Boolean(payload.schemaCompat?.schoolColors),
    };
    const storedBranding = getStoredSchoolBranding(schoolId);
    const school = payload.school;

    let primaryColor =
      compat.schoolColors && typeof school.primary_color === "string"
        ? school.primary_color
        : storedBranding?.primaryColor || "";
    let secondaryColor =
      compat.schoolColors && typeof school.secondary_color === "string"
        ? school.secondary_color
        : storedBranding?.secondaryColor || "";

    if (!primaryColor || !secondaryColor) {
      const derivedPalette = await derivePaletteFromLogo(
        typeof school.logo_url === "string" ? school.logo_url : null,
        typeof school.name === "string" ? school.name : "",
      );
      primaryColor = primaryColor || derivedPalette.primaryColor;
      secondaryColor = secondaryColor || derivedPalette.secondaryColor;
    }
    setBrandingForm({
      name: school.name || "",
      logo_url: school.logo_url || "",
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
    if (!brandingForm.name.trim()) {
      setBrandingNotice("اسم المدرسة مطلوب قبل الحفظ.");
      setBrandingSaving(false);
      return;
    }

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      schemaCompat?: { schoolColors?: boolean };
      error?: { message?: string };
    }>("/api/web/dashboard/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId,
        name: brandingForm.name.trim(),
        logo_url: brandingForm.logo_url.trim() || null,
        primary_color: brandingForm.primary_color || null,
        secondary_color: brandingForm.secondary_color || null,
      }),
    });

    if (!response.ok) {
      setBrandingNotice(`تعذر حفظ الهوية: ${payload?.error?.message || "خطأ غير متوقع"}`);
      setBrandingSaving(false);
      return;
    }

    const compat = {
      schoolColors: Boolean(payload?.schemaCompat?.schoolColors),
    };
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
    return (
      cf.stats ?? {
        count: studentCountByClass[cf.class_name] ?? 0,
        totalExpected: 0,
        totalPaid: 0,
        totalRemaining: 0,
        paidPct: 0,
      }
    );
  }

  const totalFees = dashboardTotals.totalFees;
  const totalPaid = dashboardTotals.totalPaid;
  const totalDiscount = dashboardTotals.totalDiscount;
  const totalRemaining = dashboardTotals.totalRemaining;
  const afterDiscount = dashboardTotals.afterDiscount;
  const paidPct = dashboardTotals.paidPct;
  const remainingPct = dashboardTotals.remainingPct;

  const barData = [
    { name: "إجمالي الرسوم", value: totalFees, fill: "#3b82f6" },
    { name: "الواردات بعد الخصم", value: afterDiscount, fill: "#3B82F6" },
    { name: "المدفوع", value: totalPaid, fill: "#10B981" },
    { name: "الخصم", value: totalDiscount, fill: "#F59E0B" },
    { name: "المتبقي", value: totalRemaining, fill: "#EF4444" },
  ];

  const pieData = [
    { name: "المدفوع", value: totalPaid, color: "#10B981" },
    { name: "المتبقي", value: totalRemaining, color: "#F59E0B" },
  ];

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
    <div className="app-layout">
      <AppSidebar currentPath="/dashboard" />

      <div className="app-main">
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
            <div className="toolbar mb-4">
              <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={openNewFee}>
                <AppIcon token="payments" size={14} />
                إضافة قسط دراسي
              </button>
              <button className="ui-button ui-button--secondary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={() => setShowFeesTable(v=>!v)}>
                <AppIcon token="reports" size={14} />
                {showFeesTable ? "إخفاء الجدول" : "عرض جدول الأقساط"}
              </button>
              <button className="ui-button ui-button--secondary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={() => setShowClassesModal(true)}>
                <AppIcon token="schools" size={14} />
                إدارة الصفوف والشعب
              </button>
            </div>
          )}

          {(canCustomizeBranding || (profile?.role === "admin" || profile?.role === "super_admin")) && (
            <div className="grid gap-3 mb-4" style={{gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))"}}>
              {canCustomizeBranding ? (
                <div className="content-card p-4">
                  <div className="content-card__title mb-3">هوية المدرسة (سوبر أدمن)</div>
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
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                      اللون الأساسي
                      <input
                        type="color"
                        className="form-input"
                        style={{ height: "44px", padding: ".2rem", marginTop: ".25rem" }}
                        value={brandingForm.primary_color || "#4f8cff"}
                        onChange={(e) => setBrandingForm((prev) => ({ ...prev, primary_color: e.target.value }))}
                      />
                    </label>
                    <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--text-secondary)" }}>
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
                      borderRadius: "var(--radius-md)",
                      padding: ".85rem",
                      background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}14, ${brandingForm.secondary_color || "#79d7ff"}18)`,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                      {brandingForm.logo_url ? (
                        <img
                          src={brandingForm.logo_url}
                          alt={brandingForm.name || "School logo"}
                          style={{ width: "50px", height: "50px", borderRadius: "12px", objectFit: "cover", border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "50px", height: "50px", borderRadius: "12px",
                            display: "grid", placeItems: "center",
                            background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}, ${brandingForm.secondary_color || "#79d7ff"})`,
                            color: "#fff", fontWeight: 900,
                          }}
                        >
                          {(brandingForm.name || "S").trim().charAt(0) || "S"}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 900, color: "var(--text-primary)" }}>{brandingForm.name || "اسم المدرسة"}</div>
                        <div style={{ fontSize: ".72rem", color: "var(--text-tertiary)" }}>
                          هذه الألوان ستنعكس على الأزرار والخلفيات والطباعة بالكامل.
                        </div>
                      </div>
                    </div>
                  </div>
                  {brandingNotice ? (
                    <div style={{ marginTop: ".55rem", fontSize: ".75rem", color: brandingNotice.includes("تعذر") ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
                      {brandingNotice}
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2 flex-wrap mt-3">
                    <button
                      className="ui-button ui-button--secondary h-9 px-3 text-sm"
                      onClick={() => void deriveDashboardBrandingFromLogo()}
                      disabled={brandingDeriving}
                    >
                      {brandingDeriving ? "جارٍ تحليل الشعار..." : "استخراج الألوان من الشعار"}
                    </button>
                    <button className="ui-button ui-button--primary h-9 px-4 text-sm" onClick={() => void saveBrandingFromDashboard()} disabled={brandingSaving}>
                      {brandingSaving ? "جارٍ الحفظ..." : "حفظ الهوية"}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="content-card p-4">
                <div className="content-card__header" style={{padding:0,border:0,marginBottom:".65rem"}}>
                  <div className="content-card__title">
                    الإشعارات {notificationsEnabled ? `(${unreadNotifications} غير مقروءة)` : ""}
                  </div>
                  {notificationsEnabled ? (
                    <button className="ui-button ui-button--secondary h-7 px-2.5 text-xs" onClick={() => void fetchDashboardNotifications()}>
                      تحديث
                    </button>
                  ) : null}
                </div>
                {!notificationsEnabled ? (
                  <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)" }}>
                    جدول الإشعارات غير مفعّل في قاعدة البيانات الحالية.
                  </div>
                ) : notificationsLoading ? (
                  <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)" }}>جارٍ تحميل الإشعارات...</div>
                ) : notifications.length === 0 ? (
                  <div style={{ fontSize: ".75rem", color: "var(--text-tertiary)" }}>لا توجد إشعارات جديدة حالياً.</div>
                ) : (
                  <div style={{ display: "grid", gap: ".45rem" }}>
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void markNotificationAsRead(item.id)}
                        style={{
                          textAlign: "start",
                          border: "1px solid var(--border)",
                          background: item.is_read ? "var(--background)" : "var(--primary-subtle)",
                          borderRadius: "var(--radius-sm)",
                          padding: ".55rem .65rem",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--text-primary)" }}>{item.title || "تنبيه جديد"}</div>
                        <div style={{ fontSize: ".72rem", color: "var(--text-secondary)", marginTop: ".2rem" }}>{item.message || "بدون تفاصيل إضافية"}</div>
                        <div style={{ fontSize: ".66rem", color: "var(--text-tertiary)", marginTop: ".25rem" }}>
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
              <div className="content-card mb-4">
                <div className="content-card__header">
                  <div className="content-card__title flex items-center gap-1.5">
                    <AppIcon token="payments" size={15} />
                    الرسوم الدراسية حسب الصف
                  </div>
                  <button className="ui-button ui-button--primary h-8 px-3 text-xs" onClick={openNewFee}>
                    + إضافة قسط
                  </button>
                </div>

                {classFees.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
                    لا توجد أقساط مضافة حتى الآن. اضغط على "إضافة قسط دراسي" للبدء.
                  </div>
                ) : (<>
                  {/* بطاقات سريعة */}
                  <div className="flex gap-3 flex-wrap p-4 pb-0">
                    {classFees.map(cf => {
                      const stats = getClassStats(cf);
                      return (
                        <button
                          key={cf.id}
                          onClick={() => openEditFee(cf)}
                          className="text-start border border-[var(--border)] rounded-[var(--radius-md)] p-3 min-w-[180px] flex-1 hover:border-[var(--primary)] transition-colors"
                          style={{background:"var(--background)"}}
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1 mb-1">
                            <AppIcon token="schools" size={12} />
                            {cf.class_name}
                          </div>
                          <div className="text-base font-black text-[var(--text-primary)]">د.ع {formatNumber(cf.total_fee)}</div>
                          <div className="text-xs text-[var(--text-tertiary)] mb-1">إجمالي الموسم</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            لكل قسط: <span className="font-bold text-[var(--primary)]">د.ع {formatNumber(cf.installment_amount)}</span>
                            <span className="ms-1 badge badge--info">×{cf.installments}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className="text-[var(--text-tertiary)]">{stats.count} طالب</span>
                            <span className="font-bold text-[var(--success)]">{stats.paidPct}% مدفوع</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-[var(--success)]" style={{width:`${stats.paidPct}%`}}/>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* جدول تفصيلي */}
                  <div className="content-card__body--flush overflow-x-auto mt-4">
                    <table className="ui-table">
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
                              <td><span className="badge badge--info">{cf.class_name}</span></td>
                              <td style={{fontWeight:800,color:"var(--primary)"}}>د.ع {formatNumber(cf.total_fee)}</td>
                              <td><span className="badge badge--neutral">× {cf.installments} قسط</span></td>
                              <td style={{fontWeight:700,color:"var(--success)"}}>د.ع {formatNumber(cf.installment_amount)}</td>
                              <td style={{textAlign:"center",fontWeight:700}}>{stats.count}</td>
                              <td style={{color:"var(--success)",fontWeight:700}}>د.ع {formatNumber(stats.totalPaid)}</td>
                              <td style={{color:"var(--danger)",fontWeight:700}}>د.ع {formatNumber(stats.totalRemaining)}</td>
                              <td>
                                <div style={{display:"flex",gap:".4rem"}}>
                                  <button className="ui-button ui-button--secondary" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={() => openEditFee(cf)}>تعديل</button>
                                  {deleteConfirm === cf.id ? (
                                    <div style={{display:"flex",gap:".3rem"}}>
                                      <button className="ui-button ui-button--danger" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={() => handleDeleteFee(cf.id)}>تأكيد</button>
                                      <button className="ui-button ui-button--secondary" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={() => setDeleteConfirm(null)}>إلغاء</button>
                                    </div>
                                  ) : (
                                    <button className="ui-button ui-button--danger" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={() => setDeleteConfirm(cf.id)}>حذف</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>)}
              </div>
            )}

            {/* إحصائيات سريعة */}
            <div className="kpi-grid">
              {([
                ["إجمالي الطلاب", formatNumber(dashboardTotals.studentsCount), "rgba(59,130,246,0.10)","var(--primary)"],
                ["الطلاب المنقولون", formatNumber(dashboardTotals.transferredCount), "rgba(59,130,246,0.10)","var(--info)"],
                ["إجمالي الرسوم", `د.ع ${formatNumber(totalFees)}`, "rgba(245,158,11,0.10)","var(--warning)"],
                ["المبلغ المدفوع", `د.ع ${formatNumber(totalPaid)}`, "rgba(16,185,129,0.10)","var(--success)"],
              ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                <div className="kpi-card" key={i}>
                  <div className="kpi-card__icon" style={{background:bg,color:c}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/></svg>
                  </div>
                  <div>
                    <div className="kpi-card__label">{l}</div>
                    <div className="kpi-card__value">{v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="kpi-grid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
              {([
                ["الرصيد المتبقي", `د.ع ${formatNumber(totalRemaining)}`, "rgba(239,68,68,0.10)","var(--danger)"],
                ["رواتب هذا الشهر", "د.ع 0", "rgba(100,116,139,0.10)","var(--text-secondary)"],
              ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                <div className="kpi-card" key={i}>
                  <div className="kpi-card__icon" style={{background:bg,color:c}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div>
                    <div className="kpi-card__label">{l}</div>
                    <div className="kpi-card__value">{v}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* لوحة التحليل المالي */}
            <div className="content-card">
              <div className="content-card__header">
                <h2 className="content-card__title">لوحة التحليل المالي الكلي</h2>
              </div>
              <div className="content-card__body">
                <div className="kpi-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",marginBottom:"1rem"}}>
                  {([
                    ["إجمالي المبلغ المطلوب", totalFees, "rgba(59,130,246,0.10)","var(--primary)"],
                    ["التخفيض", totalDiscount, "rgba(245,158,11,0.10)","var(--warning)"],
                    ["بعد التخفيض", afterDiscount, "rgba(59,130,246,0.10)","var(--info)"],
                    ["المبالغ المستحصلة", totalPaid, "rgba(16,185,129,0.10)","var(--success)"],
                    ["المبلغ المتبقي", totalRemaining, "rgba(239,68,68,0.10)","var(--danger)"],
                  ] as any[]).map(([l,v,bg,c]:any,i:number)=>(
                    <div key={i} className="rounded-[var(--radius-md)] p-3 text-center" style={{background:bg}}>
                      <div className="kpi-card__label mb-1">{l}</div>
                      <div className="text-sm font-black" style={{color:c}}>د.ع {formatNumber(v)}</div>
                    </div>
                  ))}
                </div>
                <DashboardFinanceCharts barData={barData} pieData={pieData} paidPct={paidPct} />
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-bold text-[var(--text-secondary)] mb-2">تقدم الدفع</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-secondary)] min-w-[100px]">المبلغ المدفوع</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--success)] transition-all" style={{width:`${paidPct}%`}}/>
                    </div>
                    <span className="text-xs font-bold text-[var(--success)]">د.ع {formatNumber(totalPaid)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-secondary)] min-w-[100px]">المبلغ المتبقي</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--warning)] transition-all" style={{width:`${remainingPct}%`}}/>
                    </div>
                    <span className="text-xs font-bold text-[var(--warning)]">د.ع {formatNumber(totalRemaining)}</span>
                  </div>
                  <div className="text-center text-sm font-black text-[var(--text-primary)] pt-1">
                    إجمالي المبلغ المطلوب: د.ع {formatNumber(totalFees)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="content-card">
                <div className="content-card__header">
                  <h2 className="content-card__title">آخر الحسابات</h2>
                  <Link href={paymentsPageHref} className="text-xs font-semibold text-[var(--primary)]">عرض الكل</Link>
                </div>
                <div className="content-card__body--flush">
                  {recentPayments.length===0?(
                    <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">لا توجد دفعات حتى الآن</div>
                  ):(
                    <div>
                      {recentPayments.map((p:any)=>(
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-xs font-bold text-[var(--primary)]">
                            {(p.student_name||"؟")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.student_name||"—"}</div>
                            <div className="text-xs text-[var(--text-tertiary)]">{p.class_name || "—"} • {formatDate(p.created_at)}</div>
                          </div>
                          <div className="text-sm font-black text-[var(--success)]">د.ع {formatNumber(p.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="content-card">
                <div className="content-card__header">
                  <h2 className="content-card__title text-[var(--danger)]">طلاب متأخرون</h2>
                  <Link href={paymentsPageHref} className="text-xs font-semibold text-[var(--primary)]">عرض الكل</Link>
                </div>
                <div className="content-card__body--flush">
                  {overdueStudents.length===0?(
                    <div className="p-4 text-center text-sm text-[var(--success)] flex items-center justify-center gap-2">
                      <span>✓</span> لا يوجد طلاب متأخرون
                    </div>
                  ):(
                    <div>
                      {overdueStudents.map(s=>(
                        <div key={s.id} className="px-4 py-3 border-b border-[var(--border)] last:border-0" style={{background:"rgba(239,68,68,0.03)"}}>
                          <div className="text-sm font-bold text-[var(--text-primary)]">{s.full_name}</div>
                          <div className="text-xs text-[var(--text-tertiary)]">{s.class_name}</div>
                          <div className="text-sm font-black text-[var(--danger)] mt-0.5">د.ع {formatNumber(s.remaining_fee)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
          <div className="modal-header">
            <AppIcon token="schools" size={18} />
            إدارة الصفوف والشعب الدراسية
          </div>

          <div style={{marginBottom:"1rem"}}>
            <div className="flex flex-wrap gap-2 mb-3">
              <button className="ui-button ui-button--primary" style={{fontSize:".75rem",height:"2rem",padding:"0 .75rem"}} onClick={() => {setEditingClass(null);setClassForm({name:"",sections:[""]});setShowClassForm(true);setShowSectionForm(false);}}>+ إضافة صف جديد</button>
              <button className="ui-button ui-button--primary" style={{fontSize:".75rem",height:"2rem",padding:"0 .75rem"}} onClick={() => {setEditingSection(null);setSectionForm({class_id:"",name:""});setShowSectionForm(true);setShowClassForm(false);}}>+ إضافة شعبة جديدة</button>
              <button className="ui-button ui-button--secondary" style={{fontSize:".75rem",height:"2rem",padding:"0 .75rem"}} onClick={() => setShowSectionsTable(v=>!v)}>{showSectionsTable ? "إخفاء الشعب" : "عرض الشعب"}</button>
            </div>

            {/* نموذج إضافة/تعديل صف */}
            {(showClassForm || editingClass) && (
              <div style={{background:"var(--primary-subtle)",borderRadius:"var(--radius-md)",padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(59,130,246,0.15)"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--primary)",marginBottom:".6rem"}}>{editingClass ? "تعديل الصف" : "إضافة صف جديد"}</div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">اسم الصف <span>*</span></label>
                    <input className="form-input" value={classForm.name} onChange={e=>setClassForm({...classForm,name:e.target.value})} placeholder="مثال: الصف الخامس"/>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">الشعب <span style={{fontWeight:400,color:"var(--text-tertiary)",fontSize:".7rem"}}>(كل شعبة في سطر — مثال: أ، ب، ج)</span></label>
                    <textarea className="form-input" rows={3} value={classForm.sections.join('\n')} onChange={e=>setClassForm({...classForm,sections:e.target.value.split('\n')})} placeholder={"أ\nب\nج"} style={{resize:"none"}}/>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-3">
                  <button className="ui-button ui-button--secondary" style={{fontSize:".8rem",height:"2.1rem",padding:"0 .875rem"}} onClick={()=>{setEditingClass(null);setClassForm({name:"",sections:[""]});setShowClassForm(false);}}>إلغاء</button>
                  <button className="ui-button ui-button--primary" style={{fontSize:".8rem",height:"2.1rem",padding:"0 .875rem"}} onClick={handleSaveClass}>{editingClass ? "حفظ التعديلات" : "إضافة صف"}</button>
                </div>
              </div>
            )}

            {/* نموذج إضافة/تعديل شعبة */}
            {(showSectionForm || editingSection) && (
              <div style={{background:"rgba(16,185,129,0.07)",borderRadius:"var(--radius-md)",padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(16,185,129,0.20)"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--success)",marginBottom:".6rem"}}>{editingSection ? "تعديل الشعبة" : "إضافة شعبة جديدة"}</div>
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
                <div className="flex gap-2 justify-end mt-3">
                  <button className="ui-button ui-button--secondary" style={{fontSize:".8rem",height:"2.1rem",padding:"0 .875rem"}} onClick={()=>{setEditingSection(null);setSectionForm({class_id:"",name:""});setShowSectionForm(false);}}>إلغاء</button>
                  <button className="ui-button ui-button--primary" style={{fontSize:".8rem",height:"2.1rem",padding:"0 .875rem"}} onClick={handleSaveSection}>{editingSection ? "حفظ التعديلات" : "إضافة شعبة"}</button>
                </div>
              </div>
            )}
            <div style={{background:"var(--surface-strong)",borderRadius:"var(--radius-md)",padding:"1rem",border:"1px solid var(--border)"}}>
              <div style={{fontSize:".85rem",fontWeight:700,color:"var(--text-primary)",marginBottom:".6rem"}}>الصفوف الدراسية</div>
              {classes.length === 0 ? (
                <div style={{textAlign:"center",color:"var(--text-tertiary)",padding:"2rem",fontSize:".8rem"}}>لا توجد صفوف مضافة</div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                  <thead>
                    <tr style={{background:"var(--primary-subtle)",color:"var(--primary)"}}>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                      <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>عدد الشعب</th>
                      <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => {
                      const clsSections = sections.filter(s => s.class_id === cls.id);
                      return (
                        <tr key={cls.id} style={{borderBottom:"1px solid var(--border)"}}>
                          <td style={{padding:".5rem",fontWeight:600}}>{cls.name}</td>
                          <td style={{padding:".5rem"}}>{clsSections.length} شعبة</td>
                          <td style={{padding:".5rem",textAlign:"center"}}>
                            <button className="ui-button ui-button--secondary" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem",marginInlineEnd:".25rem"}} onClick={()=>{setEditingClass(cls);setClassForm({name:cls.name,sections:clsSections.map(s=>s.name)});setShowClassForm(true);setShowSectionForm(false);}}>تعديل</button>
                            <button className="ui-button ui-button--danger" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={()=>handleDeleteClass(cls.id)}>حذف</button>
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
              <div style={{background:"var(--surface-strong)",borderRadius:"var(--radius-md)",padding:"1rem",marginTop:"1rem",border:"1px solid var(--border)"}}>
                <div style={{fontSize:".85rem",fontWeight:700,color:"var(--text-primary)",marginBottom:".6rem"}}>الشعب الدراسية</div>
                {sections.length === 0 ? (
                  <div style={{textAlign:"center",color:"var(--text-tertiary)",padding:"2rem",fontSize:".8rem"}}>لا توجد شعب مضافة</div>
                ) : (
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
                    <thead>
                      <tr style={{background:"var(--primary-subtle)",color:"var(--primary)"}}>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الشعبة</th>
                        <th style={{padding:".5rem",textAlign:"right",fontWeight:800}}>الصف</th>
                        <th style={{padding:".5rem",textAlign:"center",fontWeight:800}}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map(sec => {
                        const cls = classes.find(c => c.id === sec.class_id);
                        return (
                          <tr key={sec.id} style={{borderBottom:"1px solid var(--border)"}}>
                            <td style={{padding:".5rem",fontWeight:600}}>{sec.name}</td>
                            <td style={{padding:".5rem"}}>{cls?.name || "—"}</td>
                            <td style={{padding:".5rem",textAlign:"center"}}>
                              <button className="ui-button ui-button--secondary" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem",marginInlineEnd:".25rem"}} onClick={()=>{setEditingSection(sec);setSectionForm({class_id:sec.class_id,name:sec.name});setShowSectionForm(true);setShowClassForm(false);}}>تعديل</button>
                              <button className="ui-button ui-button--danger" style={{fontSize:".72rem",height:"1.75rem",padding:"0 .6rem"}} onClick={()=>handleDeleteSection(sec.id)}>حذف</button>
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
            <button className="ui-button ui-button--secondary" onClick={() => { setShowClassesModal(false); setEditingClass(null); setClassForm({name:"",sections:[""]}); setShowClassForm(false); setShowSectionForm(false); setEditingSection(null); setSectionForm({class_id:"",name:""}); }}>
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
          <div className="modal-header">
            <AppIcon token={editingFee ? "reports" : "payments"} size={18} />
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
              {editingFee && <span style={{fontSize:".67rem",color:"var(--text-tertiary)"}}>لا يمكن تغيير اسم الصف عند التعديل</span>}
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
              <div style={{textAlign:"end"}}>
                <div className="ip-val">د.ع {formatNumber(Math.round(Number(feeForm.total_fee) / parseInt(feeForm.installments)))}</div>
                <div className="ip-sub">لكل قسط</div>
              </div>
            </div>
          )}

          {/* ربط بالطلاب */}
          {feeForm.class_name && (() => {
            const linked = studentCountByClass[feeForm.class_name.trim()] ?? 0;
            if (linked === 0) return null;
            return (
              <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.20)",borderRadius:"var(--radius-md)",padding:".6rem .9rem",marginBottom:".8rem",fontSize:".75rem",color:"var(--success)"}}>
                <strong style={{display:"inline-flex",alignItems:"center",gap:".3rem"}}>
                  <AppIcon token="students" size={13} />
                  مرتبط بـ {linked} طالب
                </strong>{" "}
                في هذا الصف
              </div>
            );
          })()}

          {feeError && <div className="msg-error"><AppIcon token="reports" size={14} /> {feeError}</div>}
          {feeSuccess && <div className="msg-success">{feeSuccess}</div>}

          <div className="modal-actions">
            <button className="ui-button ui-button--secondary" onClick={() => { setShowFeeModal(false); setEditingFee(null); setFeeError(""); setFeeSuccess(""); }}>
              إلغاء
            </button>
            <button className="ui-button ui-button--primary" onClick={handleSaveFee} disabled={feeLoading}>
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
