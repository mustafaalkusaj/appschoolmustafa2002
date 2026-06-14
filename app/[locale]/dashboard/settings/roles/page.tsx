"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";
import type { PermModule } from "@/types/deep-permissions";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PAGE_PATHS, type PageCode } from "@/lib/authorization/page-access";
import { requestRuntimeBrandingRefresh, useRuntimeBranding } from "@/hooks/brand";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_COLORS = [
  "#4f8cff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#64748b",
] as const;

const DASHBOARD_SECTIONS: { key: string; label: string; icon: string; description: string }[] = [
  { key: "stats", label: "الإحصائيات العامة", icon: "📊", description: "عدد الطلاب والأساتذة والحضور" },
  { key: "financial", label: "البيانات المالية", icon: "💰", description: "الإيرادات والمصروفات والأرصدة" },
  { key: "payments_list", label: "المدفوعات الأخيرة", icon: "🧾", description: "قائمة آخر المدفوعات" },
  { key: "overdue_students", label: "الطلاب المتأخرون", icon: "⚠️", description: "الطلاب المتأخرون عن سداد الأقساط" },
  { key: "activity", label: "الأنشطة الأخيرة", icon: "🕐", description: "سجل العمليات الأخيرة" },
  { key: "fees_table", label: "جدول الأقساط", icon: "📋", description: "جدول أقساط الفصول" },
  { key: "notifications", label: "الإشعارات", icon: "🔔", description: "إشعارات النظام والتنبيهات" },
];

const DEFAULT_DASHBOARD_SECTIONS: Record<string, boolean> = Object.fromEntries(
  DASHBOARD_SECTIONS.map((s) => [s.key, true])
);

const PAGE_LABELS: Partial<Record<PageCode, string>> = {
  dashboard: "لوحة التحكم",
  students: "الطلاب",
  teachers: "الأساتذة",
  attendance: "الحضور",
  "teacher-attendance": "حضور الأساتذة",
  "teacher-activities": "متابعة نشاط الأساتذة",
  grades: "الدرجات والأعمال",
  calendar: "التقويم الذكي",
  classes: "الصفوف والشعب",
  schedule: "جدول الحصص",
  payments: "الحسابات",
  expenses: "المصروفات",
  incomes: "الإيرادات",
  salaries: "الرواتب",
  notifications: "الإشعارات",
  reports: "التقارير",
  "branch-overview": "لوحة الفرع",
  group: "لوحة المجموعة",
  settings: "الإعدادات",
};

const ASSIGNABLE_PAGES = Object.keys(PAGE_LABELS) as PageCode[];

// ─── Types ────────────────────────────────────────────────────────────────────

type SchoolRole = {
  id: string;
  key: string;
  name_ar: string;
  is_system: boolean;
  created_at: string;
  color?: string | null;
  dashboard_sections?: Record<string, boolean> | null;
};

