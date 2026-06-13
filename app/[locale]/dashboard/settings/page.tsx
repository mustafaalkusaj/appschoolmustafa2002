"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";
import { invalidateCurrencyCache } from "@/hooks/useCurrency";
import {
  Settings,
  Palette,
  Shield,
  LayoutDashboard,
  Save,
  Loader2,
  Info,
  ExternalLink,
  Upload,
  X,
  Image,
  FileSpreadsheet,
  Download,
  Users,
  UserRoundCog,
  Banknote,
  TrendingUp,
  CreditCard,
  Printer,
  GraduationCap,
} from "@/lib/icons";
import {
  getPrintTheme,
  PRINT_THEME_FAMILIES,
  getPrintThemesInFamily,
  DEFAULT_PRINT_STYLE,
  type PrintThemeFamilyId,
  type PrintStyleSettings,
  type PrintStyle,
  type PrintPaperSize,
  type PrintWatermark,
  type PrintLogoPosition,
} from "@/lib/print-themes";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { setStoredSchoolBranding } from "@/lib/brand/palette";
import { requestRuntimeBrandingRefresh, applyBrandColorsDirectly } from "@/hooks/brand";
import { useTheme } from "next-themes";
import {
  BRAND_THEME_FAMILIES,
  getBrandThemePreset,
  type BrandThemeFamilyId,
  type BrandThemePresetId,
} from "@/lib/brand/themes";
import { mixColors, shiftColor } from "@/lib/brand/palette";
import {
  getExcelTheme,
  EXCEL_THEMES,
  DEFAULT_EXCEL_STYLE,
  type ExcelStyleSettings,
  type ExcelFontFamily,
  type ExcelRowDensity,
  type ExcelBorderStyle,
  type ExcelRowStyle,
} from "@/lib/excel-themes";
import { DashboardWidgetManager } from "./_components/DashboardWidgetManager";
import { YearEndTab } from "./_components/YearEndTab";
import { ArchiveTab } from "./_components/ArchiveTab";

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandingData = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_preset?: string | null;
};

type BrandingResponse = {
  ok?: boolean;
  source?: "branch" | "school";
  school?: BrandingData;
  branch_id?: string | null;
  branch_name?: string | null;
  branch_primary_color?: string | null;
  branch_secondary_color?: string | null;
  branch_logo_url?: string | null;
  branch_theme_preset?: string | null;
  branch_currency?: string | null;
  school_currency?: string | null;
  error?: { message?: string };
};

type PayrollSettings = {
  working_days_per_month: number | null;
  currency_label: string | null;
  default_lecture_price: number | null;
};

type PayrollSettingsResponse = {
  ok?: boolean;
  settings?: PayrollSettings | null;
  error?: { message?: string };
};


type MutationResponse = BrandingResponse & {
  settings?: PayrollSettings;
  error?: { message?: string };
};

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "branding" | "exports" | "printing" | "roles" | "dashboard-tab" | "year-end" | "archive";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "branding", label: "الهوية البصرية", icon: Palette },
  { id: "exports", label: "تصدير البيانات", icon: FileSpreadsheet },
  { id: "printing", label: "إعدادات الطباعة", icon: Printer },
  { id: "roles", label: "الأدوار والصلاحيات", icon: Shield },
  { id: "dashboard-tab", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "year-end", label: "نهاية السنة", icon: GraduationCap },
  { id: "archive", label: "الأرشيف السنوي", icon: Banknote },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiErrorMessage(
  payload: { error?: { message?: string } } | null | undefined,
  fallback: string,
) {
  return typeof payload?.error?.message === "string" &&
    payload.error.message.trim()
    ? payload.error.message
    : fallback;
}

// ─── Input style ──────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Save button ──────────────────────────────────────────────────────────────

