"use client";

import { useMemo, useState } from "react";
import { Search, Eye } from "@/lib/icons";
import {
  BRAND_THEME_FAMILIES,
  type BrandThemeFamilyId,
  type BrandThemePreset,
} from "@/lib/brand/themes";
import { SectionCard } from "../_components/ui";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import type { SchoolRecord } from "../_components/types";
import { cn } from "@/lib/brand/brand-utils";

const DEFAULT_BRANDING = { primary_color: "#4f8cff", secondary_color: "#79d7ff" };

function ColorSwatch({ color, label }: { color: string | null; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="h-8 w-8 rounded-lg border border-[var(--border)] shadow-sm" style={{ backgroundColor: color || "#e5e7eb" }} />
      <span className="text-[9px] font-bold text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

export default function ThemesPage() {
  const { schools } = useSuperAdminData();
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<BrandThemeFamilyId | "all">("all");
  const [previewSchool, setPreviewSchool] = useState<SchoolRecord | null>(null);

  const families = useMemo(() => BRAND_THEME_FAMILIES, []);
  const filteredSchools = useMemo(() => {
    const active = schools.filter((s) => !s.deleted_at);
    if (!search) return active;
    const q = search.toLowerCase();
    return active.filter((s) => s.name.toLowerCase().includes(q));
  }, [schools, search]);

  const filteredPresets = useMemo(() => {
    const all: BrandThemePreset[] = families.flatMap((f) => f.presets);
    if (selectedFamily === "all") return all;
    return all.filter((p) => p.familyId === selectedFamily);
  }, [families, selectedFamily]);

  return (
    <div className="space-y-6">
      <SectionCard title="ثيمات المدارس" description="معاينة ألوان كل مدرسة الحالية">
        <div className="mb-4">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] ps-10 pe-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--primary)]/20" placeholder="بحث عن مدرسة..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {filteredSchools.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا توجد مدارس</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSchools.map((school) => (
              <div key={school.id} className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 transition hover:shadow-lg hover:border-[var(--primary)]/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-[var(--text-primary)] truncate">{school.name}</h3>
                  <button className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]" onClick={() => setPreviewSchool(school)}><Eye size={14} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <ColorSwatch color={school.primary_color} label="رئيسي" />
                  <ColorSwatch color={school.secondary_color} label="ثانوي" />
                </div>
                {!school.primary_color && <div className="mt-3 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400">لم يتم تخصيص الألوان</div>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="معرض الثيمات" description={`${filteredPresets.length} ثيم متاح — ${families.length} عائلة لون`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={cn("rounded-xl px-3 py-1.5 text-xs font-black transition", selectedFamily === "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")} onClick={() => setSelectedFamily("all")}>الكل</button>
          {families.map((family) => {
            const first = family.presets[0];
            return (
              <button key={family.id} className={cn("rounded-xl px-3 py-1.5 text-xs font-black transition flex items-center gap-1.5", selectedFamily === family.id ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--border)]")} onClick={() => setSelectedFamily(family.id)}>
                {first && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: first.primaryColor }} />}
                {family.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredPresets.map((preset) => (
            <div key={preset.id} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-strong)] p-3 transition-all hover:scale-[1.03] hover:border-[var(--primary)]/30">
              <div className="flex gap-1">
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: preset.primaryColor }} />
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: preset.secondaryColor }} />
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: preset.sidebarColor }} />
              </div>
              <span className="text-[10px] font-black text-[var(--text-secondary)] text-center leading-tight">{preset.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {previewSchool && (
        <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setPreviewSchool(null)}>
          <div className="ui-dialog w-full max-w-lg overflow-hidden" role="dialog" aria-modal="true">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <h2 className="text-xl font-black text-[var(--text-primary)]">معاينة ثيم: {previewSchool.name}</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: previewSchool.primary_color || DEFAULT_BRANDING.primary_color }}>
                  <div className="h-7 w-7 rounded-lg bg-white/20" />
                  <span className="text-sm font-black text-white">{previewSchool.name}</span>
                </div>
                <div className="flex">
                  <div className="w-16 min-h-[120px] p-2 space-y-2 bg-[var(--surface-muted)]">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-2 rounded-full bg-[var(--text-muted)]/20" />)}
                  </div>
                  <div className="flex-1 p-4 bg-[var(--surface-muted)]">
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-[var(--surface-strong)] border border-[var(--border)]" />)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-black text-[var(--text-muted)]">اللون الرئيسي</span>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: previewSchool.primary_color || DEFAULT_BRANDING.primary_color }} />
                    <code className="text-xs font-mono">{previewSchool.primary_color || "افتراضي"}</code>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black text-[var(--text-muted)]">اللون الثانوي</span>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: previewSchool.secondary_color || DEFAULT_BRANDING.secondary_color }} />
                    <code className="text-xs font-mono">{previewSchool.secondary_color || "افتراضي"}</code>
                  </div>
                </div>
              </div>
              <button className="ui-button ui-button--secondary w-full" onClick={() => setPreviewSchool(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
