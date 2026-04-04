"use client";

import { Palette, Save, Image, Pipette, Info, Check } from "@/lib/icons";
import { BRAND_THEME_FAMILIES } from "@/lib/brand/themes";
import { BrandingFormData } from "./types";

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
  return (
    <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem", fontWeight: 800 }}>
        <Palette size={18} className="text-primary" />
        <span>هوية المدرسة (سوبر أدمن)</span>
      </div>

      <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
            اسم المدرسة
          </label>
          <input
            className="ui-input"
            style={{ minHeight: "48px", fontSize: "0.875rem" }}
            placeholder="أدخل اسم المدرسة"
            value={brandingForm.name}
            onChange={(e) => setBrandingForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
            رابط الشعار (URL)
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              className="ui-input"
              style={{ minHeight: "48px", fontSize: "0.875rem", flex: 1 }}
              placeholder="https://example.com/logo.png"
              value={brandingForm.logo_url}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, logo_url: e.target.value }))}
            />
            <button 
              className="ui-button ui-button--secondary" 
              style={{ minHeight: "48px", padding: "0 1rem" }}
              onClick={() => void onDeriveFromLogo()}
              disabled={brandingDeriving || !brandingForm.logo_url}
              title="استخراج الألوان من الشعار"
            >
              <Pipette size={18} className={brandingDeriving ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={14} className="text-tertiary" />
            عوائل الألوان والثيمات الجاهزة
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto", padding: "2px" }}>
            {BRAND_THEME_FAMILIES.map((family) => (
              <div key={family.id} style={{ border: "1px solid var(--border)", borderRadius: "14px", padding: "1rem", background: "var(--surface-soft)" }}>
                <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.8125rem" }}>{family.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem", marginBottom: "0.75rem" }}>
                  {family.description}
                </div>
                <div style={{ display: "grid", gap: "0.625rem" }}>
                  {family.presets.map((preset) => {
                    const active = brandingForm.theme_preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyTheme(preset.id)}
                        style={{
                          textAlign: "right",
                          borderRadius: "12px",
                          border: active ? `2px solid ${preset.primaryColor}` : "1px solid var(--border)",
                          background: active ? "var(--surface-strong)" : "var(--surface-strong)",
                          padding: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          position: "relative"
                        }}
                        className="hover:shadow-md"
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {preset.label}
                              {active && <Check size={14} style={{ color: preset.primaryColor }} />}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{preset.description}</div>
                          </div>
                          <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
                            {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map((swatch) => (
                              <span key={swatch} style={{ width: 16, height: 16, borderRadius: "999px", background: swatch, border: "1.5px solid var(--surface-strong)", boxShadow: "0 0 0 1px var(--border)" }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ 
                          marginTop: "0.75rem", 
                          paddingTop: "0.5rem", 
                          borderTop: "1px solid var(--border)",
                          fontSize: "0.625rem", 
                          color: "var(--text-tertiary)", 
                          display: "flex", 
                          flexWrap: "wrap", 
                          gap: "0.75rem" 
                        }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Image size={10} /> اللوغو: {preset.logoIdea}</span>
                          <span>المقترح: {preset.schoolNameIdea}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
            اللون الأساسي
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="color"
              style={{ 
                width: "100%", 
                height: "48px", 
                padding: "4px", 
                borderRadius: "12px", 
                border: "1px solid var(--border)",
                background: "var(--surface-strong)",
                cursor: "pointer"
              }}
              value={brandingForm.primary_color || "#4f8cff"}
              onChange={(e) => setBrandingForm((prev) => ({ ...prev, primary_color: e.target.value, theme_preset: "" }))}
            />
          </div>
        </div>
        
        <div>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem", display: "block" }}>
            اللون الثانوي
          </label>
          <input
            type="color"
            style={{ 
              width: "100%", 
              height: "48px", 
              padding: "4px", 
              borderRadius: "12px", 
              border: "1px solid var(--border)",
              background: "var(--surface-strong)",
              cursor: "pointer"
            }}
            value={brandingForm.secondary_color || "#79d7ff"}
            onChange={(e) => setBrandingForm((prev) => ({ ...prev, secondary_color: e.target.value, theme_preset: "" }))}
          />
        </div>
      </div>

      <div
        style={{
          borderRadius: "16px",
          padding: "1.25rem",
          background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}15, ${brandingForm.secondary_color || "#79d7ff"}20)`,
          border: "1px solid var(--border)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: "40%", height: "120%", background: `linear-gradient(to left, ${brandingForm.primary_color || "#4f8cff"}10, transparent)`, transform: "skewX(-15deg)" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative", zIndex: 1 }}>
          {brandingForm.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandingForm.logo_url}
              alt={brandingForm.name || "School logo"}
              style={{ 
                width: "64px", 
                height: "64px", 
                borderRadius: "16px", 
                objectFit: "cover", 
                border: "2px solid var(--surface-strong)", 
                background: "var(--surface-strong)",
                boxShadow: "var(--shadow-sm)"
              }}
            />
          ) : (
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${brandingForm.primary_color || "#4f8cff"}, ${brandingForm.secondary_color || "#79d7ff"})`,
                color: "#ffffff",
                fontWeight: 900,
                fontSize: "1.5rem",
                boxShadow: "var(--shadow-md)",
                border: "2px solid var(--surface-strong)"
              }}
            >
              {(brandingForm.name || "S").trim().charAt(0) || "S"}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 900, color: "var(--text-primary)", fontSize: "1.125rem" }}>{brandingForm.name || "اسم المدرسة"}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              هذه الألوان ستنعكس على كامل واجهة المدرسة والتقارير.
            </div>
            {selectedBrandTheme && (
              <div style={{ 
                fontSize: "0.6875rem", 
                fontWeight: 700,
                color: "var(--primary)", 
                marginTop: "0.5rem",
                display: "inline-flex",
                padding: "0.125rem 0.5rem",
                background: "var(--primary-soft)",
                borderRadius: "999px"
              }}>
                الثيم: {selectedBrandTheme.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {brandingNotice && (
        <div style={{ 
          fontSize: "0.75rem", 
          color: brandingNotice.includes("تعذر") ? "var(--danger)" : "var(--success)", 
          fontWeight: 700,
          padding: "0.75rem",
          background: brandingNotice.includes("تعذر") ? "var(--danger-soft)" : "var(--success-soft)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          {brandingNotice.includes("تعذر") ? <Info size={14} /> : <Check size={14} />}
          {brandingNotice}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
        <button 
          className="ui-button ui-button--primary" 
          onClick={() => void onSave()} 
          disabled={brandingSaving}
          style={{ minWidth: "120px", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}
        >
          {brandingSaving ? <div className="spin" style={{ margin: 0, width: "16px", height: "16px", borderWidth: "2px" }} /> : <Save size={18} />}
          {brandingSaving ? "جارٍ الحفظ..." : "حفظ الهوية"}
        </button>
      </div>
    </div>
  );
}