function SaveButton({
  saving,
  disabled,
  onClick,
}: {
  saving: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="submit"
      disabled={saving || disabled}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "var(--primary)" }}
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Save size={14} />
      )}
      <span>حفظ التغييرات</span>
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  success,
  error,
}: {
  success: string;
  error: string;
}) {
  return (
    <AnimatePresence>
      {success && (
        <motion.div
          key="toast-success"
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm"
        >
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          key="toast-error"
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm"
        >
          {error}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Theme Preview ────────────────────────────────────────────────────────────

function ThemePreview({
  primaryColor,
  secondaryColor,
  sidebarColor,
  surfaceColor,
  schoolName,
}: {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  surfaceColor: string;
  schoolName?: string;
}) {
  const barHeights = [55, 80, 45, 95, 65, 50, 88];
  const navIcons = [true, false, false, false, false, false];

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden shadow-lg">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--surface-strong)] border-b border-[var(--border)]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <div className="flex-1 mx-2 h-4 rounded-full bg-[var(--border)] flex items-center px-2">
          <span className="text-[8px] text-[var(--text-muted)] font-mono truncate">
            school.app/dashboard
          </span>
        </div>
      </div>

      {/* App shell */}
      <div className="flex h-80" style={{ background: surfaceColor }}>
        {/* Sidebar */}
        <div
          className="w-16 flex flex-col py-3 gap-0.5 flex-shrink-0"
          style={{ background: sidebarColor }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-2 pb-2 mx-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div
              className="w-8 h-8 rounded-xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            />
          </div>
          {/* Nav items */}
          {navIcons.map((active, i) => (
            <div
              key={i}
              className="mx-2 h-8 rounded-xl flex items-center justify-center gap-1.5 px-2 transition-all"
              style={{ background: active ? `${primaryColor}35` : "transparent" }}
            >
              <div
                className="w-3.5 h-3.5 rounded-md flex-shrink-0"
                style={{ background: active ? primaryColor : "rgba(255,255,255,0.2)" }}
              />
              <div
                className="flex-1 h-1.5 rounded-full"
                style={{ background: active ? `${primaryColor}60` : "rgba(255,255,255,0.1)" }}
              />
            </div>
          ))}
          <div className="flex-1" />
          {/* Bottom avatar */}
          <div className="flex items-center justify-center pb-1 gap-1.5 mx-2">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}90, ${secondaryColor}90)` }}
            />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
              <div className="h-1 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Topbar */}
          <div
            className="h-10 flex items-center px-3 gap-2 flex-shrink-0"
            style={{
              background: `linear-gradient(90deg, ${primaryColor}10 0%, transparent 100%)`,
              borderBottom: `1px solid ${primaryColor}18`,
            }}
          >
            <div className="flex items-center gap-1.5 flex-1">
              <div className="h-2.5 w-3 rounded-sm" style={{ background: `${primaryColor}30` }} />
              <div
                className="h-2 w-16 rounded-full font-bold text-[7px]"
                style={{ background: `linear-gradient(90deg, ${primaryColor}40, ${secondaryColor}40)` }}
              />
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-lg" style={{ background: `${primaryColor}12` }} />
              <div className="w-6 h-6 rounded-lg" style={{ background: `${primaryColor}12` }} />
              <div
                className="w-7 h-7 rounded-full"
                style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
              />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 p-3 space-y-2.5 overflow-hidden">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-3 w-24 rounded-full" style={{ background: `${primaryColor}30` }} />
                <div className="h-2 w-16 rounded-full" style={{ background: `${primaryColor}15` }} />
              </div>
              <div
                className="h-6 w-16 rounded-lg flex items-center justify-center gap-1"
                style={{ background: `linear-gradient(120deg, ${primaryColor}, ${secondaryColor})` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <div className="h-1.5 w-5 rounded-full bg-white/60" />
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { color: primaryColor, val: "248", label: "طالب" },
                { color: secondaryColor, val: "32", label: "معلم" },
                { color: primaryColor, val: "94%", label: "حضور" },
              ].map(({ color, val, label }, i) => (
                <div
                  key={i}
                  className="rounded-xl p-2"
                  style={{ background: "rgba(255,255,255,0.92)", boxShadow: `0 1px 4px ${color}15` }}
                >
                  <div
                    className="w-5 h-5 rounded-lg mb-1.5 flex items-center justify-center"
                    style={{ background: `${color}18` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  </div>
                  <div className="text-[9px] font-black leading-none" style={{ color }}>{val}</div>
                  <div className="text-[7px] mt-0.5" style={{ color: "#94a3b8" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(255,255,255,0.92)" }}
            >
              <div className="flex items-center gap-1 mb-2">
                <div className="h-2 w-14 rounded-full" style={{ background: `${primaryColor}20` }} />
                <div className="flex-1" />
                <div className="h-2 w-8 rounded-full" style={{ background: "#e2e8f0" }} />
              </div>
              <div className="flex items-end gap-1 h-12">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-md transition-all"
                    style={{
                      height: `${h}%`,
                      background:
                        i === 3
                          ? `linear-gradient(180deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                          : `${primaryColor}28`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Table rows */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.92)" }}
            >
              {[primaryColor, secondaryColor, primaryColor].map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5"
                  style={{ borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}
                >
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: `${c}25` }}>
                    <div className="w-full h-full rounded-full opacity-50" style={{ background: c }} />
                  </div>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "#e2e8f0" }} />
                  <div className="w-6 h-1.5 rounded-full" style={{ background: `${c}40` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer badge */}
      <div
        className="px-3 py-1.5 flex items-center justify-center gap-1.5"
        style={{
          background: `linear-gradient(90deg, ${primaryColor}12 0%, ${secondaryColor}12 100%)`,
          borderTop: `1px solid ${primaryColor}18`,
        }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        />
        <span
          className="text-[10px] font-bold truncate"
          style={{ color: primaryColor }}
        >
          {schoolName?.trim() || "معاينة التصميم"}
        </span>
      </div>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab({ schoolId }: { schoolId: string }) {
  const { resolvedTheme } = useTheme();
  const [name, setName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [hasBranch, setHasBranch] = useState(false);
  const [settingsSource, setSettingsSource] = useState<"branch" | "school">("school");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f8cff");
  const [secondaryColor, setSecondaryColor] = useState("#818cf8");
  const [familyId, setFamilyId] = useState<BrandThemeFamilyId | "">("");
  const [themePresetId, setThemePresetId] = useState<BrandThemePresetId | "">("");
  const [currencyCode, setCurrencyCode] = useState("IQD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoDragging, setLogoDragging] = useState(false);
  const [logoObjectFit, setLogoObjectFit] = useState<"contain" | "cover">(() => {
    if (typeof window === "undefined") return "contain";
    return (window.localStorage.getItem(`school-logo-fit:${schoolId}`) as "contain" | "cover") ?? "contain";
  });
  const logoFileRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setLogoUploadError("الرجاء رفع صورة PNG أو JPEG أو WebP فقط.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError("حجم الصورة يتجاوز 5 MB.");
      return;
    }
    setLogoUploading(true);
    setLogoUploadError("");
    try {
      const fd = new FormData();
      fd.set("school_id", schoolId);
      fd.set("file", file);
      const res = await fetch("/api/web/dashboard/branding/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => null) as { url?: string; error?: { message?: string } } | null;
      if (!res.ok || !data?.url) throw new Error(data?.error?.message ?? "تعذر رفع الشعار.");
      setLogoUrl(data.url);
      setLogoUploadError("");
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : "تعذر رفع الشعار.");
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const load = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<BrandingResponse>(
        `/api/web/dashboard/branding?schoolId=${encodeURIComponent(schoolId)}`,
      );
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "تعذر تحميل بيانات الهوية البصرية."));
      setName(payload?.school?.name ?? "");
      const isBranch = payload?.source === "branch" && Boolean(payload?.branch_id);
      setSettingsSource(isBranch ? "branch" : "school");
      setHasBranch(isBranch);
      if (isBranch) {
        setBranchName(payload?.branch_name ?? "");
        // Use branch-level colors (isolated per branch)
        if (payload?.branch_primary_color) setPrimaryColor(payload.branch_primary_color);
        else if (payload?.school?.primary_color) setPrimaryColor(payload.school.primary_color);
        if (payload?.branch_secondary_color) setSecondaryColor(payload.branch_secondary_color);
        else if (payload?.school?.secondary_color) setSecondaryColor(payload.school.secondary_color);
        const branchPreset = payload?.branch_theme_preset;
        const schoolPreset = payload?.school?.theme_preset;
        const activePreset = branchPreset ?? schoolPreset;
        if (activePreset) {
          const preset = getBrandThemePreset(activePreset as BrandThemePresetId);
          if (preset) { setThemePresetId(preset.id); setFamilyId(preset.familyId); }
        }
        setLogoUrl(payload?.branch_logo_url ?? payload?.school?.logo_url ?? "");
        setCurrencyCode(payload?.branch_currency ?? payload?.school_currency ?? "IQD");
      } else {
        setLogoUrl(payload?.school?.logo_url ?? "");
        if (payload?.school?.primary_color) setPrimaryColor(payload.school.primary_color);
        if (payload?.school?.secondary_color) setSecondaryColor(payload.school.secondary_color);
        if (payload?.school?.theme_preset) {
          const preset = getBrandThemePreset(payload.school.theme_preset as BrandThemePresetId);
          if (preset) { setThemePresetId(preset.id); setFamilyId(preset.familyId); }
        }
        setCurrencyCode(payload?.school_currency ?? "IQD");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل بيانات الهوية البصرية.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { void load(); }, [load]);

  function handleFamilyChange(id: BrandThemeFamilyId | "") {
    setFamilyId(id);
    if (id) {
      const family = BRAND_THEME_FAMILIES.find((f) => f.id === id);
      const first = family?.presets[0];
      if (first) {
        setThemePresetId(first.id);
        setPrimaryColor(first.primaryColor);
        setSecondaryColor(first.secondaryColor);
      }
    } else {
      setThemePresetId("");
    }
  }

  function handlePresetChange(id: BrandThemePresetId | "") {
    setThemePresetId(id);
    if (id) {
      const preset = getBrandThemePreset(id);
      if (preset) {
        setPrimaryColor(preset.primaryColor);
        setSecondaryColor(preset.secondaryColor);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<MutationResponse>(
        "/api/web/dashboard/branding",
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            name: name.trim(),
            // logo + colors: sent always; API routes to correct table (branch vs school)
            logo_url: logoUrl.trim() || null,
            primary_color: primaryColor || null,
            secondary_color: secondaryColor || null,
            theme_preset: themePresetId || null,
            currency: currencyCode || "IQD",
            branch_name: hasBranch ? branchName.trim() || null : undefined,
          }),
        },
      );
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "تعذر حفظ الهوية البصرية."));
      setName(payload?.school?.name ?? name);
      setLogoUrl(payload?.school?.logo_url ?? logoUrl);
      if (payload?.branch_name !== undefined) setBranchName(payload.branch_name ?? "");

      // Apply colors immediately to the running app (bypasses async Supabase re-fetch)
      applyBrandColorsDirectly(
        primaryColor || null,
        secondaryColor || null,
        themePresetId || null,
        resolvedTheme === "dark",
      );
      setStoredSchoolBranding(schoolId, {
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
        themePreset: themePresetId || null,
        source: "manual",
      });
      requestRuntimeBrandingRefresh({ currency: currencyCode || "IQD" });

      setSuccess("تم حفظ الهوية البصرية بنجاح.");
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الهوية البصرية.");
    } finally {
      setSaving(false);
    }
  }

  const currentFamily = BRAND_THEME_FAMILIES.find((f) => f.id === familyId);

  // Derive preview colors from preset or fallback
  const selectedPreset = themePresetId ? getBrandThemePreset(themePresetId) : null;
  const previewSidebar = selectedPreset?.sidebarColor ?? "#1e293b";
  const previewSurface = selectedPreset?.backgroundColor ?? "#f1f5f9";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
        <span className="text-sm font-bold text-[var(--text-muted)]">جارٍ التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast success={success} error={error} />

      {/* Scope banner */}
      {settingsSource === "branch" ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
            color: "var(--primary)",
          }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
          <span>تعديل إعدادات الفرع — الألوان والشعار خاصة بهذا الفرع فقط ولا تؤثر على الفروع الأخرى</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-bold"
          style={{
            background: "color-mix(in srgb, var(--text-secondary) 5%, transparent)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--text-muted)" }} />
          <span>تعديل إعدادات المدرسة — تنطبق على جميع الفروع التي لا تملك إعدادات خاصة بها</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* School / Branch info */}
        <Section
          title={settingsSource === "branch" ? "معلومات الفرع" : "معلومات المدرسة"}
          description={settingsSource === "branch" ? "اسم الفرع كما يظهر في التقارير والإيصالات." : "اسم المدرسة كما يظهر في التقارير والإيصالات."}
        >
          <div className="grid gap-4">
            {settingsSource === "branch" ? (
              <Field label="اسم الفرع">
                <input className={INPUT_CLS} placeholder="أدخل اسم الفرع..." value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              </Field>
            ) : (
              <Field label="اسم المدرسة">
                <input className={INPUT_CLS} placeholder="أدخل اسم المدرسة..." value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
            )}
          </div>
          {/* Logo upload section */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">الشعار</label>

            {/* Hidden file input */}
            <input
              ref={logoFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoFile(f); }}
            />

            <div className="flex gap-3 items-start">
              {/* Drop zone / preview */}
              <div
                className={cn(
                  "relative flex-shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all",
                  logoDragging ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]" : "border-[var(--border)] bg-[var(--surface-soft)]",
                  logoUploading && "opacity-70 pointer-events-none",
                )}
                onClick={() => logoFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                onDragLeave={() => setLogoDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setLogoDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) void handleLogoFile(f);
                }}
              >
                {logoUploading ? (
                  <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
                ) : logoUrl.trim() ? (
                  <img
                    src={logoUrl}
                    alt="school logo"
                    className="w-full h-full transition-all"
                    style={{ objectFit: logoObjectFit, padding: logoObjectFit === "contain" ? "6px" : "0" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-[var(--text-muted)]">
                    <Image size={22} />
                    <span className="text-[10px] font-bold">رفع شعار</span>
                  </div>
                )}
                {/* Clear button */}
                {logoUrl.trim() && !logoUploading && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLogoUrl(""); setLogoUploadError(""); }}
                    className="absolute top-1 end-1 w-5 h-5 rounded-full bg-[var(--danger)] text-white flex items-center justify-center text-xs leading-none"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Right controls */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {logoUrl.trim() ? (
                  /* Logo exists: show change + delete buttons */
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={logoUploading}
                        onClick={() => logoFileRef.current?.click()}
                        className="flex items-center gap-2 px-3 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text-primary)] transition-colors disabled:opacity-50 flex-1"
                      >
                        <Upload size={14} className="shrink-0" />
                        <span>{logoUploading ? "جاري الرفع..." : "تغيير الشعار"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLogoUrl(""); setLogoUploadError(""); }}
                        className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 hover:bg-[var(--danger)]/15 text-sm font-semibold text-[var(--danger)] transition-colors"
                      >
                        <X size={13} />
                        <span>حذف</span>
                      </button>
                    </div>

                    {/* Object-fit control */}
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] shrink-0">أبعاد العرض:</span>
                      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs font-bold">
                        {(["contain", "cover"] as const).map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            onClick={() => {
                              setLogoObjectFit(fit);
                              window.localStorage.setItem(`school-logo-fit:${schoolId}`, fit);
                            }}
                            className={cn(
                              "px-2.5 py-1 transition-colors",
                              logoObjectFit === fit
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                            )}
                          >
                            {fit === "contain" ? "يحتوي" : "يملأ"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* No logo: show upload button + URL input */
                  <>
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => logoFileRef.current?.click()}
                      className="flex items-center gap-2 px-3 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text-primary)] transition-colors disabled:opacity-50 w-full"
                    >
                      <Upload size={14} className="shrink-0" />
                      <span>{logoUploading ? "جاري الرفع..." : "رفع من الجهاز"}</span>
                    </button>

                    <input
                      className={INPUT_CLS}
                      placeholder="أو أدخل رابط الصورة..."
                      value={logoUrl}
                      onChange={(e) => { setLogoUploadError(""); setLogoUrl(e.target.value); }}
                      dir="ltr"
                    />
                  </>
                )}

                {logoUploadError && (
                  <p className="text-xs text-[var(--danger)]">{logoUploadError}</p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Currency selector */}
        <Section title="عملة الفرع" description="اختر العملة المستخدمة في جميع أرقام الفرع — الرسوم والمدفوعات والرواتب.">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "دينار عراقي", code: "IQD", symbol: "د.ع", flag: "🇮🇶" },
              { label: "دولار أمريكي", code: "USD", symbol: "$", flag: "🇺🇸" },
            ].map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setCurrencyCode(opt.code)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all text-start",
                  currencyCode === opt.code
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
                )}
              >
                <span className="text-base">{opt.flag}</span>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-black">{opt.symbol}</span>
                  <span className="text-[10px] font-medium opacity-70">{opt.label}</span>
                </div>
                {currencyCode === opt.code && (
                  <span className="ms-auto text-[var(--primary)]">✓</span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* Theme family grid */}
        <Section title="عائلة الألوان" description="اختر عائلة الألوان المناسبة لمدرستك.">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {BRAND_THEME_FAMILIES.map((f) => {
              const isSelected = familyId === f.id;
              const rep = f.presets[0];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFamilyChange(f.id)}
                  className="relative flex flex-col items-center rounded-2xl border-2 py-3 px-2 gap-2 transition-all hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    borderColor: isSelected ? rep.primaryColor : "var(--border)",
                    background: isSelected ? `${rep.primaryColor}0d` : "var(--surface-strong)",
                    boxShadow: isSelected ? `0 0 0 3px ${rep.primaryColor}22` : "none",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${rep.primaryColor}, ${rep.secondaryColor})` }}
                  />
                  <p className="text-[11px] font-bold text-[var(--text-primary)] text-center leading-tight">{f.label}</p>
                  {isSelected && (
                    <div
                      className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                      style={{ background: rep.primaryColor }}
                    >✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {familyId && currentFamily && (
          <Section title={`تصاميم ${currentFamily.label}`} description="اختر التصميم المفضل من هذه العائلة.">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentFamily.presets.map((p) => {
                const isSelected = themePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className="relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] text-start"
                    style={{
                      borderColor: isSelected ? p.primaryColor : "var(--border)",
                      boxShadow: isSelected ? `0 0 0 3px ${p.primaryColor}22` : "none",
                    }}
                  >
                    <div
                      className="h-14 w-full relative"
                      style={{ background: `linear-gradient(120deg, ${p.primaryColor} 0%, ${p.secondaryColor} 100%)` }}
                    >
                      <div
                        className="absolute top-2 start-2 w-2.5 h-10 rounded-sm opacity-60"
                        style={{ background: p.sidebarColor }}
                      />
                      {isSelected && (
                        <div className="absolute top-2 end-2 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-[var(--surface-strong)]">
                      <p className="text-[12px] font-bold text-[var(--text-primary)] leading-none">{p.label}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Manual color overrides */}
        <Section title="الألوان المخصصة" description="تخصيص يدوي للألوان إذا أردت تجاوز التصميم المختار.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="اللون الرئيسي">
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent p-0.5" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setThemePresetId(""); }} />
                <input className={cn(INPUT_CLS, "flex-1 font-mono text-sm")} value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setThemePresetId(""); }} dir="ltr" />
              </div>
            </Field>
            <Field label="اللون الثانوي">
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent p-0.5" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setThemePresetId(""); }} />
                <input className={cn(INPUT_CLS, "flex-1 font-mono text-sm")} value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setThemePresetId(""); }} dir="ltr" />
              </div>
            </Field>
          </div>
        </Section>

        {/* Live preview — full width below colors */}
        <Section title="معاينة مباشرة" description="تتحدث فوراً عند تغيير الألوان أو اختيار تصميم جديد.">
          <ThemePreview
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            sidebarColor={previewSidebar}
            surfaceColor={previewSurface}
            schoolName={name}
          />
        </Section>

        <div className="flex justify-end">
          <SaveButton saving={saving} />
        </div>
      </form>
    </div>
  );
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────

function PayrollTab({ schoolId }: { schoolId: string }) {
  const [workingDays, setWorkingDays] = useState("22");
  const [lecturePrice, setLecturePrice] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<PayrollSettingsResponse>(
        `/api/web/payroll/settings?schoolId=${encodeURIComponent(schoolId)}`,
      );
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر تحميل إعدادات الرواتب."));
      }
      const s = payload?.settings;
      if (s) {
        setWorkingDays(String(s.working_days_per_month ?? 22));
        setLecturePrice(String(s.default_lecture_price ?? 0));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل إعدادات الرواتب.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<MutationResponse>(
        "/api/web/payroll/settings",
        {
          method: "PUT",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            working_days_per_month: Number(workingDays) || 22,
            default_lecture_price: Number(lecturePrice) || 0,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر حفظ إعدادات الرواتب."));
      }
      const s = payload?.settings;
      if (s) {
        setWorkingDays(String(s.working_days_per_month ?? 22));
        setLecturePrice(String(s.default_lecture_price ?? 0));
      }
      invalidateCurrencyCache();
      setSuccess("تم حفظ إعدادات الرواتب بنجاح.");
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ إعدادات الرواتب.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={20} className="animate-spin text-[var(--primary)]" />
        <span className="text-sm font-bold text-[var(--text-muted)]">جارٍ التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toast success={success} error={error} />

      <form onSubmit={handleSubmit}>
        <Section
          title="إعدادات الرواتب والمحاضرات"
          description="هذه الإعدادات تؤثر على حساب الرواتب الشهرية وأسعار المحاضرات."
        >
          <Field label="أيام العمل في الشهر">
            <input
              className={INPUT_CLS}
              type="number"
              min={1}
              max={31}
              step={1}
              placeholder="22"
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              required
            />
          </Field>

          <Field label="سعر المحاضرة الافتراضي">
            <input
              className={INPUT_CLS}
              type="number"
              min={0}
              step={500}
              placeholder="0"
              value={lecturePrice}
              onChange={(e) => setLecturePrice(e.target.value)}
              required
            />
          </Field>

          <div className="flex justify-end pt-2">
            <SaveButton saving={saving} />
          </div>
        </Section>
      </form>
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ locale }: { locale: string }) {
  const rolesPath = localizeAppPath("/dashboard/settings/roles", locale);

  return (
    <div className="space-y-5">
      <Section
        title="الأدوار والصلاحيات"
        description="إدارة صلاحيات المستخدمين وتخصيص الوصول لكل دور في النظام."
      >
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            >
              <Shield size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">
                صفحة إدارة الأدوار
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                من خلال صفحة الأدوار يمكنك تخصيص الصلاحيات لكل دور وتحديد
                الأقسام التي يمكن لكل مستخدم الوصول إليها أو تعديلها.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
            <Link
              href={rolesPath}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
              style={{ background: "var(--primary)" }}
            >
              <ExternalLink size={14} />
              <span>الانتقال إلى إدارة الأدوار</span>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardSettingsTab() {
  return (
    <div className="space-y-5">
      {/* Personal layout customisation */}
      <Section
        title="ترتيب وإظهار الأقسام"
        description="خصّص الأقسام الظاهرة في لوحة التحكم وأعد ترتيبها حسب تفضيلاتك. يُحفظ الإعداد في متصفحك فقط."
      >
        <DashboardWidgetManager />
      </Section>

      {/* Role-level section control info */}
      <Section
        title="إعدادات الأدوار والصلاحيات"
        description="للتحكم في الأقسام الظاهرة لكل دور من أدوار المستخدمين."
      >
        <div
          className="rounded-xl border border-[var(--border)] p-5 flex items-start gap-4"
          style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}
        >
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            <Info size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              تخصيص لوحة التحكم لكل دور
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              يمكنك تخصيص الأقسام الظاهرة في لوحة التحكم لكل دور من صفحة
              إدارة الأدوار والصلاحيات.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Excel Theme Preview ──────────────────────────────────────────────────────

function ExcelThemePreview({
  themeId,
  settings,
  columns,
}: {
  themeId: string;
  settings: ExcelStyleSettings;
  columns?: string[];
}) {
  const theme = getExcelTheme(themeId);
  const cols = columns ?? ["اسم الطالب", "الصف", "المبلغ", "الحالة"];
  const mockRows = [
    ["أحمد محمد علي", "الأول أ", "250,000", "مدفوع"],
    ["سارة خالد إبراهيم", "الثاني ب", "180,000", "متبقي"],
    ["محمود عمر سعد", "الثالث أ", "300,000", "مدفوع"],
    ["نور حسن محمد", "الأول ب", "220,000", "مدفوع"],
    ["علي أحمد كريم", "الثاني أ", "195,000", "متبقي"],
  ].slice(0, settings.rowDensity === "compact" ? 5 : 4);

  const rowH = settings.rowDensity === "compact" ? "h-5" : settings.rowDensity === "spacious" ? "h-8" : "h-6";
  const textSize = "text-[9px]";
  const borderColor = settings.borderStyle === "none" ? "transparent" : "#D1D5DB";
  const cellBorder = settings.borderStyle !== "none" ? `1px solid ${borderColor}` : "none";

  const colCount = cols.length;

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-[var(--border)]" dir="rtl">
      {/* Spreadsheet toolbar mock */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F3F3F3] border-b border-[#D0D0D0]">
        <div className="text-[8px] text-[#333] font-mono px-1 py-0.5 bg-white border border-[#C0C0C0] rounded w-12 text-center">A1</div>
        <div className="h-3 w-px bg-[#C0C0C0] mx-0.5" />
        <div className="flex-1 h-4 bg-white border border-[#C0C0C0] rounded px-1 flex items-center">
          <span className="text-[7px] text-[#555] font-mono truncate">قائمة الطلاب</span>
        </div>
      </div>

      {/* Column letters row */}
      <div className="grid border-b border-[#C0C0C0] bg-[#F3F3F3]" style={{ gridTemplateColumns: `24px repeat(${colCount}, 1fr)` }}>
        <div className="h-4 border-l border-[#C0C0C0]" />
        {cols.map((_, i) => (
          <div key={i} className="h-4 flex items-center justify-center text-[7px] text-[#555] font-mono border-l border-[#C0C0C0]">
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>

      {/* Title row */}
      <div style={{ gridTemplateColumns: `24px 1fr` }} className="grid">
        <div className="flex items-center justify-center text-[7px] text-[#555] font-mono border-l border-b border-[#C0C0C0] bg-[#F3F3F3]" style={{ borderBottom: cellBorder }}>1</div>
        <div style={{ background: theme.titleBg, color: theme.headerFg, borderBottom: cellBorder }}
          className="text-center text-[10px] font-bold py-2 px-2 truncate">
          قائمة الطلاب
        </div>
      </div>

      {/* Date row */}
      <div style={{ gridTemplateColumns: `24px 1fr` }} className="grid">
        <div className="flex items-center justify-center text-[7px] text-[#555] font-mono border-l border-b border-[#C0C0C0] bg-[#F3F3F3]" style={{ borderBottom: cellBorder }}>2</div>
        <div style={{ background: theme.headerBg, color: theme.headerFg, borderBottom: cellBorder }}
          className="text-center text-[9px] py-1 px-2 truncate">
          تاريخ التصدير: {new Date().toLocaleDateString("ar-IQ-u-nu-latn")}
        </div>
      </div>

      {/* Column headers */}
      <div style={{ gridTemplateColumns: `24px repeat(${colCount}, 1fr)` }} className="grid">
        <div className="flex items-center justify-center text-[7px] text-[#555] font-mono border-l border-b border-[#C0C0C0] bg-[#F3F3F3]" style={{ borderBottom: cellBorder }}>3</div>
        {cols.map((col, i) => (
          <div key={i}
            style={{ background: theme.colHeaderBg, color: theme.colHeaderFg, borderLeft: cellBorder, borderBottom: cellBorder }}
            className="text-center text-[9px] font-bold py-1.5 px-1 truncate">
            {col}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {mockRows.map((row, rowIdx) => {
        const bg = (!settings.rowStyle || settings.rowStyle === "striped")
          ? (rowIdx % 2 === 0 ? theme.rowOdd : theme.rowEven)
          : theme.rowOdd;
        return (
          <div key={rowIdx} style={{ gridTemplateColumns: `24px repeat(${colCount}, 1fr)` }} className="grid">
            <div className="flex items-center justify-center text-[7px] text-[#555] font-mono border-l border-b border-[#C0C0C0] bg-[#F3F3F3]" style={{ borderBottom: cellBorder }}>
              {rowIdx + 4}
            </div>
            {row.slice(0, colCount).map((cell, colIdx) => (
              <div key={colIdx}
                style={{ background: bg, borderLeft: cellBorder, borderBottom: cellBorder }}
                className={`${rowH} flex items-center justify-center ${textSize} text-[#333] px-1 truncate`}>
                {cell}
              </div>
            ))}
          </div>
        );
      })}

      {/* Totals row */}
      <div style={{ gridTemplateColumns: `24px repeat(${colCount}, 1fr)` }} className="grid">
        <div className="flex items-center justify-center text-[7px] text-[#555] font-mono border-l bg-[#F3F3F3]">
          {mockRows.length + 4}
        </div>
        <div style={{ background: theme.totalBg, color: theme.headerFg, borderLeft: "none" }}
          className="text-[9px] font-bold py-1.5 px-2 truncate">
          المجموع ({mockRows.length})
        </div>
        {cols.slice(1, colCount - 1).map((_, i) => (
          <div key={i} style={{ background: theme.totalBg, borderLeft: cellBorder }} className="h-6" />
        ))}
        {colCount > 1 && (
          <div style={{ background: theme.totalBg, color: theme.headerFg, borderLeft: cellBorder }}
            className="text-center text-[9px] font-bold py-1.5 px-1 truncate">
            945,000
          </div>
        )}
      </div>

      {/* Sheet tab bar */}
      <div className="flex items-end gap-0 px-2 pt-1 pb-0 bg-[#F3F3F3] border-t border-[#C0C0C0]">
        <div style={{ background: theme.colHeaderBg, color: theme.colHeaderFg }}
          className="px-3 py-0.5 text-[7px] font-bold rounded-t border border-b-0 border-white/20">
          الطلاب
        </div>
        <div className="px-2 py-0.5 text-[7px] text-[#777] bg-[#E8E8E8] rounded-t border border-b-0 border-[#C0C0C0] ms-0.5">
          ورقة 2
        </div>
      </div>
    </div>
  );
}

