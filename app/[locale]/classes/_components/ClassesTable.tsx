"use client";

import { Button } from "@/components/ui/button";
import type { ClassItem, SectionItem } from "../../dashboard/_components/types";

interface ClassesTableProps {
  classes: ClassItem[];
  sections: SectionItem[];
  canManage: boolean;
  confirmDeleteId: string | null;
  selectedClassId: string | null;
  onSelect: (cls: ClassItem) => void;
  onEdit: (cls: ClassItem) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  locale: "ar" | "en";
}

export function ClassesTable({
  classes,
  sections,
  canManage,
  confirmDeleteId,
  selectedClassId,
  onSelect,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  locale,
}: ClassesTableProps) {
  const isEn = locale === "en";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--surface-soft)] text-[var(--text-muted)]">
            <th className="px-4 py-3 text-start font-bold">#</th>
            <th className="px-4 py-3 text-start font-bold">{isEn ? "Class Name" : "اسم الصف"}</th>
            <th className="px-4 py-3 text-start font-bold">{isEn ? "Sections" : "الشعب"}</th>
            <th className="px-4 py-3 text-center font-bold">{isEn ? "Section Count" : "عدد الشعب"}</th>
            <th className="px-4 py-3 text-center font-bold">{isEn ? "Students" : "الطلاب"}</th>
            {canManage && (
              <th className="px-4 py-3 text-center font-bold">{isEn ? "Actions" : "الإجراءات"}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, idx) => {
            const clsSections = sections.filter((s) => s.class_id === cls.id);
            return (
              <tr
                key={cls.id}
                className={`border-b border-[var(--border)] transition-colors cursor-pointer ${selectedClassId === cls.id ? "bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]" : "hover:bg-[var(--surface-soft)]"}`}
                onClick={() => onSelect(cls)}
              >
                <td className="px-4 py-3 text-[var(--text-muted)]">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold">{cls.name}</td>
                <td className="px-4 py-3">
                  {clsSections.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {clsSections.map((sec) => (
                        <span
                          key={sec.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                        >
                          {sec.name}
                          {(sec.studentCount ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-[var(--primary)] text-white text-[10px] font-bold px-1">
                              {sec.studentCount}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">
                      {isEn ? "No sections" : "بدون شعب"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] font-bold text-sm">
                    {clsSections.length}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] font-bold text-sm">
                    {cls.studentCount ?? 0}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(cls)}>
                        {isEn ? "Edit" : "تعديل"}
                      </Button>
                      {confirmDeleteId === cls.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[var(--danger)]">{isEn ? "Sure?" : "تأكيد؟"}</span>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(cls.id)}>
                            {isEn ? "Yes" : "نعم"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                            {isEn ? "No" : "لا"}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => onConfirmDelete(cls.id)}>
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
