"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ClassItem, SectionItem, SectionForm } from "../../dashboard/_components/types";

interface SectionFormModalProps {
  show: boolean;
  editingSection: SectionItem | null;
  sectionForm: SectionForm;
  setSectionForm: (form: SectionForm) => void;
  classes: ClassItem[];
  saving: boolean;
  error: string;
  onSave: () => Promise<void>;
  onClose: () => void;
  locale: "ar" | "en";
}

export function SectionFormModal({
  show,
  editingSection,
  sectionForm,
  setSectionForm,
  classes,
  saving,
  error,
  onSave,
  onClose,
  locale,
}: SectionFormModalProps) {
  const isEn = locale === "en";

  return (
    <Modal open={show} onClose={onClose} size="md">
      <ModalHeader
        title={editingSection
          ? (isEn ? "Edit Section" : "تعديل الشعبة")
          : (isEn ? "Add New Section" : "إضافة شعبة جديدة")}
        onClose={onClose}
      />
      <ModalBody>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] text-sm font-semibold">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <FormField label={isEn ? "Class" : "الصف"} htmlFor="section-class" required>
            <Select
              id="section-class"
              required
              value={sectionForm.class_id}
              onChange={(e) => setSectionForm({ ...sectionForm, class_id: e.target.value })}
            >
              <option value="">{isEn ? "Select class" : "اختر الصف"}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={isEn ? "Section Name" : "اسم الشعبة"}
            htmlFor="section-name"
            required
          >
            <Input
              id="section-name"
              required
              autoFocus
              placeholder={isEn ? "e.g. A" : "مثال: أ"}
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
            />
          </FormField>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          {isEn ? "Cancel" : "إلغاء"}
        </Button>
        <Button variant="primary" onClick={() => void onSave()} loading={saving}>
          {saving
            ? (isEn ? "Saving..." : "جارٍ الحفظ...")
            : editingSection
              ? (isEn ? "Save Changes" : "حفظ التعديلات")
              : (isEn ? "Add Section" : "إضافة شعبة")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