// ─── Exports Tab ──────────────────────────────────────────────────────────────

type BulkExportType = "students" | "teachers" | "expenses" | "incomes";

interface ExportCard {
  type: BulkExportType | "payments";
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const EXPORT_CARDS: ExportCard[] = [
  {
    type: "students",
    icon: Users,
    title: "الطلاب",
    description: "تصدير كامل بيانات الطلاب (الاسم، الصف، الهاتف، الحالة)",
    color: "#2563eb",
  },
  {
    type: "teachers",
    icon: UserRoundCog,
    title: "المعلمون",
    description: "تصدير بيانات المعلمين (الاسم، المادة، الهاتف، الإيميل)",
    color: "#7c3aed",
  },
  {
    type: "expenses",
    icon: Banknote,
    title: "المصاريف",
    description: "تصدير سجل المصاريف (النوع، المبلغ، التاريخ)",
    color: "#dc2626",
  },
  {
    type: "incomes",
    icon: TrendingUp,
    title: "الإيرادات",
    description: "تصدير سجل الإيرادات (النوع، المبلغ، التاريخ)",
    color: "#16a34a",
  },
  {
    type: "payments",
    icon: CreditCard,
    title: "المدفوعات",
    description: "تصدير أقساط وفواتير الطلاب",
    color: "#d97706",
  },
];

function ExportsTab({ schoolId }: { schoolId: string }) {
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [excelThemeId, setExcelThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return "navy";
    return localStorage.getItem("excel-theme") ?? "navy";
  });
  const [excelStyle, setExcelStyle] = useState<ExcelStyleSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_EXCEL_STYLE;
    try {
      const stored = localStorage.getItem("excel-style");
      return stored ? { ...DEFAULT_EXCEL_STYLE, ...JSON.parse(stored) } : DEFAULT_EXCEL_STYLE;
    } catch { return DEFAULT_EXCEL_STYLE; }
  });


  useEffect(() => {
    localStorage.setItem("excel-theme", excelThemeId);
  }, [excelThemeId]);

  useEffect(() => {
    localStorage.setItem("excel-style", JSON.stringify(excelStyle));
  }, [excelStyle]);

  async function handleExport(card: ExportCard) {
    if (!schoolId || exportingType) return;
    setExportingType(card.type);
    setError("");

    try {
      const { fetchWithAuthorizedSession } = await import("@/lib/authorized-api");

      let url: string;
      let filename: string;
      const dateStr = new Date().toLocaleDateString("ar-IQ-u-nu-latn").replace(/\//g, "_");

      const styleParams = `&font=${excelStyle.fontFamily}&density=${excelStyle.rowDensity}&border=${excelStyle.borderStyle}&rowStyle=${excelStyle.rowStyle}`;

      if (card.type === "payments") {
        url = `/api/web/payments/export?schoolId=${encodeURIComponent(schoolId)}&format=excel&theme=${excelThemeId}`;
        url += styleParams;
        filename = `فواتير_اقساط_الطلاب_${dateStr}.xlsx`;
      } else {
        url = `/api/web/export/bulk?type=${card.type}&schoolId=${encodeURIComponent(schoolId)}&theme=${excelThemeId}`;
        url += styleParams;
        const nameMap: Record<BulkExportType, string> = {
          students: `قائمة_الطلاب_${dateStr}.xlsx`,
          teachers: `قائمة_المعلمين_${dateStr}.xlsx`,
          expenses: `سجل_المصاريف_${dateStr}.xlsx`,
          incomes: `سجل_الإيرادات_${dateStr}.xlsx`,
        };
        filename = nameMap[card.type as BulkExportType];
      }

      const res = await fetchWithAuthorizedSession(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(j?.error?.message ?? "تعذر التصدير.");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التصدير.");
    } finally {
      setExportingType(null);
    }
  }

  async function handleTemplate(card: ExportCard) {
    if (!schoolId || templateType || exportingType) return;
    setTemplateType(card.type);
    setError("");
    try {
      const { fetchWithAuthorizedSession } = await import("@/lib/authorized-api");
      const templateNames: Record<string, string> = {
        students: "نموذج_الطلاب",
        teachers: "نموذج_المعلمين",
        expenses: "نموذج_المصاريف",
        incomes: "نموذج_الإيرادات",
        payments: "نموذج_المدفوعات",
      };
      const styleParams = `&font=${excelStyle.fontFamily}&density=${excelStyle.rowDensity}&border=${excelStyle.borderStyle}&rowStyle=${excelStyle.rowStyle}`;
      const url = `/api/web/export/bulk?type=${card.type}&schoolId=${encodeURIComponent(schoolId)}&template=true&theme=${excelThemeId}${styleParams}`;
      const res = await fetchWithAuthorizedSession(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(j?.error?.message ?? "تعذر تحميل النموذج.");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${templateNames[card.type] ?? "نموذج"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل النموذج.");
    } finally {
      setTemplateType(null);
    }
  }

  return (
    <div className="space-y-5">
      <Toast success="" error={error} />

      {/* Excel theme picker */}
      <Section title="مظهر ملف Excel" description="خصّص شكل ملفات Excel قبل التصدير">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* LEFT: theme families + settings */}
          <div className="flex-1 space-y-5">

            {/* Theme cards — all families */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">عائلة الألوان</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {EXCEL_THEMES.map(theme => {
                const selected = excelThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setExcelThemeId(theme.id)}
                    className={cn(
                      "rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                      selected ? "border-[var(--primary)] shadow-md scale-[1.03]" : "border-[var(--border)]"
                    )}
                  >
                    {/* 4 color bands */}
                    <div className="flex flex-col h-10">
                      <div className="h-3" style={{ background: theme.titleBg }} />
                      <div className="h-1.5" style={{ background: theme.headerBg }} />
                      <div className="h-2.5" style={{ background: theme.colHeaderBg }} />
                      <div className="flex flex-1">
                        <div className="flex-1" style={{ background: theme.rowOdd }} />
                        <div className="flex-1" style={{ background: theme.rowEven }} />
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 flex items-center justify-between",
                      "bg-[var(--surface-strong)]"
                    )}>
                      <span className="text-[10px] font-bold text-[var(--text-primary)] truncate">{theme.nameAr}</span>
                      {selected && (
                        <div className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--primary)" }}>
                          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                            <path d="M1 3.5L2.8 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Style settings row */}
            <div className="grid grid-cols-2 gap-3">

              {/* Font */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">الخط</label>
                <div className="flex gap-1.5">
                  {(["Arial", "Calibri", "Tahoma"] as ExcelFontFamily[]).map(f => (
                    <button key={f} type="button"
                      onClick={() => setExcelStyle(s => ({ ...s, fontFamily: f }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        excelStyle.fontFamily === f
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={excelStyle.fontFamily === f ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row style */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">نمط الصفوف</label>
                <div className="flex gap-1.5">
                  {([["striped", "مخطط"], ["solid", "موحّد"]] as [ExcelRowStyle, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setExcelStyle(s => ({ ...s, rowStyle: val }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                        excelStyle.rowStyle === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={excelStyle.rowStyle === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row density */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">ارتفاع الصفوف</label>
                <div className="flex gap-1.5">
                  {([["compact", "مضغوط"], ["normal", "عادي"], ["spacious", "مريح"]] as [ExcelRowDensity, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setExcelStyle(s => ({ ...s, rowDensity: val }))}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all border",
                        excelStyle.rowDensity === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={excelStyle.rowDensity === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">الحدود</label>
                <div className="flex gap-1.5">
                  {([["thin", "رفيعة"], ["medium", "متوسطة"], ["none", "بدون"]] as [ExcelBorderStyle, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setExcelStyle(s => ({ ...s, borderStyle: val }))}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all border",
                        excelStyle.borderStyle === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={excelStyle.borderStyle === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: live preview */}
          <div className="xl:w-80 flex-shrink-0">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">المعاينة الحية</p>
            <ExcelThemePreview themeId={excelThemeId} settings={excelStyle} />
          </div>

        </div>
      </Section>

      <Section
        title="تصدير البيانات إلى Excel"
        description="قم بتصدير بيانات التطبيق إلى ملفات Excel بضغطة واحدة"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXPORT_CARDS.map((card) => {
            const Icon = card.icon;
            const isExporting = exportingType === card.type;
            const isDownloadingTemplate = templateType === card.type;
            const isBusy = exportingType !== null || templateType !== null;

            return (
              <div
                key={card.type}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 flex flex-col gap-4 transition-all"
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${card.color}18` }}
                  >
                    <Icon size={20} style={{ color: card.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-primary)] text-sm leading-snug">
                      {card.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Buttons row */}
                <div className="flex gap-2">
                  {/* Export button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleExport(card)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: isExporting ? `${card.color}cc` : card.color }}
                  >
                    {isExporting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={13} />
                    )}
                    <span>{isExporting ? "جارٍ التصدير..." : "تصدير البيانات"}</span>
                  </button>

                  {/* Template button */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleTemplate(card)}
                    title="تحميل نموذج فارغ"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border)]"
                    style={{
                      background: isDownloadingTemplate ? `${card.color}10` : "var(--surface-strong)",
                      color: card.color,
                    }}
                  >
                    {isDownloadingTemplate ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span className="hidden sm:inline">نموذج فارغ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ─── Print Document Catalog ───────────────────────────────────────────────────

type PrintLayoutId =
  | "classic" | "modern" | "compact" | "formal" | "luxury"
  | "card" | "columns" | "colorful" | "minimal" | "detailed";

type PrintDocTemplate = { id: number; nameAr: string; layout: PrintLayoutId };

type PrintDocType = {
  id: string;
  nameAr: string;
  descAr: string;
  icon: string;
  color: string;
  papers: { label: string; dims: string }[];
  templates: PrintDocTemplate[];
};

const TEMPLATE_NAMES: [PrintLayoutId, string][] = [
  ["classic",  "كلاسيكي"],
  ["modern",   "حديث"],
  ["compact",  "مضغوط"],
  ["formal",   "رسمي"],
  ["luxury",   "فاخر"],
  ["card",     "بطاقي"],
  ["columns",  "أعمدة"],
  ["colorful", "ملون"],
  ["minimal",  "بسيط"],
  ["detailed", "مفصل"],
];

const COMMON_TEMPLATES: PrintDocTemplate[] = TEMPLATE_NAMES.map(([layout, nameAr], i) => ({
  id: i + 1, nameAr, layout,
}));

const PRINT_CATALOG: PrintDocType[] = [
  {
    id: "receipt",
    nameAr: "إيصال دفعة",
    descAr: "وصل استلام قسط أو دفعة مالية",
    icon: "🧾",
    color: "#2563EB",
    papers: [{ label: "A5", dims: "148 × 210 مم" }, { label: "حراري", dims: "80 × ∞ مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "statement",
    nameAr: "كشف حساب",
    descAr: "سجل كامل بمدفوعات الطالب",
    icon: "📋",
    color: "#0891B2",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A5", dims: "148 × 210 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "students-list",
    nameAr: "قائمة الطلاب",
    descAr: "جدول بيانات جميع الطلاب",
    icon: "👥",
    color: "#7C3AED",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A3", dims: "297 × 420 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "student-profile",
    nameAr: "ملف الطالب",
    descAr: "بطاقة شاملة ببيانات الطالب",
    icon: "🎓",
    color: "#059669",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A5", dims: "148 × 210 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "salaries",
    nameAr: "تقرير الرواتب",
    descAr: "كشف رواتب المعلمين الشهري",
    icon: "💰",
    color: "#D97706",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "Letter", dims: "216 × 279 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "expenses",
    nameAr: "تقرير المصاريف",
    descAr: "سجل وتحليل المصاريف",
    icon: "📊",
    color: "#DC2626",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A3", dims: "297 × 420 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "incomes",
    nameAr: "تقرير الإيرادات",
    descAr: "سجل وتحليل الإيرادات",
    icon: "📈",
    color: "#16A34A",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A3", dims: "297 × 420 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "schedule",
    nameAr: "الجدول الدراسي",
    descAr: "الجدول الأسبوعي للحصص",
    icon: "📅",
    color: "#0369A1",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A3", dims: "297 × 420 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "teacher-card",
    nameAr: "بطاقة المعلم",
    descAr: "بطاقة تعريفية للمعلم",
    icon: "👤",
    color: "#7C3AED",
    papers: [{ label: "بطاقة", dims: "85 × 54 مم" }, { label: "A5", dims: "148 × 210 مم" }],
    templates: COMMON_TEMPLATES,
  },
  {
    id: "attendance",
    nameAr: "تقرير الحضور",
    descAr: "كشف حضور وغياب الطلاب",
    icon: "✅",
    color: "#0891B2",
    papers: [{ label: "A4", dims: "210 × 297 مم" }, { label: "A3", dims: "297 × 420 مم" }],
    templates: COMMON_TEMPLATES,
  },
];

function TemplateThumbnail({
  layout,
  color,
  selected,
}: {
  layout: PrintLayoutId;
  color: string;
  selected: boolean;
}) {
  const renders: Record<PrintLayoutId, React.ReactNode> = {
    classic: (
      <>
        <div style={{ background: color, height: 14, margin: "-8px -8px 6px" }} />
        {[80, 60, 70, 50, 65].map((w, i) => (
          <div key={i} style={{ background: "#e2e8f0", height: 5, width: `${w}%`, borderRadius: 2, marginBottom: 3 }} />
        ))}
        <div style={{ background: color, height: 7, width: "50%", borderRadius: 2, marginTop: 4, opacity: 0.4 }} />
      </>
    ),
    modern: (
      <div style={{ display: "flex", gap: 5, height: "100%" }}>
        <div style={{ background: color, width: 6, borderRadius: 2 }} />
        <div style={{ flex: 1 }}>
          {[70, 50, 60, 45, 55, 65].map((w, i) => (
            <div key={i} style={{ background: "#e2e8f0", height: 5, width: `${w}%`, borderRadius: 2, marginBottom: 4 }} />
          ))}
        </div>
      </div>
    ),
    compact: (
      <>
        <div style={{ background: color, height: 10, margin: "-8px -8px 4px" }} />
        {[100, 100, 100, 100, 100, 100].map((_, i) => (
          <div key={i} style={{ background: i % 2 === 0 ? "#e2e8f0" : "#f1f5f9", height: 5, marginBottom: 1.5 }} />
        ))}
      </>
    ),
    formal: (
      <>
        <div style={{ textAlign: "center" }}>
          <div style={{ background: color, height: 10, width: "70%", borderRadius: 2, margin: "0 auto 5px" }} />
          <div style={{ background: "#e2e8f0", height: 4, width: "40%", borderRadius: 2, margin: "0 auto 6px" }} />
        </div>
        <div style={{ border: `1px solid ${color}40`, borderRadius: 4, padding: "4px 5px" }}>
          {[80, 60, 70, 55].map((w, i) => (
            <div key={i} style={{ background: "#e2e8f0", height: 4, width: `${w}%`, borderRadius: 2, marginBottom: 3 }} />
          ))}
        </div>
      </>
    ),
    luxury: (
      <div style={{ border: `1.5px solid ${color}60`, borderRadius: 5, padding: 5, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ background: color, height: 10, borderRadius: 3 }} />
        {[70, 50, 65, 55].map((w, i) => (
          <div key={i} style={{ background: "#e2e8f0", height: 4, width: `${w}%`, borderRadius: 2 }} />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2, opacity: 0.35 }}>
          <div style={{ flex: 1, height: 1, background: color }} />
          <div style={{ fontSize: 7, color }}>❖</div>
          <div style={{ flex: 1, height: 1, background: color }} />
        </div>
      </div>
    ),
    card: (
      <div style={{ border: `1px solid ${color}30`, borderRadius: 5, padding: 4, background: "white", height: "100%" }}>
        <div style={{ background: color, height: 8, borderRadius: 3, marginBottom: 4 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
          {[60, 70, 50, 80, 65, 75].map((_, i) => (
            <div key={i} style={{ background: "#e2e8f0", height: 4, borderRadius: 2 }} />
          ))}
        </div>
      </div>
    ),
    columns: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
        {[0, 1].map(col => (
          <div key={col}>
            <div style={{ background: color, height: 7, borderRadius: 2, marginBottom: 4, opacity: col === 0 ? 1 : 0.6 }} />
            {[80, 60, 70, 50].map((w, i) => (
              <div key={i} style={{ background: "#e2e8f0", height: 4, width: `${w}%`, borderRadius: 2, marginBottom: 3 }} />
            ))}
          </div>
        ))}
      </div>
    ),
    colorful: (
      <>
        <div style={{ background: color, height: 10, margin: "-8px -8px 4px" }} />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: i % 2 === 0 ? `${color}20` : "white", height: 7, borderRadius: 2, marginBottom: 1.5 }} />
        ))}
      </>
    ),
    minimal: (
      <>
        {[50, 90, 70, 80, 60, 75].map((w, i) => (
          <div key={i} style={{ background: i === 0 ? color : "#e2e8f0", height: i === 0 ? 7 : 5, width: `${w}%`, borderRadius: 2, marginBottom: 4 }} />
        ))}
      </>
    ),
    detailed: (
      <>
        <div style={{ background: color, height: 10, margin: "-8px -8px 4px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 5px", marginTop: 4 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{ background: i % 2 === 0 ? `${color}25` : "#e2e8f0", height: 5, borderRadius: 2 }} />
          ))}
        </div>
      </>
    ),
  };

  return (
    <div
      style={{
        width: 76,
        height: 96,
        padding: 8,
        borderRadius: 7,
        border: `2px solid ${selected ? color : "transparent"}`,
        background: selected ? `${color}08` : "#f8fafc",
        cursor: "pointer",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: selected ? `0 0 0 1px ${color}40` : "none",
        transition: "all 0.15s",
      }}
    >
      {renders[layout]}
    </div>
  );
}

function buildPrintTemplateHtml(
  doc: PrintDocType,
  template: PrintDocTemplate,
  primaryColor: string,
  receiptBg: string,
  bodyBg: string,
  settings: PrintStyleSettings,
): string {
  const yr = new Date().getFullYear();
  const paperCss = settings.paperSize === "A4"
    ? "width:210mm;min-height:297mm"
    : "width:148mm;min-height:210mm";

  const p = primaryColor;
  const orn = settings.showOrnaments
    ? `<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin:12px 24px;opacity:0.25;"><div style="flex:1;height:1px;background:${p}"></div><span style="color:${p};font-size:10px;">❖</span><div style="flex:1;height:1px;background:${p}"></div></div>`
    : "";
  const ribbon = settings.showRibbon
    ? `<div style="position:absolute;top:0;right:22px;background:${p};color:white;font-size:9px;font-weight:900;padding:6px 10px 14px;clip-path:polygon(0 0,100% 0,100% 75%,50% 100%,0 75%);min-width:38px;text-align:center;z-index:5;">${doc.nameAr.split(" ")[0]}</div>`
    : "";

  const rows = [["القسط الأول","250,000","250,000","0"],["القسط الثاني","250,000","125,000","125,000"],["القسط الثالث","250,000","0","250,000"]];
  const info = [["اسم الطالب","أحمد محمد علي"],["الصف","الأول — أ"],["رقم الإيصال","#1234"],["التاريخ",`15 / 05 / ${yr}`],["الهاتف","07700000000"],["ملاحظات","—"]];

  // ── shared blocks ──────────────────────────────────────────────────────────
  const stdTable = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr style="background:${p};color:white;">
      ${["البند","المبلغ الكلي","المدفوع","المتبقي"].map(h=>`<th style="padding:8px 10px;text-align:right;font-weight:900;">${h}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${rows.map((r,i)=>`<tr style="background:${i%2===0?"#f8fafc":"white"};">${r.map(c=>`<td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${c}</td>`).join("")}</tr>`).join("")}
      <tr style="background:${p}18;font-weight:900;">
        ${["المجموع","750,000","375,000","375,000"].map(c=>`<td style="padding:7px 10px;color:${p};">${c}</td>`).join("")}
      </tr>
    </tbody>
  </table>`;

  const kvList = info.map(([l,v])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;"><span style="color:#6b7280;">${l}</span><span style="font-weight:700;color:${p};">${v}</span></div>`).join("");

  const infoCards = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e5e7eb;border-radius:8px;overflow:hidden;">
    ${info.map(([l,v])=>`<div style="background:white;padding:10px 14px;"><div style="font-size:10px;color:#9ca3af;margin-bottom:2px;">${l}</div><div style="font-size:13px;font-weight:700;color:${p};">${v}</div></div>`).join("")}
  </div>`;

  const amountBox = `<div style="border:2px solid ${p}30;border-radius:10px;padding:16px;text-align:center;background:white;margin:12px 0;">
    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">إجمالي المدفوع</div>
    <div style="font-size:32px;font-weight:900;color:${p};letter-spacing:-1px;">375,000</div>
    <div style="font-size:11px;color:#9ca3af;margin-top:2px;">دينار عراقي</div>
  </div>`;

  // ── logo block ─────────────────────────────────────────────────────────────
  const lp = settings.logoPosition;
  const logoAlign = lp === "center" ? "center" : lp === "left" ? "flex-start" : lp === "right" ? "flex-end" : "";
  const subtitle = settings.headerSubtitle.trim() || "المدرسة النموذجية";
  const logoBlock = lp === "none" ? "" : `
    <div style="display:flex;flex-direction:column;align-items:${logoAlign};padding:14px 20px 6px;">
      <div style="width:52px;height:52px;border-radius:50%;background:${p};color:white;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;">م</div>
      <div style="font-size:13px;font-weight:900;color:${p};margin-top:6px;">${subtitle}</div>
    </div>`;

  // ── footer details ─────────────────────────────────────────────────────────
  const fl1 = settings.footerLine1.trim();
  const fl2 = settings.footerLine2.trim();
  const footerDetails = (fl1 || fl2) ? `
    <div style="border-top:1px solid ${p}20;margin:0 16px;padding:10px 0 4px;text-align:center;">
      ${fl1 ? `<div style="font-size:10px;color:#6b7280;margin-bottom:2px;">${fl1}</div>` : ""}
      ${fl2 ? `<div style="font-size:10px;color:#9ca3af;">${fl2}</div>` : ""}
    </div>` : "";

  const stdFooter = `<div style="text-align:center;padding:12px 24px 16px;">${orn}<span style="font-size:11px;color:#9ca3af;">شكراً لثقتكم بنا — ${doc.nameAr}</span>${footerDetails}</div>`;

  // ── per-layout body ────────────────────────────────────────────────────────
  let body = "";

  if (template.layout === "classic") {
    body = `
      ${logoBlock}
      <div style="position:relative;">
        ${ribbon}
        <div style="background:${p};color:white;padding:${lp!=="none"?"14px":"22px"} 24px;text-align:center;">
          <div style="font-size:22px;font-weight:900;margin-bottom:3px;">${doc.nameAr}</div>
          <div style="font-size:12px;opacity:0.8;">${subtitle} · ${yr}</div>
        </div>
      </div>
      <div style="padding:16px;">${infoCards}</div>
      <div style="padding:0 16px 16px;">${stdTable}</div>
      ${stdFooter}`;

  } else if (template.layout === "modern") {
    body = `
      <div style="display:flex;min-height:inherit;">
        <div style="width:6px;background:${p};flex-shrink:0;border-radius:0 0 12px 0;"></div>
        <div style="flex:1;padding:24px 20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
            <div>
              <div style="font-size:22px;font-weight:900;color:${p};">${doc.nameAr}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:3px;">\${subtitle} · \${yr}</div>
            </div>
            <div style="width:44px;height:44px;border-radius:50%;background:${p};color:white;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;">م</div>
          </div>
          ${infoCards}
          <div style="margin-top:16px;">${stdTable}</div>
          ${stdFooter}
        </div>
      </div>`;

  } else if (template.layout === "compact") {
    body = `
      <div style="background:${p};color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;font-weight:900;">${doc.nameAr}</div>
        <div style="font-size:10px;opacity:0.8;">${yr}</div>
      </div>
      <div style="padding:10px 16px;">${kvList}</div>
      <div style="padding:0 16px;margin-top:8px;font-size:11px;font-weight:900;color:${p};">جدول الأقساط</div>
      <div style="padding:6px 16px 16px;">${stdTable}</div>
      <div style="text-align:center;padding:10px 16px;font-size:10px;color:#9ca3af;border-top:1px solid #f1f5f9;">شكراً لثقتكم بنا</div>`;

  } else if (template.layout === "formal") {
    body = `
      <div style="border-bottom:3px solid ${p};padding:24px;text-align:center;">
        ${lp !== "none" ? `<div style="width:54px;height:54px;border-radius:50%;background:${p};color:white;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;margin-bottom:10px;">م</div>` : ""}
        <div style="font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${subtitle}</div>
        <div style="font-size:20px;font-weight:900;color:${p};">${doc.nameAr}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:3px;">رقم الإيصال: #1234 · ${yr}</div>
      </div>
      ${orn}
      <div style="padding:0 24px;">${infoCards}</div>
      <div style="padding:16px 24px;">${stdTable}</div>
      ${stdFooter}`;

  } else if (template.layout === "luxury") {
    body = `
      <div style="margin:16px;border:2px solid ${p}40;border-radius:10px;overflow:hidden;">
        <div style="background:${p};color:white;padding:20px;text-align:center;position:relative;">
          <div style="font-size:8px;letter-spacing:4px;opacity:0.7;text-transform:uppercase;margin-bottom:6px;">${subtitle}</div>
          <div style="font-size:20px;font-weight:900;">${doc.nameAr}</div>
          ${orn.replace("margin:12px 24px","margin:10px 0 0")}
        </div>
        <div style="padding:16px;">${infoCards}</div>
        ${orn}
        ${amountBox}
        ${orn}
        <div style="padding:0 16px 16px;">${stdTable}</div>
        <div style="text-align:center;padding:10px 16px 16px;font-size:11px;color:#9ca3af;">شكراً لثقتكم بنا</div>
      </div>`;

  } else if (template.layout === "card") {
    body = `
      <div style="padding:20px;">
        <div style="border:1.5px solid ${p}30;border-radius:12px;overflow:hidden;">
          <div style="background:${p}10;border-bottom:1.5px solid ${p}20;padding:16px 20px;display:flex;align-items:center;gap:14px;">
            <div style="width:42px;height:42px;border-radius:10px;background:${p};color:white;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;flex-shrink:0;">م</div>
            <div>
              <div style="font-size:16px;font-weight:900;color:${p};">${doc.nameAr}</div>
              <div style="font-size:11px;color:#9ca3af;">\${subtitle} · \${yr}</div>
            </div>
            <div style="margin-right:auto;text-align:left;">
              <div style="font-size:10px;color:#9ca3af;">رقم الإيصال</div>
              <div style="font-size:14px;font-weight:900;color:${p};">#1234</div>
            </div>
          </div>
          <div style="padding:16px 20px;">${infoCards}</div>
        </div>
        <div style="border:1.5px solid ${p}30;border-radius:12px;overflow:hidden;margin-top:12px;">
          <div style="background:${p};color:white;padding:10px 16px;font-size:12px;font-weight:900;">جدول الأقساط</div>
          <div style="padding:12px;">${stdTable}</div>
        </div>
        ${amountBox}
      </div>`;

  } else if (template.layout === "columns") {
    body = `
      <div style="background:${p};color:white;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:20px;font-weight:900;">${doc.nameAr}</div>
          <div style="font-size:11px;opacity:0.8;">\${subtitle} · \${yr}</div>
        </div>
        <div style="font-size:11px;opacity:0.8;text-align:left;">رقم: #1234<br/>15/05/${yr}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;padding:16px;">
        <div>
          <div style="font-size:11px;font-weight:900;color:${p};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">بيانات الطالب</div>
          ${kvList}
          ${orn}
          ${amountBox}
        </div>
        <div>
          <div style="font-size:11px;font-weight:900;color:${p};margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">جدول الأقساط</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead><tr style="background:${p};color:white;">
              ${["القسط","الكلي","المتبقي"].map(h=>`<th style="padding:7px 8px;text-align:right;font-weight:900;">${h}</th>`).join("")}
            </tr></thead>
            <tbody>
              ${rows.map((r,i)=>`<tr style="background:${i%2===0?"#f8fafc":"white"};">${[r[0],r[1],r[3]].map(c=>`<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${c}</td>`).join("")}</tr>`).join("")}
              <tr style="background:${p}18;font-weight:900;">${["المجموع","750,000","375,000"].map(c=>`<td style="padding:6px 8px;color:${p};">${c}</td>`).join("")}</tr>
            </tbody>
          </table>
        </div>
      </div>
      ${stdFooter}`;

  } else if (template.layout === "colorful") {
    body = `
      <div style="background:linear-gradient(135deg,${p},${p}cc);color:white;padding:24px;text-align:center;">
        <div style="font-size:11px;letter-spacing:3px;opacity:0.8;margin-bottom:6px;">${subtitle}</div>
        <div style="font-size:24px;font-weight:900;">${doc.nameAr}</div>
        <div style="font-size:12px;opacity:0.8;margin-top:4px;">${yr} · رقم الإيصال #1234</div>
      </div>
      <div style="padding:16px;">
        ${info.map(([l,v],i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:8px;margin-bottom:4px;background:${i%2===0?p+"12":"transparent"};font-size:12px;"><span style="color:#6b7280;">${l}</span><span style="font-weight:700;color:${p};">${v}</span></div>`).join("")}
      </div>
      <div style="padding:0 16px 16px;">${stdTable}</div>
      ${stdFooter}`;

  } else if (template.layout === "minimal") {
    body = `
      <div style="padding:32px 36px;">
        <div style="border-bottom:2px solid ${p};padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="font-size:11px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${doc.nameAr}</div>
            <div style="font-size:20px;font-weight:900;color:${p};">${subtitle}</div>
          </div>
          <div style="text-align:left;font-size:11px;color:#9ca3af;">#1234<br/>15/05/${yr}</div>
        </div>
        ${kvList}
        <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px;">${stdTable}</div>
        <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:14px;text-align:center;font-size:11px;color:#9ca3af;">شكراً لثقتكم بنا</div>
      </div>`;

  } else if (template.layout === "detailed") {
    body = `
      <div style="position:relative;">
        ${ribbon}
        <div style="background:${p};color:white;padding:18px 24px;">
          <div style="font-size:20px;font-weight:900;">${doc.nameAr}</div>
          <div style="font-size:11px;opacity:0.8;margin-top:2px;">\${subtitle} · \${yr}</div>
        </div>
      </div>
      <div style="padding:16px 24px;">
        ${info.map(([l,v])=>`<div style="display:grid;grid-template-columns:110px 1fr;border-bottom:1px solid #f1f5f9;padding:7px 0;font-size:12px;"><span style="color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding-top:2px;">${l}</span><span style="font-weight:700;color:${p};">${v}</span></div>`).join("")}
      </div>
      ${orn}
      <div style="padding:0 24px 8px;font-size:11px;font-weight:900;color:${p};">سجل الأقساط</div>
      <div style="padding:0 24px 16px;">${stdTable}</div>
      ${amountBox.replace("margin:12px 0","margin:0 24px 16px")}
      ${stdFooter}`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${doc.nameAr} — ${template.nameAr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Noto Sans Arabic',Arial,sans-serif;background:${bodyBg};display:flex;justify-content:center;padding:24px;}
    .page{${paperCss};background:${receiptBg};box-shadow:0 4px 32px rgba(0,0,0,0.14);border-radius:12px;overflow:hidden;}
    @media print{body{background:white;padding:0;}.page{box-shadow:none;border-radius:0;width:100%;min-height:100vh;}}
  </style>
</head>
<body><div class="page">${body}</div></body>
</html>`;
}

function PrintDocCard({
  doc,
  themeId,
  printStyle,
}: {
  doc: PrintDocType;
  themeId: string;
  printStyle: PrintStyleSettings;
}) {
  const [selectedTpl, setSelectedTpl] = useState(0);
  const template = doc.templates[selectedTpl];
  const theme = getPrintTheme(themeId);

  function getTemplateHtml() {
    return buildPrintTemplateHtml(doc, template, theme.primaryColor, theme.receiptBg, theme.bodyBg, printStyle);
  }

  function downloadTemplate() {
    const blob = new Blob([getTemplateHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `نموذج_${doc.nameAr}_${template.nameAr}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function previewTemplate() {
    const blob = new Blob([getTemplateHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) {
      win.addEventListener("unload", () => URL.revokeObjectURL(url), { once: true });
    }
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
      style={{ background: "var(--surface-strong)" }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: `${doc.color}18` }}
        >
          {doc.icon}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-[var(--text-primary)]">{doc.nameAr}</div>
          <div className="text-[10px] text-[var(--text-muted)] truncate">{doc.descAr}</div>
        </div>
      </div>

      {/* Paper sizes */}
      <div className="flex gap-1.5 flex-wrap">
        {doc.papers.map(p => (
          <div
            key={p.label}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{ background: `${doc.color}12`, color: doc.color }}
          >
            <span>{p.label}</span>
            <span className="opacity-60 font-normal">{p.dims}</span>
          </div>
        ))}
      </div>

      {/* Template strip */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
          القالب · {template.nameAr}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {doc.templates.map((tpl, idx) => (
            <div
              key={tpl.id}
              className="flex flex-col items-center gap-0.5 flex-shrink-0"
              onClick={() => setSelectedTpl(idx)}
            >
              <TemplateThumbnail layout={tpl.layout} color={doc.color} selected={selectedTpl === idx} />
              <span
                className="text-[10px] font-bold text-center leading-tight"
                style={{ color: selectedTpl === idx ? doc.color : "var(--text-muted)" }}
              >
                {tpl.nameAr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={previewTemplate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border"
          style={{ background: `${doc.color}10`, color: doc.color, borderColor: `${doc.color}30` }}
        >
          <ExternalLink size={12} />
          <span>معاينة</span>
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-95"
          style={{ background: doc.color }}
        >
          <Download size={12} />
          <span>تحميل</span>
        </button>
      </div>
    </div>
  );
}

// ─── Print Theme Preview ──────────────────────────────────────────────────────

function PrintThemePreview({
  themeId,
  settings,
}: {
  themeId: string;
  settings: PrintStyleSettings;
}) {
  const theme = getPrintTheme(themeId);
  const primary = theme.primaryColor;
  const isClassic = settings.style === "classic";

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md border border-[var(--border)]"
      style={{ background: theme.bodyBg, padding: "12px", fontFamily: "Arial" }}
      dir="rtl"
    >
      {/* Receipt card */}
      <div
        className="rounded-xl overflow-hidden shadow-sm mx-auto"
        style={{
          background: theme.receiptBg,
          border: `1.5px solid ${primary}25`,
          maxWidth: "220px",
          position: "relative",
        }}
      >
        {/* Ribbon */}
        {isClassic && settings.showRibbon && (
          <div style={{
            position: "absolute", top: 0, right: "14px",
            background: primary, color: "white",
            fontSize: "8px", fontWeight: 900,
            padding: "4px 8px 10px",
            clipPath: "polygon(0 0,100% 0,100% 75%,50% 100%,0 75%)",
            minWidth: "32px", textAlign: "center", zIndex: 1,
          }}>
            إيصال
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: "center", padding: "14px 12px 8px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: primary, color: "white",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 900, marginBottom: "6px",
          }}>م</div>
          <div style={{ fontSize: "11px", fontWeight: 900, color: primary }}>المدرسة النموذجية</div>
          <div style={{ fontSize: "8px", opacity: 0.5, marginTop: "2px" }}>رقم الإيصال: #1234</div>
        </div>

        {/* Ornament */}
        {settings.showOrnaments && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", margin: "4px 10px", opacity: 0.25 }}>
            <div style={{ flex: 1, height: "1px", background: primary }} />
            <span style={{ fontSize: "8px", color: primary }}>❖</span>
            <div style={{ flex: 1, height: "1px", background: primary }} />
          </div>
        )}

        {/* Info grid */}
        <div style={{
          margin: "4px 8px",
          border: `1px solid ${primary}20`,
          borderRadius: "6px",
          overflow: "hidden",
          background: "white",
        }}>
          {[
            ["اسم الطالب", "أحمد محمد"],
            ["الصف", "الأول أ"],
            ["التاريخ", "15/5/2026"],
          ].map(([label, value], i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              borderBottom: i < 2 ? `1px solid ${primary}10` : "none",
            }}>
              <div style={{ padding: "4px 6px" }}>
                <div style={{ fontSize: "7px", opacity: 0.45 }}>{label}</div>
                <div style={{ fontSize: "9px", fontWeight: 700, color: primary }}>{value}</div>
              </div>
              <div style={{ padding: "4px 6px", borderRight: `1px solid ${primary}10` }}>
                <div style={{ fontSize: "7px", opacity: 0.45 }}>—</div>
                <div style={{ fontSize: "9px" }}>—</div>
              </div>
            </div>
          ))}
        </div>

        {/* Amount box */}
        <div style={{
          margin: "6px 8px",
          border: `1.5px solid ${primary}30`,
          borderRadius: "6px",
          padding: "8px",
          textAlign: "center",
          background: "white",
        }}>
          <div style={{ fontSize: "7px", opacity: 0.5, marginBottom: "2px" }}>المبلغ المستلم</div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: primary, letterSpacing: "-0.5px" }}>
            125,000
          </div>
          <div style={{ fontSize: "8px", opacity: 0.5 }}>د.ع</div>
        </div>

        {/* Bottom ornament */}
        {settings.showOrnaments && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", margin: "4px 10px 2px", opacity: 0.25 }}>
            <div style={{ flex: 1, height: "1px", background: primary }} />
            <span style={{ fontSize: "8px", color: primary }}>❖</span>
            <div style={{ flex: 1, height: "1px", background: primary }} />
          </div>
        )}
        <div style={{ textAlign: "center", padding: "4px 8px 10px", fontSize: "10px", fontWeight: 900, color: primary }}>
          شكراً لكم 🎓
        </div>
      </div>
    </div>
  );
}

// ─── Printing Tab ─────────────────────────────────────────────────────────────

function PrintingTab() {
  const [printThemeId, setPrintThemeId] = useState<string>(() => {
    if (typeof window === "undefined") return "navy_c";
    return localStorage.getItem("print-theme") ?? "navy_c";
  });
  const [printStyle, setPrintStyle] = useState<PrintStyleSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_PRINT_STYLE;
    try {
      const stored = localStorage.getItem("print-style");
      return stored ? { ...DEFAULT_PRINT_STYLE, ...JSON.parse(stored) } : DEFAULT_PRINT_STYLE;
    } catch { return DEFAULT_PRINT_STYLE; }
  });
  const [activePrintFamily, setActivePrintFamily] = useState<string>("classic");

  useEffect(() => { localStorage.setItem("print-theme", printThemeId); }, [printThemeId]);
  useEffect(() => { localStorage.setItem("print-style", JSON.stringify(printStyle)); }, [printStyle]);

  return (
    <div className="space-y-5">
      <Section title="مظهر الطباعة" description="خصّص شكل الإيصالات والمستندات عند الطباعة">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* LEFT: families + theme grid + settings */}
          <div className="flex-1 space-y-5">

            {/* Family tabs */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">عائلة الطراز</p>
              <div className="flex gap-2 flex-wrap">
                {PRINT_THEME_FAMILIES.map(family => (
                  <button
                    key={family.id}
                    type="button"
                    onClick={() => setActivePrintFamily(family.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      activePrintFamily === family.id
                        ? "text-white shadow-sm"
                        : "bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                    style={activePrintFamily === family.id ? { background: "var(--primary)" } : {}}
                  >
                    {family.nameAr}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme grid — 3 columns */}
            <div className="grid grid-cols-3 gap-2.5">
              {getPrintThemesInFamily(activePrintFamily as PrintThemeFamilyId).map(theme => {
                const selected = printThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setPrintThemeId(theme.id)}
                    className={cn(
                      "rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                      selected ? "border-[var(--primary)] shadow-md scale-[1.03]" : "border-[var(--border)]"
                    )}
                  >
                    {/* Color strip: primaryColor top, accentColor mid, receiptBg bottom */}
                    <div className="h-10 flex flex-col">
                      <div className="h-5" style={{ background: theme.primaryColor }} />
                      <div className="h-2" style={{ background: theme.accentColor }} />
                      <div className="flex-1" style={{ background: theme.receiptBg }} />
                    </div>
                    <div className="px-2 py-1 bg-[var(--surface-strong)] flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text-primary)] truncate">{theme.nameAr}</span>
                      {selected && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{ background: "var(--primary)" }}
                        >
                          <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                            <path d="M1 3.5L2.8 5.5L6 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Style settings — 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">

              {/* Style: classic vs minimal */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">الأسلوب</label>
                <div className="flex gap-1.5">
                  {([["classic", "كلاسيكي"], ["minimal", "بسيط"]] as [PrintStyle, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setPrintStyle(s => ({ ...s, style: val }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                        printStyle.style === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={printStyle.style === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper size */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">حجم الورقة</label>
                <div className="flex gap-1.5">
                  {([["A5", "A5"], ["A4", "A4"]] as [PrintPaperSize, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setPrintStyle(s => ({ ...s, paperSize: val }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                        printStyle.paperSize === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={printStyle.paperSize === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">العلامات المائية</label>
                <div className="flex gap-1.5">
                  {([["show", "تفعيل"], ["hide", "إخفاء"]] as [PrintWatermark, string][]).map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setPrintStyle(s => ({ ...s, watermark: val }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                        printStyle.watermark === val
                          ? "text-white border-transparent"
                          : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                      )}
                      style={printStyle.watermark === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ribbon & Ornaments toggles */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">الزخارف</label>
                <div className="flex gap-1.5">
                  <button type="button"
                    onClick={() => setPrintStyle(s => ({ ...s, showRibbon: !s.showRibbon }))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      printStyle.showRibbon
                        ? "text-white border-transparent"
                        : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                    )}
                    style={printStyle.showRibbon ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                  >
                    الشارة
                  </button>
                  <button type="button"
                    onClick={() => setPrintStyle(s => ({ ...s, showOrnaments: !s.showOrnaments }))}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      printStyle.showOrnaments
                        ? "text-white border-transparent"
                        : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                    )}
                    style={printStyle.showOrnaments ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                  >
                    الزخارف
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: live preview */}
          <div className="xl:w-64 flex-shrink-0">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">المعاينة الحية</p>
            <PrintThemePreview themeId={printThemeId} settings={printStyle} />
          </div>

        </div>
      </Section>

      {/* Header & Footer settings */}
      <Section title="الرأس والتذييل" description="اللوغو وموقعه، والنص أسفل الصفحة">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Logo position */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">موقع اللوغو</label>
            <div className="flex gap-1.5">
              {([["center","وسط"],["right","يمين"],["left","يسار"],["none","بدون"]] as [PrintLogoPosition, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPrintStyle(s => ({ ...s, logoPosition: val }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                    printStyle.logoPosition === val
                      ? "text-white border-transparent"
                      : "bg-[var(--surface-strong)] text-[var(--text-secondary)] border-[var(--border)]"
                  )}
                  style={printStyle.logoPosition === val ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Logo position visual indicator */}
            <div className="h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 flex items-center" style={{
                justifyContent: printStyle.logoPosition === "center" ? "center" : printStyle.logoPosition === "right" ? "flex-end" : printStyle.logoPosition === "left" ? "flex-start" : "center",
                padding: "0 12px",
              }}>
                {printStyle.logoPosition !== "none" ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: "var(--primary)" }}>م</div>
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)]">لا يوجد لوغو</span>
                )}
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">النص أسفل اللوغو</label>
            <input
              type="text"
              value={printStyle.headerSubtitle}
              onChange={e => setPrintStyle(s => ({ ...s, headerSubtitle: e.target.value }))}
              placeholder="المدرسة النموذجية"
              className={INPUT_CLS}
              maxLength={60}
            />
            <p className="text-[10px] text-[var(--text-muted)]">يظهر مباشرة تحت اللوغو في الرأس</p>
          </div>

          {/* Footer line 1 */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">سطر التذييل الأول</label>
            <input
              type="text"
              value={printStyle.footerLine1}
              onChange={e => setPrintStyle(s => ({ ...s, footerLine1: e.target.value }))}
              placeholder="مثال: بغداد — شارع المدارس"
              className={INPUT_CLS}
              maxLength={80}
            />
          </div>

          {/* Footer line 2 */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">سطر التذييل الثاني</label>
            <input
              type="text"
              value={printStyle.footerLine2}
              onChange={e => setPrintStyle(s => ({ ...s, footerLine2: e.target.value }))}
              placeholder="مثال: هاتف: 07700000000 | school.com"
              className={INPUT_CLS}
              maxLength={80}
            />
          </div>

        </div>
      </Section>

      {/* Info note */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 flex gap-3 items-start">
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          سيتم تطبيق إعدادات الطباعة على جميع الإيصالات والمستندات المطبوعة من هذا الجهاز. الإعدادات محفوظة محلياً في المتصفح.
        </p>
      </div>

      {/* Document catalog */}
      <Section
        title="نماذج المستندات"
        description="جميع أنواع المستندات القابلة للطباعة — اختر القالب المناسب وحمّله"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {PRINT_CATALOG.map(doc => (
            <PrintDocCard key={doc.id} doc={doc} themeId={printThemeId} printStyle={printStyle} />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const initialTab = (searchParams.get("tab") as TabId) || "branding";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const schoolId =
    schoolScope.selectedSchoolId ??
    profile?.school_id ??
    profile?.school?.id ??
    "";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/dashboard/settings" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="الإعدادات"
            subtitle="إدارة إعدادات المدرسة والنظام"
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
                    title="الإعدادات"
                    description="لن يتم تحميل الإعدادات قبل اختيار مدرسة لهذا القسم."
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hero Banner */}
                  <div
                    className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, var(--success)) 100%)",
                    }}
                  >
                    <div
                      className="absolute -top-8 -end-8 w-40 h-40 rounded-full opacity-10 pointer-events-none"
                      style={{ background: "white" }}
                    />
                    <div
                      className="absolute -bottom-4 -start-4 w-24 h-24 rounded-full opacity-5 pointer-events-none"
                      style={{ background: "white" }}
                    />
                    <div className="relative z-10 flex flex-col gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                      >
                        <Settings size={24} className="text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-black text-white">الإعدادات</h1>
                        <p className="text-sm text-white/70 mt-1">
                          إدارة إعدادات المدرسة والنظام
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Bar */}
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] w-fit flex-wrap">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-colors z-10",
                          )}
                          style={{
                            color: isActive ? "white" : "var(--text-secondary)",
                          }}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="settings-tab-pill"
                              className="absolute inset-0 rounded-xl z-[-1]"
                              style={{ background: "var(--primary)" }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              }}
                            />
                          )}
                          <Icon size={14} />
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {activeTab === "branding" && (
                        <BrandingTab schoolId={schoolId} />
                      )}
                      {activeTab === "exports" && (
                        <ExportsTab schoolId={schoolId} />
                      )}
                      {activeTab === "printing" && (
                        <PrintingTab />
                      )}
                      {activeTab === "roles" && (
                        <RolesTab locale={locale} />
                      )}
                      {activeTab === "dashboard-tab" && (
                        <DashboardSettingsTab />
                      )}
                      {activeTab === "year-end" && (
                        <YearEndTab schoolId={schoolId} />
                      )}
                      {activeTab === "archive" && (
                        <ArchiveTab schoolId={schoolId} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
