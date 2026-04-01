"use client";

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
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: ".74rem", fontWeight: 800, color: "var(--p2)", marginBottom: ".45rem" }}>
            عوائل الألوان والثيمات الجاهزة
          </div>
          <div style={{ display: "grid", gap: ".55rem" }}>
            {BRAND_THEME_FAMILIES.map((family) => (
              <div key={family.id} style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, padding: ".7rem" }}>
                <div style={{ fontWeight: 800, color: "var(--dark)", fontSize: ".78rem" }}>{family.label}</div>
                <div style={{ fontSize: ".7rem", color: "var(--gray)", marginTop: ".15rem", marginBottom: ".55rem" }}>
                  {family.description}
                </div>
                <div style={{ display: "grid", gap: ".5rem" }}>
                  {family.presets.map((preset) => {
                    const active = brandingForm.theme_preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyTheme(preset.id)}
                        style={{
                          textAlign: "right",
                          borderRadius: 12,
                          border: active ? `1.5px solid ${preset.primaryColor}` : "1px solid rgba(15,23,42,0.08)",
                          background: active ? `${preset.primaryColor}12` : "#fff",
                          padding: ".7rem .8rem",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--dark)", fontSize: ".77rem" }}>{preset.label}</div>
                            <div style={{ fontSize: ".69rem", color: "var(--gray)", marginTop: ".15rem" }}>{preset.description}</div>
                          </div>
                          <div style={{ display: "flex", gap: ".3rem", flexShrink: 0 }}>
                            {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map((swatch) => (
                              <span key={swatch} style={{ width: 18, height: 18, borderRadius: 999, background: swatch, border: "1px solid rgba(15,23,42,0.08)" }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ marginTop: ".45rem", fontSize: ".68rem", color: "var(--gray)", display: "flex", flexWrap: "wrap", gap: ".55rem" }}>
                          <span>اقتراح اللوغو: {preset.logoIdea}</span>
                          <span>اقتراح الاسم: {preset.schoolNameIdea}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gray)" }}>
          اللون الأساسي
          <input
            type="color"
            className="form-input"
            style={{ height: "44px", padding: ".2rem", marginTop: ".25rem" }}
            value={brandingForm.primary_color || "#4f8cff"}
            onChange={(e) => setBrandingForm((prev) => ({ ...prev, primary_color: e.target.value, theme_preset: "" }))}
          />
        </label>
        <label style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gray)" }}>
          اللون الثانوي
          <input
            type="color"
            className="form-input"
            style={{ height: "44px", padding: ".2rem", marginTop: ".25rem" }}
            value={brandingForm.secondary_color || "#79d7ff"}
            onChange={(e) => setBrandingForm((prev) => ({ ...prev, secondary_color: e.target.value, theme_preset: "" }))}
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
            // eslint-disable-next-line @next/next/no-img-element
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
            {selectedBrandTheme ? (
              <div style={{ fontSize: ".69rem", color: "var(--gray)", marginTop: ".25rem" }}>
                الثيم المختار: {selectedBrandTheme.label} • {selectedBrandTheme.familyLabel}
              </div>
            ) : null}
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
          onClick={() => void onDeriveFromLogo()}
          disabled={brandingDeriving}
        >
          {brandingDeriving ? "جارٍ تحليل الشعار..." : "استخراج الألوان من الشعار"}
        </button>
        <button className="fee-btn" onClick={() => void onSave()} disabled={brandingSaving}>
          {brandingSaving ? "جارٍ الحفظ..." : "حفظ الهوية"}
        </button>
      </div>
    </div>
  );
}
