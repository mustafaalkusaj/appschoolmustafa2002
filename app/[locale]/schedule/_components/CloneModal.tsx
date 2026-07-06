"use client";

import { useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

// ── Types ────────────────────────────────────────────────────────────────────

type ClassItem = { id: string; name: string };
type SectionItem = { id: string; class_id: string; name: string };

interface CloneModalProps {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  fromClass: string;
  fromSection: string;
  classes: ClassItem[];
  sections: SectionItem[];
  onSuccess: () => void;
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const TEXT = {
  en: {
    title: "Clone Schedule",
    description: "Copy the schedule from one class/section to another",
    sourceLabel: "Source",
    sourceClass: "Class",
    sourceSection: "Section",
    targetClass: "Target Class",
    targetSection: "Target Section",
    selectClass: "Select a class...",
    selectSection: "Select a section...",
    clone: "Clone Schedule",
    cloning: "Cloning...",
    cancel: "Cancel",
    successMessage: "Schedule cloned successfully!",
    errorSameTarget: "Target must be different from source",
    errorGeneric: "Failed to clone schedule. Please try again.",
    noSections: "No sections available for this class",
  },
  ar: {
    title: "نسخ الجدول",
    description: "نسخ الجدول من صف/شعبة إلى أخرى",
    sourceLabel: "المصدر",
    sourceClass: "الصف",
    sourceSection: "الشعبة",
    targetClass: "الصف المستهدف",
    targetSection: "الشعبة المستهدفة",
    selectClass: "اختر الصف...",
    selectSection: "اختر الشعبة...",
    clone: "نسخ الجدول",
    cloning: "جاري النسخ...",
    cancel: "إلغاء",
    successMessage: "تم نسخ الجدول بنجاح!",
    errorSameTarget: "يجب أن يختلف الهدف عن المصدر",
    errorGeneric: "فشل نسخ الجدول. يرجى المحاولة مرة أخرى.",
    noSections: "لا توجد شعب متاحة لهذا الصف",
  },
} as const;

// ── Component ────────────────────────────────────────────────────────────────

export function CloneModal({
  open,
  onClose,
  schoolId,
  fromClass,
  fromSection,
  classes,
  sections,
  onSuccess,
}: CloneModalProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const t = TEXT[locale] ?? TEXT.en;

  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derive the source class/section names for display
  const sourceClassName = useMemo(
    () => classes.find((c) => c.id === fromClass)?.name ?? fromClass,
    [classes, fromClass],
  );
  const sourceSectionName = useMemo(
    () => sections.find((s) => s.id === fromSection)?.name ?? fromSection,
    [sections, fromSection],
  );

  // Filter sections for the selected target class
  const targetSections = useMemo(
    () => (toClass ? sections.filter((s) => s.class_id === toClass) : []),
    [sections, toClass],
  );

  // Check if current selection matches source
  const isSameAsSource = toClass === fromClass && toSection === fromSection;

  const canSubmit = toClass !== "" && toSection !== "" && !isSameAsSource && !loading;

  const handleClassChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setToClass(e.target.value);
    setToSection("");
    setError(null);
    setSuccess(false);
  }, []);

  const handleSectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setToSection(e.target.value);
    setError(null);
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    setToClass("");
    setToSection("");
    setError(null);
    setSuccess(false);
    onClose();
  }, [loading, onClose]);

  const handleClone = useCallback(async () => {
    if (!canSubmit) return;

    if (isSameAsSource) {
      setError(t.errorSameTarget);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetchJsonWithAuthorizedSession<{ success?: boolean; error?: string }>(
        "/api/web/schedule/clone",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            from_class: fromClass,
            from_section: fromSection,
            to_class: toClass,
            to_section: toSection,
          }),
        },
      );

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        onSuccess();
        // Auto-close after brief success feedback
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, isSameAsSource, t, schoolId, fromClass, fromSection, toClass, toSection, onSuccess, handleClose]);

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <ModalHeader title={t.title} description={t.description} onClose={handleClose} />

      <ModalBody>
        <div className="flex flex-col gap-5">
          {/* ── Source (read-only) ─────────────────────────────── */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              {t.sourceLabel}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-[var(--text-tertiary)]">{t.sourceClass}</span>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                  {sourceClassName}
                </p>
              </div>
              <div>
                <span className="text-xs text-[var(--text-tertiary)]">{t.sourceSection}</span>
                <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                  {sourceSectionName}
                </p>
              </div>
            </div>
          </div>

          {/* ── Arrow separator ────────────────────────────────── */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] flex items-center justify-center">
              <Copy className="h-4 w-4 text-[var(--primary)]" />
            </div>
          </div>

          {/* ── Target class ──────────────────────────────────── */}
          <div>
            <label
              htmlFor="clone-target-class"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              {t.targetClass}
            </label>
            <Select
              id="clone-target-class"
              value={toClass}
              onChange={handleClassChange}
              disabled={loading}
            >
              <option value="">{t.selectClass}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* ── Target section ────────────────────────────────── */}
          <div>
            <label
              htmlFor="clone-target-section"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              {t.targetSection}
            </label>
            <Select
              id="clone-target-section"
              value={toSection}
              onChange={handleSectionChange}
              disabled={loading || toClass === ""}
            >
              <option value="">{t.selectSection}</option>
              {targetSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            {toClass !== "" && targetSections.length === 0 && (
              <p className="text-xs text-[var(--warning)] mt-1">{t.noSections}</p>
            )}
          </div>

          {/* ── Same-as-source warning ────────────────────────── */}
          {isSameAsSource && toClass !== "" && toSection !== "" && (
            <div className="flex items-center gap-2 text-sm text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{t.errorSameTarget}</span>
            </div>
          )}

          {/* ── Error feedback ────────────────────────────────── */}
          {error && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {/* ── Success feedback ──────────────────────────────── */}
          {success && (
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-3 py-2 text-sm text-[var(--success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{t.successMessage}</span>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          {t.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={handleClone}
          disabled={!canSubmit}
          loading={loading}
        >
          {loading ? t.cloning : t.clone}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default CloneModal;
