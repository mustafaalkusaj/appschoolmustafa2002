"use client";

import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/brand/brand-utils";
import type { Subject, JobTitle, ClassItem } from "../_types";

interface ManagerModalsProps {
  // Subjects
  showSubjectsMgr: boolean;
  subjectsList: Subject[];
  newSubject: string;
  onCloseSubjects: () => void;
  onNewSubjectChange: (val: string) => void;
  onAddSubject: () => void;
  onDeleteSubject: (id: string) => void;
  // Job Titles
  showJobTitlesMgr: boolean;
  jobTitlesList: JobTitle[];
  newJobTitle: string;
  onCloseJobTitles: () => void;
  onNewJobTitleChange: (val: string) => void;
  onAddJobTitle: () => void;
  onDeleteJobTitle: (id: string) => void;
  // Classes
  showClassesMgr: boolean;
  classes: ClassItem[];
  newGrade: string;
  newSection: string;
  newSectionGrade: string;
  onCloseClasses: () => void;
  onNewGradeChange: (val: string) => void;
  onNewSectionChange: (val: string) => void;
  onNewSectionGradeChange: (val: string) => void;
  onAddClass: () => void;
  onAddSection: () => void;
  onDeleteClass: (id: string) => void;
}

export function ManagerModals({
  showSubjectsMgr,
  subjectsList,
  newSubject,
  onCloseSubjects,
  onNewSubjectChange,
  onAddSubject,
  onDeleteSubject,
  showJobTitlesMgr,
  jobTitlesList,
  newJobTitle,
  onCloseJobTitles,
  onNewJobTitleChange,
  onAddJobTitle,
  onDeleteJobTitle,
  showClassesMgr,
  classes,
  newGrade,
  newSection,
  newSectionGrade,
  onCloseClasses,
  onNewGradeChange,
  onNewSectionChange,
  onNewSectionGradeChange,
  onAddClass,
  onAddSection,
  onDeleteClass,
}: ManagerModalsProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];

  return (
    <>
      {/* Subjects Manager Modal */}
      {showSubjectsMgr && (
        <Modal open={showSubjectsMgr} onClose={onCloseSubjects} size="sm">
          <ModalHeader title="المواد الدراسية" onClose={onCloseSubjects} />
          <ModalBody className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="اسم المادة"
                value={newSubject}
                onChange={(e) => onNewSubjectChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddSubject()}
                className="flex-1"
              />
              <Button onClick={onAddSubject}>+ إضافة</Button>
            </div>
            <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 max-h-80 overflow-y-auto space-y-2">
              {subjectsList.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
                  <button
                    onClick={() => onDeleteSubject(s.id)}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center",
                      "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]",
                      "text-[var(--danger)]",
                      "hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)]",
                      "transition-colors"
                    )}
                  >
                    <AppIcon token="🗑️" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onCloseSubjects}>إغلاق</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Job Titles Manager Modal */}
      {showJobTitlesMgr && (
        <Modal open={showJobTitlesMgr} onClose={onCloseJobTitles} size="sm">
          <ModalHeader title="المسميات الوظيفية" onClose={onCloseJobTitles} />
          <ModalBody className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="اسم المسمى"
                value={newJobTitle}
                onChange={(e) => onNewJobTitleChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddJobTitle()}
                className="flex-1"
              />
              <Button onClick={onAddJobTitle}>+ إضافة</Button>
            </div>
            <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 max-h-80 overflow-y-auto space-y-2">
              {jobTitlesList.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{j.name}</span>
                  <button
                    onClick={() => onDeleteJobTitle(j.id)}
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center",
                      "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]",
                      "text-[var(--danger)]",
                      "hover:bg-[color-mix(in_srgb,var(--danger)_20%,transparent)]",
                      "transition-colors"
                    )}
                  >
                    <AppIcon token="🗑️" size={12} />
                  </button>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onCloseJobTitles}>إغلاق</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Classes Manager Modal */}
      {showClassesMgr && (
        <Modal open={showClassesMgr} onClose={onCloseClasses} size="lg">
          <ModalHeader title="إدارة الصفوف والشعب" onClose={onCloseClasses} />
          <ModalBody className="space-y-6">
            {/* Add Grade / Section Forms */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Add Grade Card */}
              <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 space-y-4">
                <div className="text-sm font-bold text-[var(--primary)]">إضافة صف جديد</div>
                <Input
                  placeholder="اسم الصف"
                  value={newGrade}
                  onChange={(e) => onNewGradeChange(e.target.value)}
                />
                <Button className="w-full" onClick={onAddClass}>إضافة صف</Button>
              </div>

              {/* Add Section Card */}
              <div className="rounded-xl bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] p-4 space-y-4">
                <div className="text-sm font-bold text-[var(--success)]">إضافة شعبة</div>
                <Select
                  value={newSectionGrade}
                  onChange={(e) => onNewSectionGradeChange(e.target.value)}
                >
                  <option value="">اختر الصف...</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </Select>
                <Input
                  placeholder="اسم الشعبة"
                  value={newSection}
                  onChange={(e) => onNewSectionChange(e.target.value)}
                />
                <Button variant="primary" className="w-full" onClick={onAddSection}>
                  إضافة شعبة
                </Button>
              </div>
            </div>

            {/* Classes List */}
            <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4 max-h-72 overflow-y-auto space-y-4">
              {gradeOptions.map((grade) => (
                <div key={grade} className="pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
                  <div className="text-sm font-bold text-[var(--text-primary)] mb-2">{grade}</div>
                  <div className="flex flex-wrap gap-2">
                    {classes
                      .filter((c) => c.grade === grade)
                      .map((c) => (
                        <Badge
                          key={c.id}
                          variant="primary"
                          className="gap-1.5"
                        >
                          {c.section}
                          <button
                            onClick={() => onDeleteClass(c.id)}
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center",
                              "bg-[var(--danger)] text-white",
                              "hover:opacity-80 transition-opacity"
                            )}
                          >
                            <AppIcon token="✕" size={10} />
                          </button>
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={onCloseClasses}>إغلاق</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
