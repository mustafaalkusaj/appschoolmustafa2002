"use client";

import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/brand/brand-utils";
import { DAYS, PERIODS, type Teacher, type ClassItem } from "../_types";

interface ScheduleSectionProps {
  teachers: Teacher[];
  classes: ClassItem[];
  scheduleGrade: string;
  scheduleSection: string;
  scheduleGrid: Record<string, string>;
  saving: boolean;
  onGradeChange: (grade: string) => void;
  onSectionChange: (section: string) => void;
  onFetchSchedule: (grade: string, section: string) => void;
  onGridChange: (grid: Record<string, string>) => void;
  onSave: () => void;
}

export function ScheduleSection({
  teachers,
  classes,
  scheduleGrade,
  scheduleSection,
  scheduleGrid,
  saving,
  onGradeChange,
  onSectionChange,
  onFetchSchedule,
  onGridChange,
  onSave,
}: ScheduleSectionProps) {
  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade))) as string[];
  const sectionOptions = (grade: string) =>
    classes.filter((c) => c.grade === grade).map((c) => c.section);

  const activeTeachers = teachers.filter((t) => t.status === "active");

  return (
    <div className="space-y-6">
      {/* Grade and Section Selectors */}
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={scheduleGrade}
          onChange={(e) => {
            onGradeChange(e.target.value);
            onSectionChange("");
          }}
          className="min-w-[160px]"
        >
          <option value="">اختر الصف...</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </Select>

        <Select
          value={scheduleSection}
          onChange={(e) => {
            onSectionChange(e.target.value);
            if (scheduleGrade && e.target.value) {
              onFetchSchedule(scheduleGrade, e.target.value);
            }
          }}
          className="min-w-[160px]"
        >
          <option value="">اختر الشعبة...</option>
          {sectionOptions(scheduleGrade).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>

        {scheduleGrade && scheduleSection && (
          <Button onClick={onSave} loading={saving} disabled={saving}>
            <AppIcon token="💾" size={14} />
            حفظ الجدول
          </Button>
        )}
      </div>

      {/* Schedule Grid */}
      {scheduleGrade && scheduleSection ? (
        ["morning", "afternoon"].map((sessionType) => (
          <div key={sessionType} className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-4 py-2 rounded-lg">
              <AppIcon token={sessionType === "morning" ? "🌅" : "🌞"} size={14} />
              {sessionType === "morning" ? "الدوام الصباحي" : "الدوام الظهري"}
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]">
                    <th className="px-3 py-3 text-start text-xs font-bold uppercase tracking-wider text-[var(--primary)] border border-[var(--border)]">
                      اليوم / الدرس
                    </th>
                    {PERIODS.map((p) => (
                      <th key={p} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--primary)] border border-[var(--border)]">
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td className="px-3 py-2 text-sm font-bold text-center bg-[var(--surface-soft)] border border-[var(--border)]">
                        {day}
                      </td>
                      {PERIODS.map((p) => (
                        <td key={p} className="border border-[var(--border)]">
                          <select
                            value={scheduleGrid[`${day}-${p}-${sessionType}`] || ""}
                            onChange={(e) =>
                              onGridChange({
                                ...scheduleGrid,
                                [`${day}-${p}-${sessionType}`]: e.target.value,
                              })
                            }
                            className={cn(
                              "w-full px-2 py-2 text-sm",
                              "bg-[var(--card-bg)]",
                              "border-0",
                              "focus:ring-2 focus:ring-[var(--primary)]/30",
                              "outline-none"
                            )}
                          >
                            <option value="">(فراغ)</option>
                            {activeTeachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name.split(" ")[0]}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          title="اختر الصف والشعبة"
          description="اختر الصف والشعبة لعرض الجدول الأسبوعي"
        />
      )}
    </div>
  );
}
