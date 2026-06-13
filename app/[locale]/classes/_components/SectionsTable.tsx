"use client";

import { Button } from "@/components/ui/button";
import type { ClassItem, SectionItem } from "../../dashboard/_components/types";

interface SectionsTableProps {
  sections: SectionItem[];
  classes: ClassItem[];
  canManage: boolean;
  confirmDeleteId: string | null;
  onEdit: (sec: SectionItem) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  locale: "ar" | "en";
}

export function SectionsTable({
  sections,
  classes,
  canManage,
  confirmDeleteId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  locale,
}: SectionsTableProps) {
  const isEn = locale === "en";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-soft)] text-[var(--text-muted)]">
            <th className="px-4 py-3 text-start font-bold">#</th>
            <th className="px-4 py-3 text-start font-bold">{isEn ? "Section Name" : "اسم الشعبة"}</th>
            <th className="px-4 py-3 text-start font-bold">{isEn ? "Class" : "الصف"}</th>
            <th className="px-4 py-3 text-center font-bold">{isEn ? "Students" : "الطلاب"}</th>
            {canManage && (
              <th className="px-4 py-3 text-center font-bold">{isEn ? "Actions" : "الإجراءات"}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, idx) => {
            const cls = classes.find((c) => c.id === sec.class_id);
            return (
              <tr key={sec.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-soft)] transition-colors">
                <td className="px-4 py-3 text-[var(--text-muted)]">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold">{sec.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                    {cls?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] font-bold text-sm">
                    {sec.studentCount ?? 0}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(sec)}>
                        {isEn ? "Edit" : "تعديل"}
                      </Button>
                      {confirmDeleteId === sec.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[var(--danger)]">{isEn ? "Sure?" : "تأكيد؟"}</span>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(sec.id)}>
                            {isEn ? "Yes" : "نعم"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                            {isEn ? "No" : "لا"}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => onConfirmDelete(sec.id)}>
                          {isEn ? "Delete" : "حذف"}
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
