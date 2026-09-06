"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Building2,
  GitBranch,
  MapPin,
  Palette,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "@/lib/icons";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { validateLogoUpload } from "@/lib/upload-validation";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { isMissingRelationError } from "@/lib/admin-infrastructure";
import type { AppSchemaCompat } from "@/lib/schema-compat";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { requestRuntimeBrandingRefresh } from "@/hooks/brand";
import {
  derivePaletteFromLogo,
  mixColors,
  shiftColor,
} from "@/lib/brand/palette";
import {
  BRAND_THEME_FAMILIES,
  getBrandThemePreset,
  type BrandThemeFamilyId,
  type BrandThemePreset,
  type BrandThemePresetId,
} from "@/lib/brand/themes";
import { DEFAULT_SCHOOL_BRANDING } from "../_components/types";
import { MigrationNotice, cx } from "./UI";
import { logAction } from "@/lib/audit";

function buildUploadErrorMessage(reason?: string | null) {
  const normalizedReason = reason?.trim();
  return normalizedReason
    ? `تعذر رفع الصورة: ${normalizedReason}`
    : "تعذر رفع الصورة: نوع الملف غير مدعوم. الرجاء رفع صورة PNG أو JPEG أو WebP.";
}

type BranchSchool = {
  id: string;
  name: string;
};

type BranchRecord = {
  id: string;
  name: string;
  school_id: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  primary_color?: string | null;
  secondary_color?: string | null;
  sidebar_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  logo_url?: string | null;
  receipt_bg_url?: string | null;
  font_family?: string | null;
  topbar_color?: string | null;
  receipt_footer_text?: string | null;
  card_bg_url?: string | null;
  short_name?: string | null;
  schools?: { name: string | null } | null;
  [key: string]: unknown;
};

type BranchFormData = {
  name: string;
  school_id: string;
  address: string;
  phone: string;
  is_active: boolean;
  family_id: BrandThemeFamilyId | "";
  theme_preset_id: BrandThemePresetId | "";
  primary_color: string;
  secondary_color: string;
  sidebar_color: string;
  accent_color: string;
  text_color: string;
  logo_url: string;
  receipt_bg_url: string;
  font_family: string;
  topbar_color: string;
  receipt_footer_text: string;
  card_bg_url: string;
  short_name: string;
};

function createInitialFormState(): BranchFormData {
  return {
    name: "",
    school_id: "",
    address: "",
    phone: "",
    is_active: true,
    family_id: "",
    theme_preset_id: "",
    primary_color: DEFAULT_SCHOOL_BRANDING.primary_color,
    secondary_color: DEFAULT_SCHOOL_BRANDING.secondary_color,
    sidebar_color: DEFAULT_SCHOOL_BRANDING.sidebar_color,
    accent_color: DEFAULT_SCHOOL_BRANDING.accent_color,
    text_color: DEFAULT_SCHOOL_BRANDING.text_color,
    logo_url: "",
    receipt_bg_url: "",
    font_family: "",
    topbar_color: "",
    receipt_footer_text: "",
    card_bg_url: "",
    short_name: "",
  };
}

function buildSuggestedBranchBranding(primaryColor: string, secondaryColor: string) {
  const primary = primaryColor || DEFAULT_SCHOOL_BRANDING.primary_color;
  const secondary = secondaryColor || DEFAULT_SCHOOL_BRANDING.secondary_color;

  return {
    primary_color: primary,
    secondary_color: secondary,
    sidebar_color: mixColors(primary, "#eff7ff", 0.52),
    accent_color: shiftColor(primary, -0.08),
    text_color: shiftColor(primary, -0.64),
  };
}

function buildBrandingFromPreset(preset: BrandThemePreset) {
  return {
    family_id: preset.familyId,
    theme_preset_id: preset.id,
    primary_color: preset.primaryColor,
    secondary_color: preset.secondaryColor,
    sidebar_color: preset.sidebarColor,
    accent_color: preset.accentColor,
    text_color: preset.textColor,
  };
}

