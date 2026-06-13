"use client";

import { AppIcon } from "@/components/AppIcon";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { type LessonTime } from "../_types";

interface LessonTimesModalProps {
  show: boolean;
  lessonTimes: LessonTime[];
  timeEdits: Record<string, string>;
  onClose: () => void;
  onTimeChange: (key: string, value: string) => void;
  onSave: () => void;
}

export function LessonTimesModal({
  show,
  lessonTimes,
  timeEdits,
  onClose,
  onTimeChange,
  onSave,
}: LessonTimesModalProps) {
  return (
    <Modal open={show} onClose={onClose} size="sm">
      <ModalHeader
        title="توقيتات الدروس"
        onClose={onClose}
      />
      <ModalBody className="space-y-6">
        {["morning", "afternoon"].map((sessionType) => (
          <div key={sessionType} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-2 rounded-lg">
              <AppIcon token={sessionType === "morning" ? "🌅" : "🌞"} size={14} />
              {sessionType === "morning" ? "الدوام الصباحي" : "الدوام الظهري"}
            </div>
            <div className="space-y-2">
              {lessonTimes
                .filter((t) => t.session_type === sessionType)
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <span className="text-sm font-semibold min-w-[60px] text-[var(--text-primary)]">
                      الدرس {t.period}
                    </span>
                    <TimePicker
                      value={timeEdits[`${t.period}-${t.session_type}-start`] || ""}
                      onChange={(v) =>
                        onTimeChange(`${t.period}-${t.session_type}-start`, v)
                      }
                      className="w-32"
                    />
                    <span className="text-[var(--text-muted)]">-</span>
                    <TimePicker
                      value={timeEdits[`${t.period}-${t.session_type}-end`] || ""}
                      onChange={(v) =>
                        onTimeChange(`${t.period}-${t.session_type}-end`, v)
                      }
                      className="w-32"
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onSave}>حفظ توقيتات الدروس</Button>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
      </ModalFooter>
    </Modal>
  );
}
