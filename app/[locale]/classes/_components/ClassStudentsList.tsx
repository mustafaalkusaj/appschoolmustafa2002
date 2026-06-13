"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { Button } from "@/components/ui/button";
import type { ClassItem, SectionItem } from "../../dashboard/_components/types";
import { ClassTransferModal } from "./ClassTransferModal";

interface StudentRow {
  id: string;
  full_name: string;
  section: string | null;
  status: string;
  phone?: string | null;
}

interface Props {
  className: string;
  schoolId: string | null;
  branchId: string | null;
  classes: ClassItem[];
  sections: SectionItem[];
  canManage: boolean;
  locale: "ar" | "en";
}

const SECTION_COLORS = [
  { bg: "color-mix(in srgb, var(--primary) 12%, transparent)", text: "var(--primary)", border: "color-mix(in srgb, var(--primary) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--success) 12%, transparent)", text: "var(--success)", border: "color-mix(in srgb, var(--success) 25%, transparent)" },
  { bg: "color-mix(in srgb, var(--warning) 12%, transparent)", text: "var(--warning)", border: "color-mix(in srgb, var(--warning) 25%, transparent)" },
  { bg: "color-mix(in srgb, #8b5cf6 12%, transparent)", text: "#8b5cf6", border: "color-mix(in srgb, #8b5cf6 25%, transparent)" },
  { bg: "color-mix(in srgb, #06b6d4 12%, transparent)", text: "#06b6d4", border: "color-mix(in srgb, #06b6d4 25%, transparent)" },
];

function getInitials(name: string) {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)] animate-pulse">
      <div className="w-4 h-4 rounded bg-[var(--border)]" />
      <div className="w-8 h-8 rounded-full bg-[var(--border)]" />
      <div className="flex-1 h-4 rounded bg-[var(--border)]" />
      <div className="w-12 h-5 rounded-full bg-[var(--border)]" />
      <div className="w-14 h-7 rounded-lg bg-[var(--border)]" />
    </div>
  );
}