type RoleUser = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  is_active?: boolean;
  is_single_page_user?: boolean | null;
  avatar_url?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function hexToRgb(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "79,140,255";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function arabicToKey(name: string): string {
  const map: Record<string, string> = {
    'م':'m','ح':'h','ا':'a','أ':'a','إ':'a','آ':'a','س':'s','ب':'b','ت':'t',
    'ر':'r','ن':'n','ل':'l','د':'d','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k',
    'و':'w','ي':'y','ز':'z','ج':'j','خ':'kh','ذ':'dh','ص':'s','ض':'d','ط':'t',
    'ظ':'z','ء':'a','ة':'h','ى':'a','ه':'h','ث':'th','ش':'sh',' ':'_',
  };
  const result = name.split('').map(c => map[c] ?? '').join('')
    .replace(/_{2,}/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  return result || `role_${Date.now().toString(36)}`;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin opacity-60"
    />
  );
}

// ─── Permission Row ───────────────────────────────────────────────────────────

function PermRow({
  label,
  perms,
  selected,
  disabled,
  readPermId,
  accentRgb,
  onToggle,
}: {
  label: string;
  perms: { id: string; name_ar: string; key: string }[];
  selected: Set<string>;
  disabled: boolean;
  readPermId?: string;
  accentRgb: string;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-bold text-[var(--text-muted)] w-14 shrink-0 mt-1.5 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {perms.map((p) => {
          const isRead = p.id === readPermId;
          const isDisabled = disabled && !isRead;
          const checked = selected.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(p.id)}
              className={cn(
                "h-6 px-2.5 rounded-md text-[11px] font-medium border transition-all duration-150",
                checked
                  ? "border-transparent text-white shadow-sm"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-opacity-50",
                isDisabled && "opacity-25 cursor-not-allowed",
              )}
              style={checked ? {
                backgroundColor: `rgb(${accentRgb})`,
                boxShadow: `0 1px 3px rgba(${accentRgb},0.35)`,
              } : undefined}
            >
              {p.name_ar}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Permission Matrix ────────────────────────────────────────────────────────

function PermMatrix({
  tree,
  selected,
  onChange,
  accentColor,
}: {
  tree: PermModule[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  accentColor?: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const accentRgb = hexToRgb((accentColor ?? "#4f8cff").startsWith("#") ? (accentColor ?? "#4f8cff") : "#4f8cff");

  const toggleModule = (modulePages: PermModule["pages"], check: boolean) => {
    const next = new Set(selected);
    for (const page of modulePages) {
      if (check) page.permissions.forEach((p) => next.add(p.id));
      else page.permissions.forEach((p) => next.delete(p.id));
    }
    onChange(next);
  };

  const togglePage = (pagePerms: { id: string }[], check: boolean) => {
    const next = new Set(selected);
    if (check) pagePerms.forEach((p) => next.add(p.id));
    else pagePerms.forEach((p) => next.delete(p.id));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {tree.map((mod) => {
        const isCollapsed = collapsed.has(mod.key);
        const allModPerms = mod.pages.flatMap((p) => p.permissions);
        const checkedCount = allModPerms.filter((p) => selected.has(p.id)).length;
        const allChecked = checkedCount === allModPerms.length;

        const pct = allModPerms.length > 0 ? Math.round((checkedCount / allModPerms.length) * 100) : 0;
        return (
          <div key={mod.key} className="rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-soft)]"
              style={{ borderInlineStart: `3px solid rgba(${accentRgb},${pct > 0 ? 0.55 : 0.15})` }}>
              <button
                type="button"
                className="flex-1 flex items-center gap-2.5 text-right"
                onClick={() =>
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    next.has(mod.key) ? next.delete(mod.key) : next.add(mod.key);
                    return next;
                  })
                }
              >
                <span className="text-sm font-bold text-[var(--text-primary)]">{mod.name_ar}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: `rgb(${accentRgb})` }} />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{checkedCount}/{allModPerms.length}</span>
                </div>
                <span className="ms-auto text-[var(--text-muted)] text-[10px]">{isCollapsed ? "▶" : "▼"}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleModule(mod.pages, !allChecked)}
                className="h-6 px-2.5 rounded-lg text-[11px] font-semibold border transition whitespace-nowrap"
                style={allChecked
                  ? { backgroundColor: `rgb(${accentRgb})`, color: "white", border: "transparent" }
                  : { backgroundColor: "var(--surface-muted)", color: "var(--text-secondary)", borderColor: "var(--border)" }}
              >
                {allChecked ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            </div>

            {!isCollapsed && (
              <div className="divide-y divide-[var(--border)]">
                {mod.pages.map((page) => {
                  const pageAllChecked = page.permissions.every((p) => selected.has(p.id));
                  const readPerm = page.permissions.find((p) => p.key.endsWith(".read"));
                  const readGranted = readPerm ? selected.has(readPerm.id) : true;

                  const byType = {
                    action: page.permissions.filter((p) => p.type === "action"),
                    field: page.permissions.filter((p) => p.type === "field"),
                    special: page.permissions.filter((p) => p.type === "special"),
                    data_scope: page.permissions.filter((p) => p.type === "data_scope"),
                  };

                  return (
                    <div key={page.key} className="px-4 py-3 space-y-2.5 bg-[var(--surface-strong)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{page.name_ar}</span>
                        <button type="button" onClick={() => togglePage(page.permissions, !pageAllChecked)}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition">
                          {pageAllChecked ? "إلغاء الكل" : "تحديد الكل"}
                        </button>
                      </div>
                      {byType.action.length > 0 && (
                        <PermRow label="عمليات" perms={byType.action} selected={selected} disabled={!readGranted}
                          readPermId={readPerm?.id} accentRgb={accentRgb}
                          onToggle={(id) => {
                            const next = new Set(selected);
                            if (next.has(id)) { if (id === readPerm?.id) page.permissions.forEach((p) => next.delete(p.id)); else next.delete(id); }
                            else next.add(id);
                            onChange(next);
                          }} />
                      )}
                      {byType.field.length > 0 && readGranted && (
                        <PermRow label="حقول" perms={byType.field} selected={selected} disabled={false} accentRgb={accentRgb}
                          onToggle={(id) => { const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); onChange(next); }} />
                      )}
                      {byType.special.length > 0 && readGranted && (
                        <PermRow label="خاص" perms={byType.special} selected={selected} disabled={false} accentRgb={accentRgb}
                          onToggle={(id) => { const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); onChange(next); }} />
                      )}
                      {byType.data_scope.length > 0 && readGranted && (
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] w-14 shrink-0 mt-1.5 uppercase tracking-wider">نطاق</span>
                          <div className="flex flex-wrap gap-1.5">
                            {byType.data_scope.map((p) => {
                              const on = selected.has(p.id);
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => { const next = new Set(selected); byType.data_scope.forEach((s) => next.delete(s.id)); next.add(p.id); onChange(next); }}
                                  className="h-6 px-2.5 rounded-md text-[11px] font-medium border transition-all"
                                  style={on ? { backgroundColor: `rgb(${accentRgb})`, color: "white", border: "transparent", boxShadow: `0 1px 3px rgba(${accentRgb},0.35)` }
                                    : { backgroundColor: "var(--surface-muted)", color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                                  {p.name_ar}
                                </button>
                              );
                            })}
                            {(() => {
                              const noneOn = byType.data_scope.every((p) => !selected.has(p.id));
                              return (
                                <button type="button"
                                  onClick={() => { const next = new Set(selected); byType.data_scope.forEach((s) => next.delete(s.id)); onChange(next); }}
                                  className="h-6 px-2.5 rounded-md text-[11px] font-medium border transition-all"
                                  style={noneOn ? { backgroundColor: `rgb(${accentRgb})`, color: "white", border: "transparent" }
                                    : { backgroundColor: "var(--surface-muted)", color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                                  لا يوجد
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Role Modal ────────────────────────────────────────────────────────

function CreateRoleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (role: SchoolRole) => void }) {
  const [nameAr, setNameAr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoKey = arabicToKey(nameAr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; role: SchoolRole }>("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: autoKey, name_ar: nameAr }),
      });
      onCreate(res.role);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء الدور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">دور جديد</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)]">اسم الدور</label>
          <input
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            placeholder="مثال: معلم الصف، محاسب الفرع..."
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            required minLength={2} autoFocus
          />
          {nameAr.length >= 2 && (
            <p className="text-[11px] text-[var(--text-muted)] font-mono" dir="ltr">{autoKey}</p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving || nameAr.length < 2}
            className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60 transition">
            {saving ? "جاري الحفظ..." : "إنشاء"}
          </button>
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────────────────────────────

function CreateUserModal({
  initialRoleId,
  roles,
  tree,
  accentColor,
  onClose,
  onCreated,
}: {
  initialRoleId: string;
  roles: SchoolRole[];
  tree: PermModule[];
  accentColor: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [allowedPages, setAllowedPages] = useState<PageCode[]>([]);
  const isSinglePage = allowedPages.length === 1;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Role + permissions
  const [chosenRoleId, setChosenRoleId] = useState(initialRoleId);
  const [basePermIds, setBasePermIds] = useState<Set<string>>(new Set());
  const [userPermIds, setUserPermIds] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [showPerms, setShowPerms] = useState(false);

  useEffect(() => {
    if (!chosenRoleId) return;
    let cancelled = false;
    setLoadingPerms(true);
    apiFetch<{ ok: boolean; permissionIds: string[] }>(`/api/v1/roles/${chosenRoleId}`)
      .then((res) => {
        if (cancelled) return;
        const ids = new Set(res.permissionIds);
        setBasePermIds(ids);
        setUserPermIds(new Set(ids));
      })
      .catch(() => { if (!cancelled) { setBasePermIds(new Set()); setUserPermIds(new Set()); } })
      .finally(() => { if (!cancelled) setLoadingPerms(false); });
    return () => { cancelled = true; };
  }, [chosenRoleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // 1. Create employee user
      const res = await apiFetch<{ ok: boolean; user: { auth_user_id: string; school_id: string } }>(
        "/api/v1/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
            job_title: jobTitle.trim() || undefined,
            school_role_id: chosenRoleId,
            allowed_pages: allowedPages,
            is_single_page_user: allowedPages.length === 1,
          }),
        },
      );

      const newUserId = res.user.auth_user_id;
      const schoolId = res.user.school_id;

      // 2. Upload avatar if selected
      if (avatarFile) {
        try {
          const fd = new FormData();
          fd.append("file", avatarFile);
          fd.append("schoolId", schoolId);
          const uploadRes = await fetch("/api/web/students/photo-upload", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          if (uploadRes.ok) {
            const { url } = (await uploadRes.json()) as { url: string };
            await apiFetch(`/api/v1/users/${newUserId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatar_url: url }),
            });
          }
        } catch {
          // non-fatal
        }
      }

      // 3. Save permission overrides
      const overrides: { permission_id: string; is_granted: boolean; reason: string }[] = [];
      for (const id of Array.from(userPermIds)) {
        if (!basePermIds.has(id)) overrides.push({ permission_id: id, is_granted: true, reason: "منح يدوي عند الإنشاء" });
      }
      for (const id of Array.from(basePermIds)) {
        if (!userPermIds.has(id)) overrides.push({ permission_id: id, is_granted: false, reason: "سحب يدوي عند الإنشاء" });
      }
      if (overrides.length > 0) {
        await apiFetch(`/api/v1/users/${newUserId}/perm-overrides`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrides, reverted: [] }),
        });
      }

      setAllowedPages([]);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء المستخدم");
    } finally {
      setSaving(false);
    }
  };

  const chosenRole = roles.find((r) => r.id === chosenRoleId);
  const permDiff = Array.from(userPermIds).filter((id) => !basePermIds.has(id)).length
    + Array.from(basePermIds).filter((id) => !userPermIds.has(id)).length;
  const initials = fullName.trim() ? getInitials(fullName) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <form onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">مستخدم جديد</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">أدخل بيانات المستخدم وحدد دوره وصلاحياته</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2.5 border border-red-200 dark:border-red-900">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Avatar + Role row */}
          <div className="flex items-center gap-5">
            {/* Avatar picker */}
            <button type="button" onClick={() => avatarInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full shrink-0 overflow-hidden border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] transition group bg-[var(--surface-muted)] flex items-center justify-center"
              title="اضغط لرفع صورة">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="صورة" className="w-full h-full object-cover" />
              ) : initials ? (
                <span className="text-xl font-bold text-[var(--primary)]">{initials}</span>
              ) : (
                <span className="text-2xl">📷</span>
              )}
              <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="text-white text-xs font-semibold">تغيير</span>
              </span>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />

            {/* Role selector */}
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">الدور <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] focus-within:ring-2 focus-within:ring-[var(--primary)]">
                {chosenRole?.color && (
                  <span className="w-3 h-3 rounded-full shrink-0 border border-white/20" style={{ background: chosenRole.color }} />
                )}
                <select value={chosenRoleId} onChange={(e) => setChosenRoleId(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none appearance-none">
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">الاسم الكامل <span className="text-red-500">*</span></label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="مثال: أحمد محمد" value={fullName} onChange={(e) => setFullName(e.target.value)}
                required autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">البريد الإلكتروني <span className="text-red-500">*</span></label>
              <input type="email" dir="ltr"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">كلمة المرور <span className="text-red-500">*</span></label>
              <input type="password"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">رقم الهاتف</label>
              <input type="tel" dir="ltr"
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)]">المسمى الوظيفي</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="مثال: محاسب، مشرف..." value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>

          {/* Allowed Pages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[var(--text-primary)]">
                الصفحات المسموحة
                {allowedPages.length > 0 && (
                  <span className="mr-2 text-xs px-1.5 py-0.5 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] font-bold">
                    {allowedPages.length}
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-[var(--primary)] hover:underline"
                  onClick={() => setAllowedPages([...ASSIGNABLE_PAGES])}>
                  تحديد الكل
                </button>
                <button type="button" className="text-xs text-[var(--text-muted)] hover:underline"
                  onClick={() => setAllowedPages([])}>
                  إلغاء الكل
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">اتركها فارغة للوصول الافتراضي. صفحة واحدة = بدون قائمة جانبية.</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSIGNABLE_PAGES.map((code) => {
                const checked = allowedPages.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAllowedPages((prev) =>
                      checked ? prev.filter((p) => p !== code) : [...prev, code]
                    )}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium text-right transition",
                      checked
                        ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", checked ? "bg-[var(--primary)]" : "bg-[var(--border)]")} />
                    {PAGE_LABELS[code]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions — collapsible */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <button type="button" onClick={() => setShowPerms((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)] transition">
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                الصلاحيات
                {loadingPerms
                  ? <span className="text-xs font-normal text-[var(--text-muted)]">جاري التحميل...</span>
                  : (
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      {userPermIds.size} محددة
                      {permDiff > 0 && <span className="ms-1 text-amber-500 font-semibold">· {permDiff} معدّلة</span>}
                    </span>
                  )
                }
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">{showPerms ? "▲ إخفاء" : "▼ عرض وتعديل"}</span>
            </button>
            {showPerms && !loadingPerms && (
              <div className="p-4 bg-[var(--surface-muted)] space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  صلاحيات الدور الافتراضية — عدّلها لهذا المستخدم وستُحفظ كاستثناءات شخصية.
                </p>
                <PermMatrix tree={tree} selected={userPermIds} onChange={setUserPermIds} accentColor={accentColor} />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 shrink-0">
          <button type="submit" disabled={saving || !fullName.trim() || !email.trim() || !password}
            className="flex-1 h-10 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60 transition">
            {saving ? "جاري الإنشاء..." : "إنشاء المستخدم"}
          </button>
          <button type="button" onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────

function UserCard({ user, accentColor, onEdit, onDelete, onResetPassword, onViewActivity }: {
  user: RoleUser; accentColor: string;
  onEdit: () => void; onDelete: () => void; onResetPassword: () => void; onViewActivity: () => void;
}) {
  const initials = getInitials(user.full_name);
  const active = user.is_active !== false;
  const rgb = hexToRgb(accentColor);

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] hover:shadow-sm transition group"
      style={{ borderColor: `rgba(${rgb},0.2)` }}
    >
      <div className="w-11 h-11 rounded-full shrink-0 overflow-hidden flex items-center justify-center ring-2 transition"
        style={{ background: `rgba(${rgb},0.12)`, outline: `2px solid rgba(${rgb},0.3)` }}
      >
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold" style={{ color: accentColor }}>{initials || "؟"}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.full_name}</p>
        <p className="text-[11px] text-[var(--text-muted)] truncate" dir="ltr">{user.email}</p>
        {user.job_title && (
          <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">{user.job_title}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
          active ? "bg-emerald-500/12 text-emerald-600" : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        )}>
          {active ? "نشط" : "غير نشط"}
        </span>
        {user.is_single_page_user && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-600">
            صفحة واحدة
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition mt-1">
          <button type="button" onClick={onEdit} title="تعديل"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition text-xs">✏️</button>
          <button type="button" onClick={onResetPassword} title="إعادة تعيين كلمة المرور"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-500/10 transition text-xs">🔑</button>
          <button type="button" onClick={onViewActivity} title="سجل العمليات"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-xs">📋</button>
          <button type="button" onClick={onDelete} title="حذف"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition text-xs">🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ─────────────────────────────────────────────────────────

function EditUserModal({
  user, roles, accentColor, onClose, onSaved,
}: {
  user: RoleUser; roles: SchoolRole[]; accentColor: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user.job_title ?? "");
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          job_title: jobTitle.trim() || null,
          is_active: isActive,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث المستخدم");
    } finally {
      setSaving(false);
    }
  };

  const accentRgb = hexToRgb(accentColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <form onSubmit={handleSubmit}
        className="w-full max-w-md bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">تعديل المستخدم</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.email}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2.5 border border-red-200 dark:border-red-900">
              <span className="shrink-0 mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)]">الاسم الكامل <span className="text-red-500">*</span></label>
            <input className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)]">رقم الهاتف</label>
            <input type="tel" dir="ltr"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)]">المسمى الوظيفي</label>
            <input className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="مثال: محاسب، مشرف..." value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">حالة الحساب</p>
              <p className="text-[11px] text-[var(--text-muted)]">{isActive ? "الحساب نشط ويمكنه تسجيل الدخول" : "الحساب معطّل ولا يمكنه الدخول"}</p>
            </div>
            <button type="button" onClick={() => setIsActive((v) => !v)}
              className={cn("w-11 h-6 rounded-full transition-colors relative", isActive ? "" : "bg-[var(--border)]")}
              style={isActive ? { backgroundColor: `rgb(${accentRgb})` } : undefined}>
              <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                isActive ? "start-[22px]" : "start-0.5")} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 shrink-0">
          <button type="submit" disabled={saving || !fullName.trim()}
            className="flex-1 h-10 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition"
            style={{ background: `linear-gradient(135deg, rgb(${accentRgb}), rgba(${accentRgb},0.75))` }}>
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
          <button type="button" onClick={onClose}
            className="h-10 px-5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Reset Password Modal ────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: RoleUser; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; temporary_password: string }>(
        `/api/dashboard/users/${user.id}/reset-password`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      setTempPassword(res.temporary_password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إعادة تعيين كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="w-full max-w-sm bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">إعادة تعيين كلمة المرور</h2>
          <button type="button" onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
        </div>

        <p className="text-sm text-[var(--text-secondary)]">
          المستخدم: <span className="font-semibold text-[var(--text-primary)]">{user.full_name}</span>
        </p>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>}

        {tempPassword ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">تم إعادة التعيين بنجاح</p>
              <p className="text-xs text-[var(--text-muted)] mb-2">كلمة المرور المؤقتة:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white dark:bg-black/20 px-3 py-2 rounded-lg border border-[var(--border)] select-all" dir="ltr">
                  {tempPassword}
                </code>
                <button type="button" onClick={handleCopy}
                  className="h-9 px-3 rounded-lg border border-[var(--border)] text-xs font-semibold hover:bg-[var(--surface-muted)] transition">
                  {copied ? "✓ تم" : "نسخ"}
                </button>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="w-full h-10 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
              إغلاق
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleReset} disabled={loading}
              className="flex-1 h-10 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-60 transition hover:bg-amber-600">
              {loading ? "جاري إعادة التعيين..." : "إعادة تعيين"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Log Modal ──────────────────────────────────────────────────────

type AuditEntry = {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  summary: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  RESET_PASSWORD: "إعادة تعيين كلمة المرور",
};

function ActivityLogModal({ user, onClose }: { user: RoleUser; onClose: () => void }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ ok: boolean; logs: AuditEntry[] }>(`/api/v1/users/${user.id}/activity?limit=50`)
      .then((res) => setLogs(res.logs ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل السجل"))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="w-full max-w-lg bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">سجل العمليات</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.full_name}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-muted)] text-[var(--text-muted)]">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <p className="text-sm text-center text-[var(--text-muted)] py-8">جاري التحميل...</p>
          ) : error ? (
            <p className="text-sm text-center text-red-500 py-8">{error}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-center text-[var(--text-muted)] py-8">لا توجد عمليات مسجلة</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                    log.action_type === "DELETE" ? "bg-red-100 text-red-600 dark:bg-red-950/40" :
                    log.action_type === "RESET_PASSWORD" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40" :
                    log.action_type === "CREATE" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40" :
                    "bg-blue-100 text-blue-600 dark:bg-blue-950/40",
                  )}>
                    {log.action_type === "DELETE" ? "🗑" : log.action_type === "RESET_PASSWORD" ? "🔑" : log.action_type === "CREATE" ? "➕" : "✏️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {ACTION_LABELS[log.action_type] ?? log.action_type}
                    </p>
                    {log.summary && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{log.summary}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                      {log.actor_name && <span>{log.actor_name}</span>}
                      <span dir="ltr">{new Date(log.created_at).toLocaleString("ar-IQ")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[var(--border)] shrink-0">
          <button type="button" onClick={onClose}
            className="w-full h-9 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] transition">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const branding = useRuntimeBranding();

  const [roles, setRoles] = useState<SchoolRole[]>([]);
  const [tree, setTree] = useState<PermModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [permIds, setPermIds] = useState<Set<string>>(new Set());
  const [loadingRole, setLoadingRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [pickedColor, setPickedColor] = useState<string>("");
  const [savingColor, setSavingColor] = useState(false);

  const [dashboardSections, setDashboardSections] = useState<Record<string, boolean>>(DEFAULT_DASHBOARD_SECTIONS);
  const [savingDashboard, setSavingDashboard] = useState(false);

  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<RoleUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<RoleUser | null>(null);
  const [activityLogUser, setActivityLogUser] = useState<RoleUser | null>(null);

  // System color sync — reads from branch branding
  const originalVarsRef = useRef<Record<string, string> | null>(null);
  const systemPrimaryColor = branding.primaryColor ?? "";

  // Capture original system CSS vars on mount, restore on unmount
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const captured = {
      "--primary": style.getPropertyValue("--primary").trim(),
      "--primary-strong": style.getPropertyValue("--primary-strong").trim(),
      "--primary-soft": style.getPropertyValue("--primary-soft").trim(),
      "--primary-rgb": style.getPropertyValue("--primary-rgb").trim(),
      "--shadow-primary": style.getPropertyValue("--shadow-primary").trim(),
    };
    originalVarsRef.current = captured;
    return () => {
      if (originalVarsRef.current) {
        for (const [k, v] of Object.entries(originalVarsRef.current)) {
          document.documentElement.style.setProperty(k, v);
        }
      }
    };
  }, []);

  // Load roles + tree
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<{ ok: boolean; roles: SchoolRole[] }>("/api/v1/roles"),
      apiFetch<{ ok: boolean; tree: PermModule[] }>("/api/v1/permissions/tree"),
    ])
      .then(([rolesRes, treeRes]) => {
        if (cancelled) return;
        setRoles(rolesRes.roles);
        setTree(treeRes.tree);
        if (rolesRes.roles.length > 0) {
          const first = rolesRes.roles[0];
          setSelectedRoleId(first.id);
          setPickedColor(first.color ?? "");
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "تعذر التحميل"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load perms for selected role
  useEffect(() => {
    if (!selectedRoleId) return;
    let cancelled = false;
    setLoadingRole(true);
    apiFetch<{ ok: boolean; role: SchoolRole; permissionIds: string[] }>(`/api/v1/roles/${selectedRoleId}`)
      .then((res) => {
        if (!cancelled) {
          setPermIds(new Set(res.permissionIds));
          if (res.role?.dashboard_sections) {
            setDashboardSections({ ...DEFAULT_DASHBOARD_SECTIONS, ...res.role.dashboard_sections });
          } else {
            setDashboardSections({ ...DEFAULT_DASHBOARD_SECTIONS });
          }
        }
      })
      .catch(() => { if (!cancelled) { setPermIds(new Set()); setDashboardSections({ ...DEFAULT_DASHBOARD_SECTIONS }); } })
      .finally(() => { if (!cancelled) setLoadingRole(false); });
    return () => { cancelled = true; };
  }, [selectedRoleId]);

  // Sync picked color
  useEffect(() => {
    const role = roles.find((r) => r.id === selectedRoleId);
    setPickedColor(role?.color ?? "");
  }, [selectedRoleId, roles]);

  // Load users
  useEffect(() => {
    if (!selectedRoleId) return;
    let cancelled = false;
    setLoadingUsers(true);
    setUsersError(null);
    apiFetch<{ ok: boolean; users: RoleUser[] }>(`/api/v1/roles/${selectedRoleId}/users`)
      .then((res) => { if (!cancelled) setRoleUsers(res.users ?? []); })
      .catch((err) => { if (!cancelled) { setUsersError(err instanceof Error ? err.message : "خطأ"); setRoleUsers([]); } })
      .finally(() => { if (!cancelled) setLoadingUsers(false); });
    return () => { cancelled = true; };
  }, [selectedRoleId]);

  const reloadUsers = useCallback(() => {
    if (!selectedRoleId) return;
    setLoadingUsers(true);
    setUsersError(null);
    apiFetch<{ ok: boolean; users: RoleUser[] }>(`/api/v1/roles/${selectedRoleId}/users`)
      .then((res) => setRoleUsers(res.users ?? []))
      .catch((err) => setUsersError(err instanceof Error ? err.message : "خطأ"))
      .finally(() => setLoadingUsers(false));
  }, [selectedRoleId]);

  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${userName}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      await apiFetch(`/api/v1/users/${userId}`, { method: "DELETE" });
      reloadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر حذف المستخدم");
    }
  }, [reloadUsers]);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/api/v1/roles/${selectedRoleId}/perms`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(permIds) }),
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }, [selectedRoleId, permIds]);

  const handleSaveColor = useCallback(async () => {
    if (!pickedColor) return;
    setSavingColor(true);
    try {
      await apiFetch("/api/web/dashboard/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_color: pickedColor }),
      });
      requestRuntimeBrandingRefresh();
    } catch { /* silent */ } finally {
      setSavingColor(false);
    }
  }, [pickedColor]);

  const handleSaveDashboard = useCallback(async () => {
    if (!selectedRoleId) return;
    setSavingDashboard(true);
    try {
      await apiFetch(`/api/v1/roles/${selectedRoleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_sections: dashboardSections }),
      });
      setRoles((prev) => prev.map((r) => r.id === selectedRoleId ? { ...r, dashboard_sections: dashboardSections } : r));
    } catch { /* silent */ } finally {
      setSavingDashboard(false);
    }
  }, [selectedRoleId, dashboardSections]);

  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!confirm("هل تريد حذف هذا الدور؟")) return;
    try {
      await apiFetch(`/api/v1/roles/${roleId}`, { method: "DELETE" });
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      if (selectedRoleId === roleId) {
        const remaining = roles.filter((r) => r.id !== roleId);
        setSelectedRoleId(remaining[0]?.id ?? null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر الحذف");
    }
  }, [roles, selectedRoleId]);

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const accentColor = selectedRole?.color ?? "#4f8cff";
  const accentRgb = hexToRgb(accentColor);

  // Live-sync --primary with the picked branch color (preview)
  const liveColor = pickedColor || systemPrimaryColor;
  useEffect(() => {
    if (!liveColor.startsWith("#") || liveColor.length !== 7) return;
    const c = liveColor.slice(1);
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const dk = (v: number) => Math.max(0, Math.round(v * 0.83)).toString(16).padStart(2, "0");
    document.documentElement.style.setProperty("--primary", liveColor);
    document.documentElement.style.setProperty("--primary-strong", `#${dk(r)}${dk(g)}${dk(b)}`);
    document.documentElement.style.setProperty("--primary-soft", `rgba(${r},${g},${b},0.12)`);
    document.documentElement.style.setProperty("--primary-rgb", `${r} ${g} ${b}`);
    document.documentElement.style.setProperty("--shadow-primary", `0 4px 16px rgba(${r},${g},${b},0.28)`);
  }, [liveColor]);

  const shell = (
    <div className="flex min-h-screen bg-[var(--surface-muted)]">
      <AppSidebar currentPath="/dashboard/settings/roles" />
      <div className="flex-1 flex flex-col min-w-0" dir={locale === "ar" ? "rtl" : "ltr"}>
        <AppShellTopbar
          title="الأدوار والصلاحيات"
          subtitle="أدِر أدوار الموظفين وصلاحياتهم"
        />
        {loading ? (
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">جاري التحميل...</p>
            </div>
          </main>
        ) : error ? (
          <main className="flex-1 flex items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </main>
        ) : null}
      </div>
    </div>
  );

  if (loading || error) {
    return <ProtectedRoute roles={["super_admin", "admin"]}>{shell}</ProtectedRoute>;
  }

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/dashboard/settings/roles" />
        <div className="flex-1 flex flex-col min-w-0" dir={locale === "ar" ? "rtl" : "ltr"}>
          <AppShellTopbar
            title="الأدوار والصلاحيات"
            subtitle="أدِر أدوار الموظفين وصلاحياتهم"
          />

          <main className="flex-1 overflow-hidden flex flex-col">

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--surface-strong)]">
              <button type="button" onClick={() => setShowCreate(true)}
                className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition flex items-center gap-1.5">
                <span className="text-base leading-none">+</span> دور جديد
              </button>
              {selectedRoleId && (
                <button type="button" onClick={() => setShowCreateUser(true)}
                  className="h-8 px-4 rounded-lg border-2 border-[var(--primary)]/50 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/8 transition flex items-center gap-1.5">
                  <span className="text-base leading-none">+</span> مستخدم جديد
                </button>
              )}
              <div className="flex-1" />
              {selectedRole && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="font-medium text-[var(--text-secondary)]">{selectedRole.name_ar}</span>
                  <span>·</span>
                  <span>{roleUsers.length} مستخدم</span>
                  <span>·</span>
                  <span>{permIds.size} صلاحية</span>
                </div>
              )}
            </div>

            {/* ── Content ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

              {/* ── Role Sidebar ── */}
              <aside className="w-52 shrink-0 border-e border-[var(--border)] overflow-y-auto bg-[var(--surface-strong)] pt-1 pb-4">
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">الأدوار</p>
                {roles.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[var(--text-muted)]">لا توجد أدوار</p>
                )}
                {roles.map((role) => {
                  const isActive = selectedRoleId === role.id;
                  const roleColor = role.color ?? "#94a3b8";
                  const roleRgb = hexToRgb(roleColor);
                  return (
                    <div key={role.id} className="group relative mx-2 my-0.5">
                      <button type="button" onClick={() => setSelectedRoleId(role.id)}
                        className={cn("w-full text-start px-3 py-2.5 rounded-xl transition-all duration-150",
                          isActive ? "" : "hover:bg-[var(--surface-muted)]")}
                        style={isActive ? {
                          backgroundColor: `rgba(${roleRgb},0.1)`,
                          boxShadow: `inset 3px 0 0 0 rgb(${roleRgb})`,
                        } : undefined}
                      >
                        <div className="flex items-center gap-2.5 pe-5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/10"
                            style={{ backgroundColor: roleColor }} />
                          <span className={cn("text-[13px] truncate font-medium",
                            isActive ? "font-bold" : "text-[var(--text-secondary)]")}
                            style={isActive ? { color: `rgb(${roleRgb})` } : undefined}>
                            {role.name_ar}
                          </span>
                        </div>
                        {role.is_system && (
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 ps-5">نظامي</p>
                        )}
                      </button>
                      {!role.is_system && (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteRole(role.id); }}
                          className="absolute end-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all text-[10px]"
                          title="حذف الدور">✕</button>
                      )}
                    </div>
                  );
                })}
              </aside>

              {/* ── Main Panel ── */}
              <div className="flex-1 overflow-y-auto">
                {!selectedRole ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-[var(--text-muted)]">اختر دوراً من القائمة</p>
                  </div>
                ) : (
                  <div className="p-5 space-y-5">

                    {/* ── Role Header Card ── */}
                    <div className="rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
                      {/* Gradient banner */}
                      <div className="px-5 py-5 relative overflow-hidden"
                        style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.12) 0%, rgba(${accentRgb},0.04) 60%, transparent 100%)` }}>
                        <div className="absolute -end-6 -top-6 w-28 h-28 rounded-full opacity-10" style={{ backgroundColor: `rgb(${accentRgb})` }} />
                        <div className="flex items-start justify-between gap-4 relative">
                          <div className="flex items-center gap-3.5">
                            <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-xl shadow-md"
                              style={{ background: `linear-gradient(135deg, rgb(${accentRgb}), rgba(${accentRgb},0.7))` }}>
                              {selectedRole.name_ar.slice(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-[var(--text-primary)]">{selectedRole.name_ar}</h2>
                                {selectedRole.is_system && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">نظامي</span>
                                )}
                              </div>
                              <code className="text-xs text-[var(--text-muted)] mt-0.5 block font-mono">{selectedRole.key}</code>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {saveError && <span className="text-xs text-red-500 max-w-32 text-end">{saveError}</span>}
                            <button type="button" onClick={handleSave} disabled={saving}
                              className="h-9 px-5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition hover:opacity-90 shadow-md"
                              style={{ background: `linear-gradient(135deg, rgb(${accentRgb}), rgba(${accentRgb},0.75))` }}>
                              {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
                            </button>
                          </div>
                        </div>
                        {/* Stats row */}
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          {[
                            { icon: "👥", value: loadingUsers ? "..." : roleUsers.length, label: "مستخدم" },
                            { icon: "🔑", value: loadingRole ? "..." : permIds.size, label: "صلاحية" },
                          ].map((s) => (
                            <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border me-1"
                              style={{ backgroundColor: "var(--surface-strong)", borderColor: "var(--border)" }}>
                              <span className="text-sm">{s.icon}</span>
                              <span className="text-sm font-black text-[var(--text-primary)]">{s.value}</span>
                              <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Color picker row */}
                      <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--surface-strong)] flex items-center gap-2.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">لون الدور</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* System primary color (if not already in palette) */}
                          {systemPrimaryColor && !ROLE_COLORS.includes(systemPrimaryColor as typeof ROLE_COLORS[number]) && (
                            <button key="system" type="button" title={`لون النظام: ${systemPrimaryColor}`}
                              onClick={() => setPickedColor(systemPrimaryColor)}
                              className={cn("w-6 h-6 rounded-full transition-all hover:scale-125 ring-1 ring-offset-1",
                                pickedColor === systemPrimaryColor ? "ring-[var(--text-primary)] scale-110" : "ring-transparent opacity-90 hover:opacity-100")}
                              style={{ backgroundColor: systemPrimaryColor }}>
                              <span className="sr-only">لون النظام</span>
                            </button>
                          )}
                          {ROLE_COLORS.map((color) => (
                            <button key={color} type="button" title={color} onClick={() => setPickedColor(color)}
                              className={cn("w-6 h-6 rounded-full transition-all hover:scale-125",
                                pickedColor === color ? "ring-2 ring-offset-1 ring-[var(--text-primary)] scale-110" : "opacity-80 hover:opacity-100")}
                              style={{ backgroundColor: color }} />
                          ))}
                          <button type="button" title="بدون لون" onClick={() => setPickedColor("")}
                            className={cn("w-6 h-6 rounded-full border-2 bg-[var(--surface-muted)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] transition-all hover:scale-110",
                              pickedColor === "" ? "ring-2 ring-offset-1 ring-[var(--text-primary)] border-[var(--text-muted)]" : "border-[var(--border)]")}>✕</button>
                        </div>
                        {pickedColor && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: pickedColor }} />
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">{pickedColor}</span>
                          </div>
                        )}
                        <button type="button" onClick={handleSaveColor} disabled={savingColor}
                          className="ms-auto h-7 px-3 rounded-lg text-[11px] font-bold text-white disabled:opacity-50 transition shadow-sm"
                          style={{ background: `linear-gradient(135deg, rgb(${accentRgb}), rgba(${accentRgb},0.75))` }}>
                          {savingColor ? "..." : "حفظ اللون"}
                        </button>
                      </div>
                    </div>

                    {/* ── Users Section ── */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">المستخدمون</h3>
                          {!loadingUsers && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                              style={{ backgroundColor: `rgba(${accentRgb},0.1)`, color: `rgb(${accentRgb})`, borderColor: `rgba(${accentRgb},0.2)` }}>
                              {roleUsers.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setShowCreateUser(true)}
                            className="h-8 px-3.5 rounded-xl text-xs font-bold transition border"
                            style={{ borderColor: `rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, backgroundColor: `rgba(${accentRgb},0.06)` }}>
                            + مستخدم جديد
                          </button>
                        </div>
                      </div>

                      {loadingUsers ? (
                        <div className="flex items-center gap-2 py-5 text-xs text-[var(--text-muted)]">
                          <Spinner size={14} /> جاري تحميل المستخدمين...
                        </div>
                      ) : usersError ? (
                        <p className="text-xs text-red-500 py-2">{usersError}</p>
                      ) : roleUsers.length === 0 ? (
                        <div className="py-10 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-strong)]">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                            style={{ backgroundColor: `rgba(${accentRgb},0.1)`, color: `rgb(${accentRgb})` }}>👤</div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">لا يوجد مستخدمون بعد</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">أضف أول مستخدم لهذا الدور</p>
                          </div>
                          <button type="button" onClick={() => setShowCreateUser(true)}
                            className="h-8 px-4 rounded-xl text-xs font-bold transition"
                            style={{ backgroundColor: `rgba(${accentRgb},0.1)`, color: `rgb(${accentRgb})` }}>
                            + إضافة مستخدم
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {roleUsers.map((u) => (
                            <UserCard key={u.id} user={u} accentColor={accentColor}
                              onEdit={() => setEditingUser(u)}
                              onDelete={() => handleDeleteUser(u.id, u.full_name)}
                              onResetPassword={() => setResetPasswordUser(u)}
                              onViewActivity={() => setActivityLogUser(u)} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Permissions Section ── */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">الصلاحيات</h3>
                        {loadingRole ? (
                          <Spinner size={14} />
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: `rgba(${accentRgb},0.1)`, color: `rgb(${accentRgb})`, borderColor: `rgba(${accentRgb},0.2)` }}>
                            {permIds.size}
                          </span>
                        )}
                      </div>
                      {!loadingRole && <PermMatrix tree={tree} selected={permIds} onChange={setPermIds} accentColor={accentColor} />}
                    </div>

                    {/* ── Dashboard Sections ── */}
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between"
                        style={{ background: `linear-gradient(to left, rgba(${accentRgb},0.04), transparent)` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏫</span>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">صلاحيات لوحة الفرع</h3>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">تحكم في الأقسام الظاهرة على لوحة التحكم لهذا الدور</p>
                          </div>
                        </div>
                        <button type="button" onClick={handleSaveDashboard} disabled={savingDashboard}
                          className="h-8 px-4 rounded-xl text-xs font-bold transition border"
                          style={{ borderColor: `rgba(${accentRgb},0.4)`, color: `rgb(${accentRgb})`, backgroundColor: `rgba(${accentRgb},0.06)` }}>
                          {savingDashboard ? "..." : "حفظ"}
                        </button>
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {DASHBOARD_SECTIONS.map((section) => {
                          const enabled = dashboardSections[section.key] !== false;
                          return (
                            <button
                              key={section.key}
                              type="button"
                              onClick={() => setDashboardSections((prev) => ({ ...prev, [section.key]: !enabled }))}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-xl border text-right transition",
                                enabled
                                  ? "border-[var(--border)] bg-[var(--surface-strong)]"
                                  : "border-dashed border-[var(--border)] bg-[var(--surface-muted)] opacity-60"
                              )}
                              style={enabled ? { borderColor: `rgba(${accentRgb},0.25)`, backgroundColor: `rgba(${accentRgb},0.04)` } : {}}
                            >
                              <span className={cn("text-lg leading-none mt-0.5 shrink-0 transition-opacity", enabled ? "opacity-100" : "opacity-30")}>
                                {section.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-sm font-semibold", enabled ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                                    {section.label}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                                    enabled
                                      ? "bg-emerald-500/12 text-emerald-600"
                                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                  )}>
                                    {enabled ? "مفعّل" : "مخفي"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{section.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </main>

          {/* ── Modals ── */}
          {showCreate && (
            <CreateRoleModal
              onClose={() => setShowCreate(false)}
              onCreate={(role) => { setRoles((prev) => [...prev, role]); setSelectedRoleId(role.id); }}
            />
          )}
          {showCreateUser && selectedRoleId && (
            <CreateUserModal
              initialRoleId={selectedRoleId}
              roles={roles}
              tree={tree}
              accentColor={accentColor}
              onClose={() => setShowCreateUser(false)}
              onCreated={reloadUsers}
            />
          )}
          {editingUser && (
            <EditUserModal
              user={editingUser}
              roles={roles}
              accentColor={accentColor}
              onClose={() => setEditingUser(null)}
              onSaved={reloadUsers}
            />
          )}
          {resetPasswordUser && (
            <ResetPasswordModal
              user={resetPasswordUser}
              onClose={() => setResetPasswordUser(null)}
            />
          )}
          {activityLogUser && (
            <ActivityLogModal
              user={activityLogUser}
              onClose={() => setActivityLogUser(null)}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
