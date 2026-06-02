"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Wifi,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { AppRecord } from "@/lib/app-themes/types";
import { SectionCard, EmptyState, cx } from "./UI";
import { AppDetailPanel } from "./AppDetailPanel";
import { AppCreateForm } from "./AppCreateForm";

type SchoolOption = { id: string; nameAr: string };

const PLATFORM_LABELS: Record<string, string> = {
  web: "ويب",
  mobile: "موبايل",
  both: "ويب وموبايل",
};

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  web: Wifi,
  mobile: Monitor,
  both: Layers,
};

function PlatformBadge({ platform }: { platform: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Layers;
  const label = PLATFORM_LABELS[platform] ?? platform;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-black text-[var(--text-secondary)]">
      <Icon size={11} />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="ui-surface rounded-[24px] p-4">
      <p className="text-xs font-black text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black" style={{ color: tint }}>
        {value}
      </p>
    </div>
  );
}

export function AppsTab() {
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appsData, schoolsData] = await Promise.all([
        fetchJsonWithAuthorizedSession<AppRecord[]>("/api/web/super-admin/apps"),
        fetchJsonWithAuthorizedSession<SchoolOption[]>("/api/web/super-admin/schools?fields=id,nameAr"),
      ]);
      setApps(Array.isArray(appsData) ? appsData : []);
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (err) {
      console.error("AppsTab fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!query.trim()) return apps;
    const q = query.trim().toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        (app.school?.nameAr ?? "").toLowerCase().includes(q) ||
        (app.school?.nameEn ?? "").toLowerCase().includes(q),
    );
  }, [apps, query]);

  const stats = useMemo(() => {
    const total = apps.length;
    const active = apps.filter((a) => a.isActive).length;
    const inactive = total - active;
    const withCustomTheme = apps.filter((a) => a.theme?.type === "custom").length;
    return { total, active, inactive, withCustomTheme };
  }, [apps]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي التطبيقات" value={stats.total} tint="var(--primary)" />
        <StatCard label="نشط" value={stats.active} tint="var(--success)" />
        <StatCard label="موقف" value={stats.inactive} tint="var(--danger)" />
        <StatCard label="ثيم مخصص" value={stats.withCustomTheme} tint="var(--warning)" />
      </div>

      <SectionCard
        title="إدارة التطبيقات"
        description="إدارة تطبيقات المدارس المشتركة في المنصة: تخصيص الثيم، الوحدات، وحدود الاستخدام."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus size={16} />
            إضافة تطبيق
          </button>
        }
      >
        {/* Search bar */}
        <div className="relative mb-5">
          <Search
            size={15}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="بحث باسم التطبيق أو المدرسة..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] py-2 ps-9 pe-3 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3 py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="sk h-24 w-full rounded-[22px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={query ? "لا توجد نتائج" : "لا توجد تطبيقات"}
            description={
              query
                ? "لم يتطابق أي تطبيق مع بحثك. جرب كلمات مختلفة."
                : "لم يتم إضافة أي تطبيق بعد. ابدأ بإضافة أول تطبيق."
            }
            actionLabel={!query ? "إضافة تطبيق" : undefined}
            onAction={!query ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((app) => {
              const isExpanded = expandedId === app.id;
              const primaryColor = app.theme?.primaryColor ?? "var(--primary)";
              const secondaryColor = app.theme?.secondaryColor ?? primaryColor;
              const enabledCount =
                app.features?.filter((f) => f.isEnabled).length ?? 0;

              return (
                <div key={app.id} className="flex flex-col">
                  {/* Card */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(app.id)}
                    className={cx(
                      "w-full rounded-[28px] border p-5 text-start transition hover:-translate-y-0.5",
                      isExpanded
                        ? "border-[var(--primary)]/40 bg-[var(--primary)]/5"
                        : "border-[var(--border)] ui-surface",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Color swatch */}
                      <div
                        className="h-12 w-12 flex-shrink-0 rounded-[16px] shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-[var(--text-primary)] truncate">
                            {app.name}
                          </span>
                          {app.isActive ? (
                            <span className="ui-pill ui-pill--success text-[10px]">نشط</span>
                          ) : (
                            <span className="ui-pill ui-pill--danger text-[10px]">موقف</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-[var(--text-secondary)] truncate">
                          {app.school?.nameAr ?? "بدون مدرسة"}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <PlatformBadge platform={app.platform} />
                          {app.features && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-black text-[var(--text-secondary)]">
                              <Layers size={10} />
                              {enabledCount} وحدة
                            </span>
                          )}
                          {app.isActive ? (
                            <CheckCircle2 size={14} className="text-[var(--success)]" />
                          ) : (
                            <XCircle size={14} className="text-[var(--danger)]" />
                          )}
                        </div>
                      </div>

                      {/* Color dots preview */}
                      <div className="flex flex-col gap-1.5">
                        {[
                          app.theme?.primaryColor,
                          app.theme?.sidebarColor,
                          app.theme?.accentColor,
                        ]
                          .filter(Boolean)
                          .map((color, idx) => (
                            <span
                              key={idx}
                              className="h-3.5 w-3.5 rounded-full border border-white/50 shadow-sm"
                              style={{ background: color! }}
                            />
                          ))}
                      </div>
                    </div>
                  </button>

                  {/* Inline expandable detail */}
                  {isExpanded && (
                    <AppDetailPanel
                      app={app}
                      onUpdate={() => void fetchData()}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Create form modal */}
      <AppCreateForm
        isOpen={showCreate}
        schools={schools}
        onClose={() => setShowCreate(false)}
        onCreated={async () => {
          setShowCreate(false);
          await fetchData();
        }}
      />
    </div>
  );
}
