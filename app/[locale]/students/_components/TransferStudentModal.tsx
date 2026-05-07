"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { StudentWithFees, ClassFee } from "../_types";

type TransferType = "class" | "section" | "transferred";

interface TransferStudentModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canEditStudents: boolean;
  selectedStudent: StudentWithFees | null;
  classFees: ClassFee[];
  onConfirm: (transferType: TransferType, targetClass?: string, targetSection?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TransferStudentModal({
  show,
  isReadOnlyView,
  canEditStudents,
  selectedStudent,
  classFees,
  onConfirm,
  onCancel,
  loading = false,
}: TransferStudentModalProps) {
  const t = useTranslations("students.modals.transfer");
  const [transferType, setTransferType] = useState<TransferType | null>(null);
  const [targetClass, setTargetClass] = useState("");
  const [targetSection, setTargetSection] = useState("");

  if (isReadOnlyView || !canEditStudents || !selectedStudent) return null;

  const classes = Array.from(
    new Set(classFees.map((item) => item.class_name?.trim()).filter(Boolean))
  ) as string[];

  const handleConfirm = () => {
    if (transferType === "class" && !targetClass) return;
    if (transferType === "section" && !targetSection) return;

    onConfirm(
      transferType || "transferred",
      transferType === "class" ? targetClass : undefined,
      transferType === "class" || transferType === "section" ? targetSection : undefined
    );
  };

  const isConfirmDisabled =
    !transferType ||
    loading ||
    (transferType === "class" && !targetClass) ||
    (transferType === "section" && !targetSection);

  return (
    <Modal open={show} onClose={onCancel} size="md">
      <ModalHeader title={t("title")} onClose={onCancel} />

      <ModalBody>
        <div className="space-y-4">
          {/* Student Info */}
          <div className="bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t("studentName")}</span>
                <span className="font-semibold">{selectedStudent.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">{t("currentClass")}</span>
                <span className="font-semibold">{selectedStudent.class_name}</span>
              </div>
              {selectedStudent.section && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{t("currentSection")}</span>
                  <span className="font-semibold">{selectedStudent.section}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transfer Type Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">{t("selectType")}</h3>

            {/* Option 1: Transfer Class */}
            <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]">
              <input
                type="radio"
                name="transferType"
                value="class"
                checked={transferType === "class"}
                onChange={(e) => {
                  setTransferType(e.target.value as TransferType);
                  setTargetClass("");
                  setTargetSection("");
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">{t("classTransfer.title")}</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {t("classTransfer.description")}
                </div>
              </div>
            </label>

            {/* Class and Section Inputs for Option 1 */}
            {transferType === "class" && (
              <div className="space-y-2 mr-8">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("classTransfer.newClass")}</label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                  >
                    <option value="">{t("classTransfer.selectClass")}</option>
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("classTransfer.newSection")}</label>
                  <input
                    type="text"
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    placeholder={t("classTransfer.sectionPlaceholder")}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
            )}

            {/* Option 2: Transfer Section */}
            <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]">
              <input
                type="radio"
                name="transferType"
                value="section"
                checked={transferType === "section"}
                onChange={(e) => {
                  setTransferType(e.target.value as TransferType);
                  setTargetClass("");
                  setTargetSection("");
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">{t("sectionTransfer.title")}</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {t("sectionTransfer.description")}
                </div>
              </div>
            </label>

            {/* Section Input for Option 2 */}
            {transferType === "section" && (
              <div className="mr-8">
                <label className="block text-sm font-medium mb-1">{t("sectionTransfer.newSection")}</label>
                <input
                  type="text"
                  value={targetSection}
                  onChange={(e) => setTargetSection(e.target.value)}
                  placeholder={t("sectionTransfer.sectionPlaceholder")}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)]"
                />
              </div>
            )}

            {/* Option 3: Move to Transferred */}
            <label className="flex items-start gap-3 p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[color-mix(in_srgb,var(--primary)_3%,transparent)]">
              <input
                type="radio"
                name="transferType"
                value="transferred"
                checked={transferType === "transferred"}
                onChange={(e) => {
                  setTransferType(e.target.value as TransferType);
                  setTargetClass("");
                  setTargetSection("");
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-semibold">{t("markTransferred.title")}</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {t("markTransferred.description")}
                </div>
              </div>
            </label>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          loading={loading}
        >
          {t("confirm")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t("cancel")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