function findMatchingBranchPreset(branch: Pick<
  BranchRecord,
  "primary_color" | "secondary_color" | "sidebar_color" | "accent_color" | "text_color"
>) {
  const primary = branch.primary_color?.toLowerCase() ?? "";
  const secondary = branch.secondary_color?.toLowerCase() ?? "";
  const sidebar = branch.sidebar_color?.toLowerCase() ?? "";
  const accent = branch.accent_color?.toLowerCase() ?? "";
  const text = branch.text_color?.toLowerCase() ?? "";

  for (const family of BRAND_THEME_FAMILIES) {
    for (const preset of family.presets) {
      if (
        preset.primaryColor.toLowerCase() === primary &&
        preset.secondaryColor.toLowerCase() === secondary &&
        preset.sidebarColor.toLowerCase() === sidebar &&
        preset.accentColor.toLowerCase() === accent &&
        preset.textColor.toLowerCase() === text
      ) {
        return preset;
      }
    }
  }

  return null;
}

const BRANCH_COLOR_SUGGESTIONS: BrandThemePresetId[] = [
  "blue-academic",
  "green-growth",
  "amber-classic",
  "indigo-knowledge",
];

function getBranchSwatch(
  branch: Pick<BranchRecord, "primary_color" | "secondary_color" | "accent_color">,
) {
  return {
    primary: branch.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color,
    secondary: branch.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color,
    accent: branch.accent_color || branch.primary_color || DEFAULT_SCHOOL_BRANDING.accent_color,
  };
}

