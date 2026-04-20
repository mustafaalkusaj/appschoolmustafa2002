"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Palette, Save, Pipette, Info, Check, RefreshCw, Upload, X } from "@/lib/icons";
import { BRAND_THEME_FAMILIES } from "@/lib/brand/themes";
import { BrandingFormData } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import { supabase } from "@/lib/supabase";

interface SchoolBrandingPanelProps {
  brandingForm: BrandingFormData;
  setBrandingForm: React.Dispatch<React.SetStateAction<BrandingFormData>>;
  brandingSaving: boolean;
  brandingDeriving: boolean;
  brandingNotice: string;
  selectedBrandTheme: { id: string; label: string; familyLabel: string } | null;
  onSave: () => Promise<void>;
  onApplyTheme: (presetId: string) => void;
  onDeriveFromLogo: () => Promise<void>;
}

export function SchoolBrandingPanel({
  brandingForm,
  setBrandingForm,
  brandingSaving,
  brandingDeriving,
  brandingNotice,
  selectedBrandTheme,
  onSave,
  onApplyTheme,
  onDeriveFromLogo,
}: SchoolBrandingPanelProps) {
  const t = useTranslations("dashboard.branding");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
      setUploadError("حجم الصورة كبير جداً (الحد الأقصى 2 ميغابايت).");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `logo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("school-logos")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("school-logos")
        .getPublicUrl(fileName);

      setBrandingForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <Palette size={18} />
        </div>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              {t("schoolName")}
            </label>
            <Input
              placeholder={t("schoolNamePlaceholder")}
              value={brandingForm.name}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">
              {t("logoUrl")}
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => void handleFileUpload(e)}
            />

            {/* Upload button + URL input row */}
            <div className="flex gap-2">
              <Input
                placeholder={t("logoPlaceholder")}
                value={brandingForm.logo_url}
                onChange={(e) => { setUploadError(null); setBrandingForm((prev) => ({ ...prev, logo_url: e.target.value })); }}
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="رفع صورة من جهازك"
              >
                {uploading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                <span className="text-xs hidden sm:inline">{uploading ? "جاري الرفع..." : "رفع"}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => void onDeriveFromLogo()}
                disabled={brandingDeriving || !brandingForm.logo_url}
                title={t("deriveColors")}
              >
                {brandingDeriving ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Pipette size={16} />
                )}
              </Button>
              {brandingForm.logo_url && (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
                  onClick={() => { setUploadError(null); setBrandingForm((prev) => ({ ...prev, logo_url: "" })); }}
                  title="إزالة الشعار"
                >
                  <X size={15} />
                </Button>
              )}
            </div>

            {uploadError && (
              <p className="mt-1.5 text-xs text-[var(--danger)] font-semibold flex items-center gap-1">
                <Info size={12} />
                {uploadError}
              </p>
            )}

            <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
              يمكنك رفع صورة (PNG، JPG، WebP) حتى 2 ميغابايت، أو لصق رابط الصورة مباشرة.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Info size={14} className="text-[var(--primary)]" />
              <span>{t("themeFamilies")}</span>
            </div>
            
            <div className="grid gap-4 max-h-[280px] overflow-y-auto">
              {BRAND_THEME_FAMILIES.map((family) => (
                <div key={family.id} className="space-y-3 p-3 rounded-xl bg-[var(--surface-muted)]/50 border border-[var(--border)]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {t(`families.${family.id}.label`)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                      {t(`families.${family.id}.description`)}
                    </span>
                  </div>
                  
                  <div className="grid gap-2">
                    {family.presets.map((preset) => {
                      const active = brandingForm.theme_preset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onApplyTheme(preset.id)}
                          className={cn(
                            "w-full text-start p-2.5 rounded-xl border transition-colors group relative overflow-hidden",
                            active 
                              ? "bg-[var(--card-bg)] shadow-sm border-[var(--primary)]/30" 
                              : "bg-[var(--card-bg)]/50 border-[var(--border)] hover:border-[var(--primary)]/20"
                          )}
                        >
                          {active && (
                            <div className="absolute top-0 end-0 w-1 h-full bg-[var(--primary)]" />
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-semibold", active ? "text-[var(--primary)]" : "text-[var(--text-primary)]")}>
                                  {preset.label}
                                </span>
                                {active && <Check size={12} className="text-[var(--primary)]" />}
                              </div>
                              <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{preset.description}</p>
                            </div>
                            <div className="flex -space-x-1.5 shrink-0">
                              {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map((swatch, idx) => (
                                <span 
                                  key={idx} 
                                  className="w-4 h-4 rounded-full border-2 border-[var(--card-bg)] shadow-sm"
                                  style={{ background: swatch }} 
                                />
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t("primaryColor")}
            </label>
            <div className="relative h-10 rounded-xl border border-[var(--border)] p-1 bg-[var(--card-bg)] flex items-center overflow-hidden">
              <input
                type="color"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={brandingForm.primary_color || "#4f8cff"}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, primary_color: e.target.value, theme_preset: "" }))}
              />
              <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: brandingForm.primary_color || "#4f8cff" }} />
              <span className="ui-hex px-3 text-xs font-bold text-[var(--text-muted)] uppercase">
                {brandingForm.primary_color || "#4F8CFF"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              {t("secondaryColor")}
            </label>
            <div className="relative h-10 rounded-xl border border-[var(--border)] p-1 bg-[var(--card-bg)] flex items-center overflow-hidden">
              <input
                type="color"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={brandingForm.secondary_color || "#79d7ff"}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, secondary_color: e.target.value, theme_preset: "" }))}
              />
              <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: brandingForm.secondary_color || "#79d7ff" }} />
              <span className="ui-hex px-3 text-xs font-bold text-[var(--text-muted)] uppercase">
                {brandingForm.secondary_color || "#79D7FF"}
              </span>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div 
          className="relative overflow-hidden rounded-xl p-4 border transition-all duration-500"
          style={{ 
            background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}08, ${brandingForm.secondary_color || "#79d7ff"}12)`,
            borderColor: `${brandingForm.primary_color || "#4f8cff"}20`
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="shrink-0">
              {brandingForm.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandingForm.logo_url}
                  alt={brandingForm.name || "School logo"}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[var(--card-bg)] shadow-md bg-[var(--card-bg)]"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-[var(--card-bg)]"
                  style={{ 
                    background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}, ${brandingForm.secondary_color || "#79d7ff"})` 
                  }}
                >
                  {(brandingForm.name || "S").trim().charAt(0) || "S"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {brandingForm.name || t("schoolName")}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1 leading-relaxed">
                {t("previewNotice")}
              </p>
              {selectedBrandTheme && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] text-[10px] font-bold mt-2 border border-[var(--primary)]/10">
                  <Palette size={10} />
                  <span>{t("activeTheme", { label: selectedBrandTheme.label })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {brandingNotice && (
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2",
            brandingNotice.includes("تعذر") 
              ? "bg-[color-mix(in_srgb,var(--danger)_5%,transparent)] text-[var(--danger)] border border-[var(--danger)]/20" 
              : "bg-[color-mix(in_srgb,var(--success)_5%,transparent)] text-[var(--success)] border border-[var(--success)]/20"
          )}>
            {brandingNotice.includes("تعذر") ? <Info size={14} /> : <Check size={14} />}
            <span>{brandingNotice}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button 
            className="min-w-[120px]"
            onClick={() => void onSave()} 
            disabled={brandingSaving}
          >
            {brandingSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>{t("saving")}</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{t("saveAction")}</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
