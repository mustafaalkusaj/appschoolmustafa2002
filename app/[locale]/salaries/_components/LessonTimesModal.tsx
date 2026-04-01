"use client";

import { AppIcon } from "@/components/AppIcon";
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
  if (!show) return null;

  return (
    <div className="overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-sm">
        <div className="mh">
          <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
            <AppIcon token="⏰" size={16} />
            توقيتات الدروس
          </div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        {["morning", "afternoon"].map((sessionType) => (
          <div key={sessionType}>
            <div
              className="session-title"
              style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
            >
              <AppIcon token={sessionType === "morning" ? "🌅" : "🌞"} size={14} />
              {sessionType === "morning" ? "الدوام الصباحي" : "الدوام الظهري"}
            </div>
            {lessonTimes
              .filter((t) => t.session_type === sessionType)
              .map((t) => (
                <div key={t.id} className="times-row">
                  <span className="times-lbl">الدرس {t.period}</span>
                  <input
                    type="time"
                    className="time-input"
                    value={timeEdits[`${t.period}-${t.session_type}-start`] || ""}
                    onChange={(e) =>
                      onTimeChange(`${t.period}-${t.session_type}-start`, e.target.value)
                    }
                  />
                  <span style={{ color: "var(--gray)" }}>-</span>
                  <input
                    type="time"
                    className="time-input"
                    value={timeEdits[`${t.period}-${t.session_type}-end`] || ""}
                    onChange={(e) =>
                      onTimeChange(`${t.period}-${t.session_type}-end`, e.target.value)
                    }
                  />
                </div>
              ))}
          </div>
        ))}
        <div className="fa">
          <button className="bs" onClick={onSave}>حفظ توقيتات الدروس</button>
          <button className="bc" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
