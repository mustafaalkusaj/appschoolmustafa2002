"use client";

import { useState } from "react";
import { Monitor, Wifi, Layers, X } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { cx } from "./UI";

type AppPlatform = "web" | "mobile" | "both";

interface Props {
  isOpen: boolean;
  schools: Array<{ id: string; nameAr: string }>;
  onClose: () => void;
  onCreated: () => void;
}

const PLATFORM_OPTIONS: Array<{ value: AppPlatform; label: string; icon: typeof Layers }> = [
  { value: "web", label: "ويب", icon: Wifi },
  { value: "mobile", label: "موبايل", icon: Monitor },
  { value: "both", label: "ويب وموبايل", icon: Layers },
];

export function AppCreateForm({ isOpen, schools, onClose, onCreated }: Props) {
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<AppPlatform>("web");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setSchoolId("");
    setName("");
    setPlatform("web");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId || !name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await fetchJsonWithAuthorizedSession("/api/web/super-admin/apps", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ schoolId, name: name.trim(), platform }),
      });
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء التطبيق.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="ui-surface w-full max-w-lg rounded-[32px] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-[var(--text-primary)]">إضافة تطبيق جديد</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
              ربط تطبيق جديد بمدرسة وتحديد منصة التشغيل.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* School select */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-primary)]">المدرسة</label>
            <select
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">اختر المدرسة</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* App name */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-primary)]">اسم التطبيق</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              placeholder="مثال: تطبيق المدرسة النموذجية"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Platform */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-primary)]">المنصة</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlatform(value)}
                  className={cx(
                    "flex flex-col items-center gap-2 rounded-[18px] border p-4 text-center transition hover:-translate-y-0.5",
                    platform === value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40",
                  )}
                >
                  <Icon size={20} />
                  <span className="text-xs font-black">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {saving ? "جاري الإنشاء..." : "إنشاء التطبيق"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="ui-button ui-button--secondary flex-1 h-12"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
