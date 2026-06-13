"use client";
import { useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

type ClassItem = { id: string; name: string };
type SectionItem = { id: string; class_id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  fromClass: string;
  fromSection: string;
  classes: ClassItem[];
  sections: SectionItem[];
  onSuccess: () => void;
};

export function CloneModal({
  open,
  onClose,
  schoolId,
  fromClass,
  fromSection,
  classes,
  sections,
  onSuccess,
}: Props) {
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const toSections = toClass
    ? sections.filter((s) => {
        const cls = classes.find((c) => c.name === toClass);
        return cls ? s.class_id === cls.id : false;
      })
    : [];

  const handleClone = async () => {
    if (!toClass) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        count?: number;
        message?: string;
      }>("/api/web/schedule/clone", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolId,
          from_class: fromClass,
          from_section: fromSection,
          to_class: toClass,
          to_section: toSection,
        }),
      });
      if (response.ok && payload?.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(payload?.message || "تعذر النسخ.");
      }
    } catch {
      setError("تعذر الاتصال.");
    } finally {
      setSaving(false);
    }
  };

  const ctrl =
    "h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none w-full focus:border-[var(--primary)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card-bg)] rounded-[24px] border border-[var(--border)] shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-black text-[var(--text-primary)] text-lg">📋 نسخ الجدول</h2>
        <p className="text-sm text-[var(--text-muted)]">
          نسخ جدول{" "}
          <strong>
            {fromClass}
            {fromSection ? ` - ${fromSection}` : ""}
          </strong>{" "}
          إلى:
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
              الصف المستهدف
            </label>
            <select
              className={ctrl}
              value={toClass}
              onChange={(e) => {
                setToClass(e.target.value);
                setToSection("");
              }}
            >
              <option value="">— اختر الصف —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {toSections.length > 0 && (
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1">
                الشعبة (اختياري)
              </label>
              <select
                className={ctrl}
                value={toSection}
                onChange={(e) => setToSection(e.target.value)}
              >
                <option value="">— بدون شعبة —</option>
                {toSections.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--danger)] font-bold">{error}</p>}
        {success && <p className="text-xs text-[var(--success)] font-bold">✓ تم النسخ بنجاح!</p>}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => void handleClone()}
            disabled={!toClass || saving}
            className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white font-black text-sm disabled:opacity-40"
          >
            {saving ? "جارٍ النسخ..." : "نسخ الجدول"}
          </button>
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-[var(--border)] font-bold text-sm text-[var(--text-muted)]"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
