"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ClassItem, ClassForm } from "../../dashboard/_components/types";

interface ClassFormModalProps {
  show: boolean;
  editingClass: ClassItem | null;
  classForm: ClassForm;
  setClassForm: (form: ClassForm) => void;
  saving: boolean;
  error: string;
  onSave: () => Promise<void>;
  onClose: () => void;
  locale: "ar" | "en";
}

export function ClassFormModal({
  show,
  editingClass,
  classForm,
  setClassForm,
  saving,
  error,
  onSave,
  onClose,
  locale,
}: ClassFormModalProps) {
  const isEn = locale === "en";

  return (
    <Modal open={show} onClose={onClose} size="md">
      <ModalHeader
        title={editingClass
          ? (isEn ? "Edit Class" : "تعديل الصف")
          : (isEn ? "Add New Class" : "إضافة صف جديد")}
        onClose={onClose}
      />
      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] text-sm font-semibold">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <FormField
            label={isEn ? "Class Name" : "اسم الصف"}
            htmlFor="class-name"
            required
          >
            <Input
              id="class-name"
              required
              autoFocus
              placeholder={isEn ? "e.g. Grade 5" : "مثال: الصف الخامس"}
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            />
          </FormField>
          {editingClass && (
            <FormField
              label={isEn ? "Sections" : "الشعب"}
              htmlFor="class-sections"
              helpText={isEn ? "Optional: one section per line (e.g. A, B, C)" : "اختياري: كل شعبة في سطر — مثال: أ، ب، ج"}
            >
              <textarea
                id="class-sections"
                className="w-full min-h-[80px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                rows={3}
                value={classForm.sections.join("\n")}
                onChange={(e) => setClassForm({ ...classForm, sections: e.target.value.split("\n") })}
                placeholder={isEn ? "Leave empty if no sections\nA\nB\nC" : "اتركه فارغاً إذا ماكو شعب\nأ\nب\nج"}
              />
            </FormField>
          )}

          {!editingClass && (
            <>
              <div className="border-t border-[var(--border)] pt-4 mt-2">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  {isEn ? "Tuition Fee" : "القسط الدراسي"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={isEn ? "Total Fee" : "مبلغ القسط"}
                  htmlFor="class-total-fee"
                >
                  <Input
                    id="class-total-fee"
                    type="number"
                    min="0"
                    placeholder={isEn ? "e.g. 500000" : "مثال: 500000"}
                    value={classForm.total_fee ?? ""}
                    onChange={(e) => setClassForm({ ...classForm, total_fee: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={isEn ? "Installments" : "عدد الأقساط"}
                  htmlFor="class-installments"
                >
                  <Input
                    id="class-installments"
                    type="number"
                    min="1"
                    max="12"
                    placeholder="4"
                    value={classForm.installments ?? ""}
                    onChange={(e) => setClassForm({ ...classForm, installments: e.target.value })}
                  />
                </FormField>
              </div>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {isEn ? "Cancel" : "إلغاء"}
        </Button>
        <Button variant="primary" onClick={() => void onSave()} loading={saving}>
          {saving
            ? (isEn ? "Saving..." : "جارٍ الحفظ...")
            : editingClass
              ? (isEn ? "Save Changes" : "حفظ التعديلات")
              : (isEn ? "Add Class" : "إضافة صف")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
