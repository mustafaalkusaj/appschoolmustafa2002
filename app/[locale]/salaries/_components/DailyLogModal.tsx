"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/brand/brand-utils";
import { PERIODS, type Teacher, type ClassItem, type LecturePrice } from "../_types";

interface DailyLogModalProps {
  show: boolean;
  teachers: Teacher[];
  classes: ClassItem[];
  lecturePrices: LecturePrice[];
  dailyTeacher: string;
  dailyDate: string;
  dailyGrades: string[];
  dailyPeriods: string[];
  saving: boolean;
  onClose: () => void;
  onTeacherChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onGradesChange: (grades: string[]) => void;
  onPeriodsChange: (periods: string[]) => void;
  onSave: () => void;
}

export function DailyLogModal({
  show,
  teachers,
  classes,
  lecturePrices: _lecturePrices,
  dailyTeacher,
  dailyDate,
  dailyGrades,
  dailyPeriods,
  saving,
  onClose,
  onTeacherChange,
  onDateChange,
  onGradesChange,
  onPeriodsChange,
  onSave,
}: DailyLogModalProps) {
  if (!show) return null;

  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];
  const sectionOptions = (grade: string) =>
    classes.filter((c) => c.grade === grade).map((c) => c.section);

  const activeTeachers = teachers.filter((t) => t.status === "active");

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <Modal open={show} onClose={onClose} size="lg">
      <ModalHeader title="السجل اليومي" onClose={onClose} />
      <ModalBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="الأستاذ">
            <Select
              value={dailyTeacher}
              onChange={(e) => onTeacherChange(e.target.value)}
            >
              <option value="">اختر الأستاذ...</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="التاريخ">
            <Input
              type="date"
              value={dailyDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="الصفوف (يمكن اختيار أكثر من صف)">
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)]">
            {gradeOptions.map((g) =>
              sectionOptions(g).map((sec) => (
                <button
                  key={`${g}||${sec}`}
                  type="button"
                  onClick={() => onGradesChange(toggleArr(dailyGrades, `${g}||${sec}`))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
                    dailyGrades.includes(`${g}||${sec}`)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border)]"
                  )}
                >
                  {g} ({sec})
                </button>
              ))
            )}
          </div>
        </FormField>

        <FormField label="الحصص">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-bold text-[var(--success)] mb-2">الصباحي</div>
              <div className="grid grid-cols-6 gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={`${p}-morning`}
                    type="button"
                    onClick={() => onPeriodsChange(toggleArr(dailyPeriods, `${p}-morning`))}
                    className={cn(
                      "w-full aspect-square rounded-lg text-sm font-bold transition-colors",
                      "flex flex-col items-center justify-center gap-0.5",
                      dailyPeriods.includes(`${p}-morning`)
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-soft)] text-[var(--text-primary)] border border-[var(--border)]"
                    )}
                  >
                    {p}
                    <span className="text-[10px] opacity-70">درس</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-[var(--warning)] mb-2">الظهري</div>
              <div className="grid grid-cols-6 gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={`${p}-afternoon`}
                    type="button"
                    onClick={() => onPeriodsChange(toggleArr(dailyPeriods, `${p}-afternoon`))}
                    className={cn(
                      "w-full aspect-square rounded-lg text-sm font-bold transition-colors",
                      "flex flex-col items-center justify-center gap-0.5",
                      dailyPeriods.includes(`${p}-afternoon`)
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-soft)] text-[var(--text-primary)] border border-[var(--border)]"
                    )}
                  >
                    {p}
                    <span className="text-[10px] opacity-70">(ظ)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FormField>

        {dailyTeacher && dailyGrades.length > 0 && dailyPeriods.length > 0 && (
          <div className="p-3 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-sm font-semibold text-[var(--primary)]">
            سيتم تسجيل: {dailyGrades.length} صف × {dailyPeriods.length} حصة ={" "}
            <strong>{dailyGrades.length * dailyPeriods.length} محاضرة</strong>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          loading={saving}
          disabled={!dailyTeacher || dailyGrades.length === 0 || dailyPeriods.length === 0}
          onClick={onSave}
        >
          {saving ? "جارٍ الحفظ..." : "تسجيل المحاضرات"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
      </ModalFooter>
    </Modal>
  );
}
