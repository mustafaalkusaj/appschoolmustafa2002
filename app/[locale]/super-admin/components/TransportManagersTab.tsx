"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bus, Check, Copy, KeyRound, Loader2, Plus, Power,
  RefreshCw, Search, Shield, User, X,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";

interface ManagerRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string;
  phone: string | null;
  school_id: string | null;
  branch_id: string | null;
  school_name: string | null;
  branch_name: string | null;
  is_active: boolean;
  created_at: string | null;
}

interface Credentials {
  username: string;
  email: string;
  password: string;
}

interface SchoolOption { id: string; name: string }
interface BranchOption { id: string; school_id: string; name: string; is_active: boolean }

interface TransportManagersTabProps {
  schools: SchoolOption[];
  branches: BranchOption[];
}

export function TransportManagersTab({ schools, branches }: TransportManagersTabProps) {
  const [managers, setManagers] = useState<ManagerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSchoolId, setFormSchoolId] = useState("");
  const [formBranchId, setFormBranchId] = useState("");

  const filteredBranches = useMemo(
    () => branches.filter((b) => b.school_id === formSchoolId && b.is_active),
    [branches, formSchoolId],
  );

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        managers?: ManagerRecord[];
        error?: { message?: string };
      }>("/api/web/transport/managers");
      if (!response.ok) throw new Error(payload?.error?.message || "فشل تحميل البيانات");
      setManagers(payload?.managers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchManagers(); }, [fetchManagers]);

  const filteredManagers = useMemo(() => {
    if (!query.trim()) return managers;
    const q = query.toLowerCase();
    return managers.filter(
      (m) =>
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.username ?? "").toLowerCase().includes(q) ||
        (m.school_name ?? "").toLowerCase().includes(q) ||
        (m.branch_name ?? "").toLowerCase().includes(q),
    );
  }, [managers, query]);

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormSchoolId("");
    setFormBranchId("");
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formName.trim() || !formSchoolId || !formBranchId) return;
    setSubmitting(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok?: boolean;
        credentials?: Credentials;
        error?: { message?: string };
      }>("/api/web/transport/managers", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          full_name: formName.trim(),
          phone: formPhone.trim(),
          school_id: formSchoolId,
          branch_id: formBranchId,
        }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "فشل إنشاء الحساب");
      if (payload?.credentials) setCredentials(payload.credentials);
      resetForm();
      await fetchManagers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (managerId: string) => {
    setActionLoading(managerId);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok?: boolean;
        credentials?: Credentials;
        error?: { message?: string };
      }>("/api/web/transport/managers", {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ manager_id: managerId, action: "reset_password" }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "فشل إعادة تعيين كلمة المرور");
      if (payload?.credentials) setCredentials(payload.credentials);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إعادة تعيين كلمة المرور");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (managerId: string) => {
    setActionLoading(managerId);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok?: boolean;
        is_active?: boolean;
        error?: { message?: string };
      }>("/api/web/transport/managers", {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({ manager_id: managerId, action: "toggle_active" }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "فشل تحديث الحالة");
      setManagers((prev) =>
        prev.map((m) => (m.id === managerId ? { ...m, is_active: payload?.is_active ?? m.is_active } : m)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحديث الحالة");
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const activeSchools = useMemo(() => schools.filter((s) => s.id), [schools]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <Bus className="h-5 w-5 text-[var(--success)]" />
            مدراء النقل
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            إنشاء وإدارة حسابات مدراء النقل لكل مدرسة وفرع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchManagers}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> تحديث
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> إنشاء مدير نقل
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
          <button onClick={() => setError("")} className="ms-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setCredentials(null)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <Shield className="h-5 w-5 text-[var(--success)]" />
                بيانات الدخول
              </h3>
              <button onClick={() => setCredentials(null)} className="rounded-full p-1.5 hover:bg-[var(--surface-soft)]">
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[var(--warning)] font-bold bg-[var(--warning)]/10 rounded-xl px-3 py-2 text-center">
                هذه البيانات تظهر مرة واحدة فقط — احفظها الآن
              </p>
              {[
                { label: "اسم المستخدم", value: credentials.username, key: "username" },
                { label: "كلمة المرور", value: credentials.password, key: "password" },
              ].map(({ label, value, key }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">{label}</label>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5">
                    <code className="flex-1 text-sm font-mono font-bold text-[var(--text-primary)] select-all" dir="ltr">{value}</code>
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="rounded-lg p-1.5 hover:bg-[var(--surface-soft)] transition-colors"
                    >
                      {copiedField === key ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4 text-[var(--text-tertiary)]" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] px-6 py-4">
              <button
                onClick={() => setCredentials(null)}
                className="w-full rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-colors"
              >
                تم الحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                <Plus className="h-5 w-5 text-[var(--success)]" />
                إنشاء مدير نقل جديد
              </h3>
              <button onClick={resetForm} className="rounded-full p-1.5 hover:bg-[var(--surface-soft)]">
                <X className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[var(--text-secondary)]">الاسم الكامل *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="اسم مدير النقل"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--success)]/20 focus:border-[var(--success)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[var(--text-secondary)]">رقم الهاتف</label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="07xxxxxxxxx"
                  dir="ltr"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--success)]/20 focus:border-[var(--success)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[var(--text-secondary)]">المدرسة *</label>
                <select
                  value={formSchoolId}
                  onChange={(e) => { setFormSchoolId(e.target.value); setFormBranchId(""); }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--success)]/20 focus:border-[var(--success)]"
                >
                  <option value="">— اختر المدرسة —</option>
                  {activeSchools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[var(--text-secondary)]">الفرع *</label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  disabled={!formSchoolId}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--success)]/20 focus:border-[var(--success)] disabled:opacity-50"
                >
                  <option value="">— اختر الفرع —</option>
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {formSchoolId && filteredBranches.length === 0 && (
                  <p className="text-xs text-[var(--warning)]">لا توجد فروع نشطة لهذه المدرسة</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
              <button onClick={resetForm} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]">
                إلغاء
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !formName.trim() || !formSchoolId || !formBranchId}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إنشاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {managers.length > 0 && (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث باسم المدير أو المدرسة أو الفرع..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] ps-10 pe-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--success)]/20 focus:border-[var(--success)]"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--success)] opacity-40" />
        </div>
      ) : managers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Bus className="h-12 w-12 text-[var(--text-tertiary)] opacity-30" />
          <p className="text-sm font-bold text-[var(--text-tertiary)]">لا يوجد مدراء نقل</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> إنشاء أول مدير نقل
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredManagers.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl border bg-[var(--surface)] p-4 transition-colors",
                m.is_active ? "border-[var(--border)]" : "border-[var(--danger)]/20 opacity-60",
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
                  <User className="h-5 w-5 text-[var(--success)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-[var(--text-primary)]">{m.full_name || "—"}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", m.is_active ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]")}>
                      {m.is_active ? "نشط" : "معطّل"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-[var(--text-secondary)]">
                    <span className="font-mono font-bold" dir="ltr">{m.username}</span>
                    {m.phone && <span dir="ltr">{m.phone}</span>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs">
                    <span className="rounded-lg bg-[var(--primary)]/10 px-2 py-0.5 font-bold text-[var(--primary)]">
                      {m.school_name || "—"}
                    </span>
                    <span className="rounded-lg bg-[var(--accent)]/10 px-2 py-0.5 font-bold text-[var(--accent)]">
                      {m.branch_name || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleResetPassword(m.id)}
                    disabled={actionLoading === m.id}
                    title="إعادة تعيين كلمة المرور"
                    className="rounded-xl p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-soft)] hover:text-[var(--warning)] transition-colors disabled:opacity-50"
                  >
                    {actionLoading === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(m.id)}
                    disabled={actionLoading === m.id}
                    title={m.is_active ? "تعطيل" : "تفعيل"}
                    className={cn(
                      "rounded-xl p-2 transition-colors disabled:opacity-50",
                      m.is_active
                        ? "text-[var(--text-tertiary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                        : "text-[var(--text-tertiary)] hover:bg-[var(--success)]/10 hover:text-[var(--success)]",
                    )}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredManagers.length === 0 && query && (
            <p className="text-center py-8 text-sm text-[var(--text-tertiary)]">لا توجد نتائج للبحث</p>
          )}
        </div>
      )}
    </div>
  );
}
