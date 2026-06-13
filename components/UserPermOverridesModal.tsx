"use client";

import { useEffect, useState } from "react";
import type { PermModule } from "@/types/deep-permissions";

type OverrideState = "inherit" | "grant" | "revoke";

type ExistingOverride = {
  permission_id: string;
  is_granted: boolean;
  reason: string | null;
};

interface UserPermOverridesModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function stateLabel(state: OverrideState): string {
  if (state === "grant") return "منح ✓";
  if (state === "revoke") return "سحب ✗";
  return "موروث";
}

export function UserPermOverridesModal({ userId, userName, onClose }: UserPermOverridesModalProps) {
  const [tree, setTree] = useState<PermModule[]>([]);
  const [existingOverrides, setExistingOverrides] = useState<Map<string, ExistingOverride>>(new Map());
  const [pending, setPending] = useState<Map<string, { state: OverrideState }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [globalReason, setGlobalReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<{ ok: boolean; tree: PermModule[] }>("/api/v1/permissions/tree"),
      apiFetch<{ ok: boolean; overrides: ExistingOverride[] }>(`/api/v1/users/${userId}/perm-overrides`),
    ])
      .then(([treeRes, overridesRes]) => {
        if (cancelled) return;
        setTree(treeRes.tree);
        const map = new Map<string, ExistingOverride>();
        for (const o of overridesRes.overrides) {
          map.set(o.permission_id, o);
        }
        setExistingOverrides(map);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذر التحميل");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const getEffectiveState = (permId: string): OverrideState => {
    if (pending.has(permId)) return pending.get(permId)!.state;
    const existing = existingOverrides.get(permId);
    if (!existing) return "inherit";
    return existing.is_granted ? "grant" : "revoke";
  };

  const setPermState = (permId: string, state: OverrideState) => {
    setPending((prev) => {
      const next = new Map(prev);
      if (state === "inherit" && !existingOverrides.has(permId)) {
        next.delete(permId);
      } else {
        next.set(permId, { state });
      }
      return next;
    });
  };

  const changesCount = pending.size;

  const handleSave = async () => {
    if (!globalReason.trim() && changesCount > 0) {
      setSaveError("سبب التعديل مطلوب");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const overrides: { permission_id: string; is_granted: boolean; reason: string }[] = [];
      const reverted: string[] = [];

      for (const [permId, change] of Array.from(pending.entries())) {
        if (change.state === "inherit") {
          reverted.push(permId);
        } else {
          overrides.push({
            permission_id: permId,
            is_granted: change.state === "grant",
            reason: globalReason.trim(),
          });
        }
      }

      await apiFetch(`/api/v1/users/${userId}/perm-overrides`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides, reverted }),
      });

      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--surface-strong)] rounded-2xl border border-[var(--border)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">صلاحيات خاصة</h2>
            <p className="text-sm text-[var(--text-muted)]">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">جاري التحميل...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <div className="space-y-4">
              {tree.map((mod) => (
                <div key={mod.key} className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface-soft)] text-sm font-bold text-[var(--text-primary)]"
                    onClick={() =>
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        next.has(mod.key) ? next.delete(mod.key) : next.add(mod.key);
                        return next;
                      })
                    }
                  >
                    <span>{mod.name_ar}</span>
                    <span className="text-xs text-[var(--text-muted)]">{collapsed.has(mod.key) ? "▶" : "▼"}</span>
                  </button>
                  {!collapsed.has(mod.key) && (
                    <div className="divide-y divide-[var(--border)]">
                      {mod.pages.map((page) => (
                        <div key={page.key} className="px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">{page.name_ar}</p>
                          <div className="space-y-2">
                            {page.permissions.map((perm) => {
                              const state = getEffectiveState(perm.id);
                              return (
                                <div key={perm.id} className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-[var(--text-secondary)] flex-1">{perm.name_ar}</span>
                                  <div className="flex gap-1">
                                    {(["inherit", "grant", "revoke"] as OverrideState[]).map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setPermState(perm.id, s)}
                                        className={`px-2 py-0.5 text-xs rounded border transition ${
                                          state === s
                                            ? s === "grant"
                                              ? "bg-green-100 border-green-400 text-green-700 font-semibold"
                                              : s === "revoke"
                                                ? "bg-red-100 border-red-400 text-red-700 font-semibold"
                                                : "bg-[var(--surface-muted)] border-[var(--border)] text-[var(--text-primary)] font-semibold"
                                            : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                                        }`}
                                      >
                                        {stateLabel(s)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="px-6 py-4 border-t border-[var(--border)] space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-muted)]">
                سبب التعديل <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="مثال: استثناء مؤقت بقرار الإدارة"
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)]">{changesCount} تعديل معلق</span>
              <div className="flex items-center gap-2">
                {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || changesCount === 0}
                  className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