export function ClassStudentsList({
  className,
  schoolId,
  branchId,
  classes,
  sections,
  canManage,
  locale,
}: Props) {
  const isEn = locale === "en";
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [transferring, setTransferring] = useState<{ id: string; name: string } | null>(null);
  const [bulkTransfer, setBulkTransfer] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ className });
    if (schoolId) params.set("schoolId", schoolId);
    if (branchId) params.set("branchId", branchId);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{ students: StudentRow[] }>(
        `/api/web/students/list?${params.toString()}`
      );
      setStudents(payload?.students ?? []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [className, schoolId, branchId]);

  useEffect(() => {
    setSelectedIds(new Set());
    setFeedback(null);
    fetchStudents();
  }, [fetchStudents]);

  const grouped = students.reduce<Record<string, StudentRow[]>>((acc, s) => {
    const key = s.section ?? (isEn ? "No Section" : "بدون شعبة");
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
  const sectionKeys = Object.keys(grouped).sort();

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    const ids = grouped[key].map((s) => s.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const doTransfer = async (targetClassName: string, targetSection: string) => {
    setTransferLoading(true);
    setFeedback(null);
    try {
      const ids = bulkTransfer ? Array.from(selectedIds) : transferring ? [transferring.id] : [];
      await Promise.all(
        ids.map((id) =>
          fetchJsonWithAuthorizedSession(`/api/web/students/${id}`, {
            method: "PATCH",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              transfer_type: "class",
              target_class_name: targetClassName,
              target_section: targetSection || undefined,
              school_id: schoolId,
              branch_id: branchId ?? undefined,
            }),
          })
        )
      );
      const transferred = new Set(ids);
      setStudents((prev) => prev.filter((s) => !transferred.has(s.id)));
      setSelectedIds(new Set());
      setFeedback({ type: "success", text: isEn ? "Transferred successfully ✓" : "تم النقل بنجاح ✓" });
    } catch {
      setFeedback({ type: "error", text: isEn ? "Transfer failed, try again" : "فشل النقل، حاول مرة أخرى" });
    } finally {
      setTransferLoading(false);
      setTransferring(null);
      setBulkTransfer(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-[var(--surface-soft)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--border)] animate-pulse" />
              <div className="w-32 h-4 rounded bg-[var(--border)] animate-pulse" />
            </div>
            {[1, 2, 3].map((j) => <SkeletonRow key={j} />)}
          </div>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-3xl mb-2">👥</div>
        <div className="text-sm font-medium text-[var(--text-muted)]">
          {isEn ? "No students enrolled in this class" : "لا يوجد طلاب في هذا الصف"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${
          feedback.type === "success"
            ? "bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_20%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_20%,transparent)]"
        }`}>
          <span>{feedback.type === "success" ? "✓" : "✕"}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Bulk Selection Bar */}
      {selectedIds.size > 0 && canManage && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold text-[var(--primary)]">
              {isEn ? "students selected" : "طالب محدد"}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => setBulkTransfer(true)}>
              📦 {isEn ? "Transfer Selected" : "نقل المحددين"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              {isEn ? "Clear" : "إلغاء"}
            </Button>
          </div>
        </div>
      )}

      {/* Section Groups */}
      {sectionKeys.map((sectionKey, colorIdx) => {
        const rows = grouped[sectionKey];
        const color = SECTION_COLORS[colorIdx % SECTION_COLORS.length];
        const sectionIds = rows.map((s) => s.id);
        const allSelected = sectionIds.every((id) => selectedIds.has(id));
        const someSelected = sectionIds.some((id) => selectedIds.has(id));

        return (
          <div
            key={sectionKey}
            className="border rounded-2xl overflow-hidden"
            style={{ borderColor: color.border }}
          >
            {/* Section Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: color.bg }}
            >
              <div className="flex items-center gap-3">
                {canManage && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={() => toggleSection(sectionKey)}
                    className="w-4 h-4 cursor-pointer rounded"
                    style={{ accentColor: color.text }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: color.bg, color: color.text, border: `2px solid ${color.border}` }}
                >
                  {sectionKey.length <= 2 ? sectionKey : sectionKey[0]}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: color.text }}>
                    {isEn ? "Section" : "شعبة"} {sectionKey}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {rows.length} {isEn ? "students" : "طالب"}
                  </div>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="text-xs font-medium px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
                  style={{ color: color.text, background: color.bg }}
                >
                  {allSelected ? (isEn ? "Deselect all" : "إلغاء الكل") : (isEn ? "Select all" : "تحديد الكل")}
                </button>
              )}
            </div>

            {/* Students */}
            <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
              {rows.map((s, idx) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isSelected
                        ? "bg-[color-mix(in_srgb,var(--primary)_4%,transparent)]"
                        : "hover:bg-[var(--surface-soft)]"
                    }`}
                  >
                    {/* Checkbox */}
                    {canManage ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(s.id)}
                        className="w-4 h-4 cursor-pointer rounded flex-shrink-0"
                        style={{ accentColor: color.text }}
                      />
                    ) : (
                      <span className="w-5 text-xs text-[var(--text-muted)] text-center flex-shrink-0">{idx + 1}</span>
                    )}

                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {getInitials(s.full_name)}
                    </div>

                    {/* Name + index */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <span className="text-xs text-[var(--text-muted)]">{idx + 1}.</span>
                        )}
                        <span className="font-medium text-sm truncate">{s.full_name}</span>
                      </div>
                      {s.phone && (
                        <div className="text-xs text-[var(--text-muted)]">{s.phone}</div>
                      )}
                    </div>

                    {/* Status */}
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === "active"
                        ? "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]"
                        : "bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)] text-[var(--text-muted)]"
                    }`}>
                      {s.status === "active" ? (isEn ? "Active" : "نشط") : s.status}
                    </span>

                    {/* Transfer Button */}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--primary)]"
                        onClick={() => setTransferring({ id: s.id, name: s.full_name })}
                      >
                        📦 {isEn ? "Transfer" : "نقل"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Transfer Modal */}
      <ClassTransferModal
        show={!!transferring || bulkTransfer}
        studentCount={bulkTransfer ? selectedIds.size : 1}
        studentName={transferring?.name}
        classes={classes}
        sections={sections}
        loading={transferLoading}
        onConfirm={doTransfer}
        onClose={() => {
          setTransferring(null);
          setBulkTransfer(false);
        }}
        locale={locale}
      />
    </div>
  );
}