export function BranchesTab({
  infrastructure,
  schemaCompat,
  schools: externalSchools,
}: {
  infrastructure: AdminInfrastructure;
  schemaCompat: AppSchemaCompat | null;
  schools?: BranchSchool[];
}) {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [schools, setSchools] = useState<BranchSchool[]>(externalSchools ?? []);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [message, setMessage] = useState("");
  const [branchToDelete, setBranchToDelete] = useState<BranchRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState("");
  const [paletteBusy, setPaletteBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [receiptBgUploading, setReceiptBgUploading] = useState(false);
  const [receiptBgError, setReceiptBgError] = useState<string | null>(null);
  const receiptBgInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BranchFormData>(createInitialFormState());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const branchColorsEnabled = Boolean(schemaCompat?.branchColors);
  const branchUiColorsEnabled = Boolean(schemaCompat?.branchUiColors);
  const schoolNameById = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools],
  );
  const quickSuggestions = useMemo(
    () =>
      BRANCH_COLOR_SUGGESTIONS.map((presetId) => getBrandThemePreset(presetId)).filter(
        (preset): preset is BrandThemePreset => Boolean(preset),
      ),
    [],
  );

  const selectedSchoolName = schoolNameById.get(formData.school_id) ?? "";
  const activeFamily =
    BRAND_THEME_FAMILIES.find((family) => family.id === formData.family_id) ?? null;
  const selectedPreset = getBrandThemePreset(formData.theme_preset_id);

  const resetForm = useCallback(() => {
    setEditingBranch(null);
    setFormData(createInitialFormState());
    setSaveError(null);
    setFormNotice("");
  }, []);

  const hydrateFormForBranch = useCallback((branch: BranchRecord | null) => {
    if (!branch) {
      setFormData(createInitialFormState());
      setFormNotice("");
      return;
    }

    const suggested = buildSuggestedBranchBranding(
      branch.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color,
      branch.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color,
    );
    const matchedPreset = findMatchingBranchPreset(branch);

    setFormData({
      name: branch.name,
      school_id: branch.school_id,
      address: branch.address || "",
      phone: branch.phone || "",
      is_active: branch.is_active,
      family_id: matchedPreset?.familyId ?? "",
      theme_preset_id: matchedPreset?.id ?? "",
      primary_color: branch.primary_color || suggested.primary_color,
      secondary_color: branch.secondary_color || suggested.secondary_color,
      sidebar_color: branch.sidebar_color || suggested.sidebar_color,
      accent_color: branch.accent_color || suggested.accent_color,
      text_color: branch.text_color || suggested.text_color,
      logo_url: branch.logo_url || "",
      receipt_bg_url: (branch.receipt_bg_url as string | null | undefined) || "",
      font_family: branch.font_family ?? "",
      topbar_color: branch.topbar_color ?? "",
      receipt_footer_text: branch.receipt_footer_text ?? "",
      card_bg_url: branch.card_bg_url ?? "",
      short_name: branch.short_name ?? "",
    });
    setFormNotice("");
  }, []);

  const fetchData = useCallback(async () => {
    if (!infrastructure.branches) {
      setBranches([]);
      setSchools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      let branchesQuery = supabase.from("branches").select("*, schools(name)");
      let schoolsQuery = supabase.from("schools").select("id, name").eq("is_active", true);

      if (infrastructure.softDeleteBranches) {
        branchesQuery = branchesQuery.is("deleted_at", null);
      }

      if (infrastructure.softDeleteSchools) {
        schoolsQuery = schoolsQuery.is("deleted_at", null);
      }

      const [branchesResult, schoolsResult] = await Promise.all([
        branchesQuery.order("created_at", { ascending: false }),
        schoolsQuery,
      ]);

      let branchesRes = branchesResult;

      if (branchesRes.error && isMissingRelationError(branchesRes.error, "branches", "schools")) {
        setMessage("تم عرض أسماء المدارس للفروع بوضع توافق لأن علاقة الربط مع جدول المدارس غير متاحة حالياً.");
        branchesRes = infrastructure.softDeleteBranches
          ? await supabase
              .from("branches")
              .select("*")
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
          : await supabase.from("branches").select("*").order("created_at", { ascending: false });
      } else {
        setMessage("");
      }

      if (branchesRes.error) throw branchesRes.error;
      if (schoolsResult.error) throw schoolsResult.error;

      const clientSchools = (schoolsResult.data || []) as BranchSchool[];
      const nextSchools = clientSchools.length > 0 ? clientSchools : (externalSchools ?? []);
      const schoolNames = new Map(nextSchools.map((school) => [school.id, school.name]));
      const nextBranches = ((branchesRes.data || []) as BranchRecord[]).map((branch) => ({
        ...branch,
        schools:
          branch.schools ?? (branch.school_id ? { name: schoolNames.get(branch.school_id) ?? null } : null),
      }));

      setBranches(nextBranches);
      setSchools(nextSchools);
    } catch (error) {
      console.error("Fetch branches error:", error);
      setFetchError(
        error instanceof Error ? error.message : "تعذر تحميل بيانات الفروع. تحقق من الصلاحيات أو السجل.",
      );
    } finally {
      setLoading(false);
    }
  }, [infrastructure.branches, infrastructure.softDeleteBranches, infrastructure.softDeleteSchools]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (externalSchools && externalSchools.length > 0) {
      setSchools((prev) => (prev.length === 0 ? externalSchools : prev));
    }
  }, [externalSchools]);

  if (!infrastructure.branches) {
    return (
      <MigrationNotice description="جدول `branches` غير موجود في قاعدة البيانات الحالية. شاشة الفروع ستبقى معطلة حتى يتم توفير جدول الفروع أو تشغيل `admin_infrastructure.sql`." />
    );
  }

  const handleDerivePalette = async () => {
    setPaletteBusy(true);
    setFormNotice("");
    try {
      const palette = await derivePaletteFromLogo(
        null,
        `${formData.name.trim()} ${selectedSchoolName}`.trim(),
      );
      setFormData((current) => ({
        ...current,
        family_id: "",
        theme_preset_id: "",
        ...buildSuggestedBranchBranding(palette.primaryColor, palette.secondaryColor),
      }));
      setFormNotice("تم توليد ألوان مبدئية للفرع ويمكنك تعديلها قبل الحفظ.");
    } catch (error) {
      setFormNotice(
        error instanceof Error ? error.message : "تعذر توليد ألوان الفرع تلقائياً.",
      );
    } finally {
      setPaletteBusy(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = await validateLogoUpload(file, file.type);
    if (!validation.ok) {
      setLogoError(buildUploadErrorMessage(validation.message));
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setLogoUploading(true);
    setLogoError(null);
    try {
      const schoolScope = formData.school_id.trim();
      if (!schoolScope) {
        throw new Error("اختر المدرسة أولاً قبل رفع شعار الفرع.");
      }
      const uploadForm = new FormData();
      uploadForm.set("school_id", schoolScope);
      uploadForm.set("file", file);

      const response = await fetch("/api/web/super-admin/branches/logo", {
        method: "POST",
        body: uploadForm,
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null;
      const uploadedUrl = payload?.url;

      if (!response.ok || typeof uploadedUrl !== "string" || !uploadedUrl) {
        throw new Error(buildUploadErrorMessage(payload?.error?.message));
      }

      setFormData((current) => ({ ...current, logo_url: uploadedUrl }));
    } catch (err) {
      setLogoError(
        err instanceof Error
          ? buildUploadErrorMessage(err.message.replace(/^تعذر رفع الصورة:\s*/, ""))
          : buildUploadErrorMessage(),
      );
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleReceiptBgUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = await validateLogoUpload(file, file.type);
    if (!validation.ok) {
      setReceiptBgError(buildUploadErrorMessage(validation.message));
      if (receiptBgInputRef.current) receiptBgInputRef.current.value = "";
      return;
    }

    setReceiptBgUploading(true);
    setReceiptBgError(null);
    try {
      const schoolScope = formData.school_id.trim();
      if (!schoolScope) {
        throw new Error("اختر المدرسة أولاً قبل رفع خلفية الإيصال.");
      }
      const uploadForm = new FormData();
      uploadForm.set("school_id", schoolScope);
      uploadForm.set("file", file);

      const response = await fetch("/api/web/super-admin/branches/receipt-bg", {
        method: "POST",
        body: uploadForm,
      });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null;
      const uploadedUrl = payload?.url;

      if (!response.ok || typeof uploadedUrl !== "string" || !uploadedUrl) {
        throw new Error(buildUploadErrorMessage(payload?.error?.message));
      }

      setFormData((current) => ({ ...current, receipt_bg_url: uploadedUrl }));
    } catch (err) {
      setReceiptBgError(
        err instanceof Error
          ? buildUploadErrorMessage(err.message.replace(/^تعذر رفع الصورة:\s*/, ""))
          : buildUploadErrorMessage(),
      );
    } finally {
      setReceiptBgUploading(false);
      if (receiptBgInputRef.current) receiptBgInputRef.current.value = "";
    }
  };

  const applyPreset = (preset: BrandThemePreset) => {
    setFormData((current) => ({
      ...current,
      ...buildBrandingFromPreset(preset),
    }));
    setFormNotice(`تم تطبيق الثيم "${preset.label}" من ${preset.familyLabel}.`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        school_id: formData.school_id,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        is_active: formData.is_active,
        logo_url: formData.logo_url.trim() || null,
        receipt_bg_url: formData.receipt_bg_url.trim() || null,
      };

      if (branchColorsEnabled) {
        payload.primary_color = formData.primary_color || null;
        payload.secondary_color = formData.secondary_color || null;
      }

      if (branchUiColorsEnabled) {
        payload.sidebar_color = formData.sidebar_color || null;
        payload.accent_color = formData.accent_color || null;
        payload.text_color = formData.text_color || null;
      }

      payload.font_family = formData.font_family.trim() || null;
      payload.topbar_color = formData.topbar_color.trim() || null;
      payload.receipt_footer_text = formData.receipt_footer_text.trim() || null;
      payload.card_bg_url = formData.card_bg_url.trim() || null;
      payload.short_name = formData.short_name.trim() || null;

      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update(payload)
          .eq("id", editingBranch.id);
        if (error) throw error;
        await logAction({
          action_type: "update",
          entity_type: "branch",
          entity_id: editingBranch.id,
          summary: `تعديل فرع ${formData.name}`,
        });
      } else {
        const { data, error } = await supabase
          .from("branches")
          .insert([payload])
          .select();
        if (error) throw error;
        await logAction({
          action_type: "create",
          entity_type: "branch",
          entity_id: data?.[0]?.id,
          summary: `إضافة فرع جديد: ${formData.name}`,
        });
      }

      setShowForm(false);
      resetForm();
      await fetchData();
      requestRuntimeBrandingRefresh();
    } catch (error) {
      console.error("Submit error:", error);
      setSaveError(
        error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الفرع. حاول مرة أخرى.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!infrastructure.softDeleteBranches) {
      setMessage(
        "أرشفة الفروع تحتاج تشغيل admin_infrastructure.sql لأن عمود deleted_at غير موجود في جدول branches.",
      );
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("branches")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userData.user?.id ?? null,
          is_active: false,
        })
        .eq("id", id);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="space-y-3">
      {message && <MigrationNotice title="ميزة غير مفعلة بالكامل" description={message} />}

      {!branchColorsEnabled && (
        <MigrationNotice
          title="ألوان الفروع تحتاج migration"
          description="إدارة ألوان كل فرع ستظهر هنا فور تشغيل migration `20260421_000000_branch_branding.sql`."
        />
      )}

      {!branchUiColorsEnabled && branchColorsEnabled && (
        <MigrationNotice
          title="ألوان الواجهة المتقدمة غير مفعلة بالكامل"
          description="يمكن حفظ اللونين الأساسي والثانوي الآن، لكن ألوان `sidebar` و`accent` و`text` تحتاج اكتمال migration."
        />
      )}

      {/* Compact header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <span className="text-xs font-black text-[var(--text-primary)]">إدارة فروع المدارس</span>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1 rounded border border-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/20"
        >
          <Plus size={12} />
          إضافة فرع
        </button>
      </div>

      {!infrastructure.softDeleteBranches && (
        <MigrationNotice
          title="الفروع تعمل بدون سلة محذوفات"
          description="يمكن عرض وتعديل الفروع الحالية، لكن الأرشفة والاستعادة تحتاج تشغيل `admin_infrastructure.sql`."
        />
      )}

      {fetchError && (
        <div className="rounded border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-3 py-2 text-xs font-bold text-[var(--danger)] flex items-center justify-between gap-2">
          <span>{fetchError}</span>
          <button
            onClick={() => void fetchData()}
            className="shrink-0 text-[10px] underline hover:no-underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Branch list — compact rows */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="sk h-9 w-full rounded" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد بيانات</p>
      ) : (
        <div>
          {branches.map((branch) => {
            const swatch = getBranchSwatch(branch);
            return (
              <div
                key={branch.id}
                className="flex items-center gap-2 py-1.5 px-2 border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                {/* Color swatch preview */}
                <div
                  className="h-4 w-4 shrink-0 rounded-full border border-white/50 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${swatch.primary}, ${swatch.secondary})` }}
                />

                {/* Logo or icon */}
                {branch.logo_url ? (
                  <Image
                    src={branch.logo_url}
                    alt="شعار الفرع"
                    width={20}
                    height={20}
                    className="rounded border border-[var(--border)] bg-white object-contain p-0.5 shrink-0"
                  />
                ) : (
                  <GitBranch size={12} className="text-[var(--text-muted)] shrink-0" />
                )}

                {/* Name + school */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-[var(--text-primary)]">{branch.name}</span>
                  <span className="ms-1.5 text-[10px] text-[var(--text-muted)]">
                    <Building2 size={9} className="inline me-0.5" />
                    {branch.schools?.name || "—"}
                  </span>
                  {(branch.address || branch.phone) && (
                    <span className="ms-2 text-[10px] text-[var(--text-muted)]">
                      {branch.address && <span><MapPin size={9} className="inline me-0.5" />{branch.address}</span>}
                      {branch.phone && <span className="ms-1"><Phone size={9} className="inline me-0.5" />{branch.phone}</span>}
                    </span>
                  )}
                </div>

                {/* Status */}
                <span
                  className={cx(
                    "ui-pill text-[10px] shrink-0",
                    branch.is_active ? "ui-pill--success" : "ui-pill--danger",
                  )}
                >
                  {branch.is_active ? "نشط" : "موقف"}
                </span>

                {/* Actions */}
                <button
                  onClick={() => {
                    setEditingBranch(branch);
                    hydrateFormForBranch(branch);
                    setShowForm(true);
                    setSaveError(null);
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] shrink-0"
                  title="تعديل"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => setBranchToDelete(branch)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] shrink-0"
                  title="حذف"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal — reduced padding/rounding */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="ui-surface max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl p-4 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-base font-black text-[var(--text-primary)]">
                {editingBranch ? "تعديل فرع" : "إضافة فرع جديد"}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                خصص بيانات الفرع التشغيلية والألوان التي ستظهر للمستخدمين المرتبطين به.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black">المدرسة</label>
                      <select
                        className="ui-input"
                        required
                        value={formData.school_id}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, school_id: event.target.value }))
                        }
                      >
                        <option value="">اختر المدرسة</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black">اسم الفرع</label>
                      <input
                        type="text"
                        className="ui-input"
                        required
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black">العنوان</label>
                      <input
                        type="text"
                        className="ui-input"
                        value={formData.address}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, address: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black">رقم الهاتف</label>
                      <input
                        type="text"
                        className="ui-input"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, phone: event.target.value }))
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2 rounded border border-[var(--border)] px-3 py-2">
                      <input
                        type="checkbox"
                        id="branch_active"
                        checked={formData.is_active}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, is_active: event.target.checked }))
                        }
                      />
                      <label htmlFor="branch_active" className="text-xs font-black">
                        تفعيل الفرع
                      </label>
                    </div>

                    {/* Logo upload */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black">شعار الفرع (اختياري)</label>
                      <div className="flex items-center gap-2">
                        {formData.logo_url ? (
                          <Image
                            src={formData.logo_url}
                            alt="شعار الفرع"
                            width={36}
                            height={36}
                            className="rounded border border-[var(--border)] bg-white object-contain p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] shrink-0">
                            <GitBranch size={14} />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            className="ui-input text-xs"
                            placeholder="رابط الشعار (URL) أو ارفع صورة"
                            value={formData.logo_url}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, logo_url: event.target.value }))
                            }
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={logoUploading}
                              className="ui-button ui-button--secondary h-6 px-2 text-[10px] inline-flex items-center gap-1"
                            >
                              <Upload size={10} />
                              {logoUploading ? "جاري الرفع..." : "رفع صورة"}
                            </button>
                            {formData.logo_url && (
                              <button
                                type="button"
                                onClick={() => setFormData((current) => ({ ...current, logo_url: "" }))}
                                className="text-[10px] font-bold text-rose-500 hover:underline"
                              >
                                إزالة
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          data-testid="branch-logo-input"
                          onChange={handleLogoUpload}
                        />
                      </div>
                      {logoError && (
                        <p role="alert" data-testid="branch-logo-upload-error" className="text-[10px] font-bold text-rose-600">
                          {logoError}
                        </p>
                      )}
                    </div>

                    {/* Receipt background upload */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black">
                        خلفية الإيصال المطبوع (اختياري — سوبر أدمن فقط)
                      </label>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        صورة تُعرض كخلفية شفافة خلف الوصل المطبوع لهذا الفرع. يفضل PNG أو JPEG.
                      </p>
                      <div className="flex items-center gap-2">
                        {formData.receipt_bg_url ? (
                          <Image
                            src={formData.receipt_bg_url}
                            alt="خلفية الإيصال"
                            width={48}
                            height={32}
                            className="rounded border border-[var(--border)] bg-white object-cover shrink-0"
                          />
                        ) : (
                          <div className="inline-flex h-8 w-12 items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[9px] font-bold text-[var(--text-muted)] shrink-0">
                            بدون
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            className="ui-input text-xs"
                            placeholder="رابط الصورة (URL) أو ارفع صورة"
                            value={formData.receipt_bg_url}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, receipt_bg_url: event.target.value }))
                            }
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => receiptBgInputRef.current?.click()}
                              disabled={receiptBgUploading}
                              className="ui-button ui-button--secondary h-6 px-2 text-[10px] inline-flex items-center gap-1"
                            >
                              <Upload size={10} />
                              {receiptBgUploading ? "جاري الرفع..." : "رفع صورة"}
                            </button>
                            {formData.receipt_bg_url && (
                              <button
                                type="button"
                                onClick={() => setFormData((current) => ({ ...current, receipt_bg_url: "" }))}
                                className="text-[10px] font-bold text-rose-500 hover:underline"
                              >
                                إزالة
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          ref={receiptBgInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleReceiptBgUpload}
                        />
                      </div>
                      {receiptBgError && (
                        <p role="alert" className="text-[10px] font-bold text-rose-600">{receiptBgError}</p>
                      )}
                    </div>

                    {/* Advanced settings */}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-3 md:col-span-2">
                      <h4 className="text-xs font-black text-[var(--text-primary)]">إعدادات متقدمة</h4>

                      <div className="space-y-1">
                        <label className="text-xs font-black">الاسم المختصر</label>
                        <input
                          type="text"
                          className="ui-input"
                          placeholder="مثال: فرع المنصور"
                          value={formData.short_name}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, short_name: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black">الخط العربي</label>
                        <select
                          className="ui-input"
                          value={formData.font_family}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, font_family: event.target.value }))
                          }
                        >
                          <option value="">الافتراضي (Noto Sans Arabic)</option>
                          <option value="cairo">Cairo</option>
                          <option value="tajawal">Tajawal</option>
                          <option value="amiri">Amiri</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black">لون الشريط العلوي</label>
                        <input
                          type="color"
                          className="ui-input"
                          value={formData.topbar_color || "#4f8cff"}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, topbar_color: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black">نص تذييل الإيصال</label>
                        <textarea
                          className="ui-input min-h-[60px] resize-y"
                          placeholder="مثال: شكراً لثقتكم - هاتف: 07xxxxxxxx"
                          value={formData.receipt_footer_text}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, receipt_footer_text: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black">رابط خلفية بطاقات الطلاب</label>
                        <input
                          type="text"
                          className="ui-input"
                          placeholder="https://..."
                          value={formData.card_bg_url}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, card_bg_url: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {branchColorsEnabled && (
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h4 className="text-xs font-black text-[var(--text-primary)]">ألوان الفرع</h4>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-1 text-xs h-7 px-2"
                          onClick={handleDerivePalette}
                          disabled={paletteBusy}
                        >
                          <Sparkles size={12} />
                          {paletteBusy ? "جاري التوليد..." : "اقتراح تلقائي"}
                        </button>
                      </div>

                      <div className="mb-3 space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                        {/* Quick suggestions */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black text-[var(--text-primary)]">اقتراحات سريعة</span>
                            {selectedPreset && (
                              <span className="text-[10px] font-black text-[var(--text-muted)]">
                                {selectedPreset.label}
                              </span>
                            )}
                          </div>
                          <div className="grid gap-1.5 grid-cols-2 xl:grid-cols-4">
                            {quickSuggestions.map((preset) => {
                              const isActive = preset.id === formData.theme_preset_id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => applyPreset(preset)}
                                  className={cx(
                                    "rounded border p-2 text-start transition",
                                    isActive
                                      ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                                      : "border-[var(--border)] bg-[var(--surface)]",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-[var(--text-primary)]">{preset.label}</span>
                                    <div className="flex gap-0.5">
                                      {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map((sw) => (
                                        <span key={sw} className="h-3 w-3 rounded-full border border-white/70" style={{ background: sw }} />
                                      ))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Family picker */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[10px] font-black text-[var(--text-primary)]">عوائل الألوان</span>
                            {activeFamily && <span className="text-[10px] text-[var(--text-muted)]">{activeFamily.label}</span>}
                          </div>
                          <div className="grid gap-1.5 grid-cols-2 xl:grid-cols-3">
                            {BRAND_THEME_FAMILIES.map((family) => {
                              const isActive = family.id === formData.family_id;
                              return (
                                <button
                                  key={family.id}
                                  type="button"
                                  onClick={() =>
                                    setFormData((current) => ({
                                      ...current,
                                      family_id: family.id,
                                      theme_preset_id: current.family_id === family.id ? current.theme_preset_id : "",
                                    }))
                                  }
                                  className={cx(
                                    "rounded border p-2 text-start transition",
                                    isActive ? "border-[var(--primary)] bg-[var(--surface-muted)]" : "border-[var(--border)] bg-[var(--surface)]",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-[var(--text-primary)] truncate">{family.label}</span>
                                    <div className="flex gap-0.5">
                                      {family.presets.slice(0, 3).map((preset) => (
                                        <span key={preset.id} className="h-3 w-3 rounded-full border border-white/70" style={{ background: preset.primaryColor }} />
                                      ))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Presets for active family */}
                        {activeFamily && (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-black text-[var(--text-primary)]">ثيمات {activeFamily.label}</span>
                              <button
                                type="button"
                                onClick={() => setFormData((current) => ({ ...current, family_id: "", theme_preset_id: "" }))}
                                className="text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                              >
                                مسح
                              </button>
                            </div>
                            <div className="grid gap-1.5 grid-cols-2">
                              {activeFamily.presets.map((preset) => {
                                const isActive = preset.id === formData.theme_preset_id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className={cx(
                                      "rounded border p-2 text-start transition",
                                      isActive ? "border-[var(--primary)] bg-[var(--surface-muted)]" : "border-[var(--border)] bg-[var(--surface)]",
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="text-[10px] font-black text-[var(--text-primary)]">{preset.label}</span>
                                      <div className="grid grid-cols-2 gap-0.5">
                                        {[preset.primaryColor, preset.secondaryColor, preset.sidebarColor, preset.accentColor].map((sw) => (
                                          <span key={sw} className="h-3 w-3 rounded-full border border-white/70" style={{ background: sw }} />
                                        ))}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Manual color inputs */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-black">اللون الأساسي</label>
                          <input
                            type="color"
                            className="ui-input"
                            value={formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, theme_preset_id: "", primary_color: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black">اللون الثانوي</label>
                          <input
                            type="color"
                            className="ui-input"
                            value={formData.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, theme_preset_id: "", secondary_color: event.target.value }))
                            }
                          />
                        </div>

                        {branchUiColorsEnabled && (
                          <>
                            <div className="space-y-1">
                              <label className="text-xs font-black">لون القائمة الجانبية</label>
                              <input
                                type="color"
                                className="ui-input"
                                value={formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color}
                                onChange={(event) =>
                                  setFormData((current) => ({ ...current, theme_preset_id: "", sidebar_color: event.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-black">لون الأزرار</label>
                              <input
                                type="color"
                                className="ui-input"
                                value={formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color}
                                onChange={(event) =>
                                  setFormData((current) => ({ ...current, theme_preset_id: "", accent_color: event.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-black">لون النص داخل الهوية</label>
                              <input
                                type="color"
                                className="ui-input"
                                value={formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color}
                                onChange={(event) =>
                                  setFormData((current) => ({ ...current, theme_preset_id: "", text_color: event.target.value }))
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview panel */}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                  <h4 className="text-xs font-black text-[var(--text-primary)] mb-1">معاينة الفرع</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] mb-2">
                    المعاينة هنا توضح كيف ستظهر هوية الفرع داخل النظام.
                  </p>
                  {selectedPreset ? (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-black text-[var(--text-muted)]">
                      <Palette size={10} />
                      {selectedPreset.familyLabel} / {selectedPreset.label}
                    </div>
                  ) : activeFamily ? (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-black text-[var(--text-muted)]">
                      <Palette size={10} />
                      تخصيص من {activeFamily.label}
                    </div>
                  ) : null}

                  <div className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}, ${formData.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color})`,
                        }}
                      >
                        <GitBranch size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-[var(--text-primary)]">
                          {formData.name || "اسم الفرع"}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)]">
                          {selectedSchoolName || "المدرسة المرتبطة"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <div
                        className="rounded px-3 py-2 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}, ${formData.secondary_color || DEFAULT_SCHOOL_BRANDING.secondary_color})`,
                        }}
                      >
                        <div className="text-[10px] font-black">الهوية العامة</div>
                        <div className="mt-1 text-[10px] font-bold opacity-90">
                          {formData.primary_color || DEFAULT_SCHOOL_BRANDING.primary_color}
                        </div>
                      </div>

                      <div
                        className="rounded px-3 py-2"
                        style={{ background: formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color }}
                      >
                        <div className="text-[10px] font-black" style={{ color: formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color }}>القائمة الجانبية</div>
                        <div className="mt-1 text-[10px] font-bold" style={{ color: formData.text_color || DEFAULT_SCHOOL_BRANDING.text_color }}>
                          {formData.sidebar_color || DEFAULT_SCHOOL_BRANDING.sidebar_color}
                        </div>
                      </div>

                      <div
                        className="rounded px-3 py-2 text-white"
                        style={{ background: formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color }}
                      >
                        <div className="text-[10px] font-black">الأزرار والتمييز</div>
                        <div className="mt-1 text-[10px] font-bold opacity-90">
                          {formData.accent_color || DEFAULT_SCHOOL_BRANDING.accent_color}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formNotice && (
                <div className={cx(
                  "rounded border px-3 py-2 text-xs font-bold",
                  formNotice.includes("تعذر")
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}>
                  {formNotice}
                </div>
              )}

              {saveError && (
                <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {saveError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={saving} className="ui-button ui-button--primary flex-1">
                  {saving ? "جاري الحفظ..." : editingBranch ? "حفظ التعديلات" : "إضافة الفرع"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="ui-button ui-button--secondary flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(branchToDelete)}
        title="حذف الفرع"
        description={branchToDelete ? `سيتم نقل الفرع "${branchToDelete.name}" إلى سلة المحذوفات.` : ""}
        confirmLabel="نعم، احذف الفرع"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setBranchToDelete(null)}
        onConfirm={async () => {
          const target = branchToDelete;
          setBranchToDelete(null);
          if (target?.id) await handleDelete(target.id);
        }}
      />
    </div>
  );
}
