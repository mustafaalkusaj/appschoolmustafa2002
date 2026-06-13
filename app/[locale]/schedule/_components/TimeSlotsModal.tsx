"use client";

import { useState } from "react";
import { cn } from "@/lib/brand/brand-utils";
import {
  X,
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  Clock,
  Settings,
} from "@/lib/icons";
import { TimePicker } from "@/components/ui/time-picker";
import { useTimeSlotsSettings } from "../_hooks/useTimeSlotsSettings";
import type { TimeSlot } from "../_hooks/useTimeSlotsSettings";
import { WorkingDaysToggle } from "./WorkingDaysToggle";

type Props = {
  open: boolean;
  onClose: () => void;
  schoolId: string;
};

type AutoFillForm = {
  startTime: string;
  periodDuration: string;
  breakDuration: string;
};

type ActiveTab = "slots" | "days";

export function TimeSlotsModal({ open, onClose, schoolId }: Props) {
  const settings = useTimeSlotsSettings(schoolId);
  const [activeTab, setActiveTab] = useState<ActiveTab>("slots");
  const [showAutoFill, setShowAutoFill] = useState(false);
  const [autoFillForm, setAutoFillForm] = useState<AutoFillForm>({
    startTime: "07:30",
    periodDuration: "45",
    breakDuration: "15",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!open) return null;

  function handleSlotFieldChange(id: string, field: keyof TimeSlot, value: string | number | boolean) {
    settings.updateSlot(id, { [field]: value } as Partial<TimeSlot>);

    // Auto-calculate end_time when start_time or duration_minutes changes
    if (field === "start_time" || field === "duration_minutes") {
      const slot = settings.slots.find((s) => s.id === id);
      if (!slot) return;

      const start = field === "start_time" ? String(value) : slot.start_time;
      const duration = field === "duration_minutes" ? Number(value) : slot.duration_minutes;

      if (/^\d{2}:\d{2}$/.test(start) && duration > 0) {
        const [h, m] = start.split(":").map(Number);
        const endMinutes = h * 60 + m + duration;
        const endH = Math.floor(endMinutes / 60) % 24;
        const endM = endMinutes % 60;
        const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
        settings.updateSlot(id, { end_time: endTime });
      }
    }
  }

  function moveSlot(index: number, direction: "up" | "down") {
    const newSlots = [...settings.slots];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSlots.length) return;
    [newSlots[index], newSlots[swapIndex]] = [newSlots[swapIndex], newSlots[index]];
    void settings.reorderSlots(newSlots);
  }

  async function handleSaveSlots() {
    await settings.saveSlots();
    if (!settings.error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  }

  function handleAutoFill() {
    const periodDur = parseInt(autoFillForm.periodDuration, 10);
    const breakDur = parseInt(autoFillForm.breakDuration, 10);
    if (!autoFillForm.startTime || isNaN(periodDur) || periodDur <= 0) return;
    settings.autoFill(autoFillForm.startTime, periodDur, isNaN(breakDur) ? 15 : breakDur);
    setShowAutoFill(false);
  }

  function handleDeleteConfirm(id: string) {
    setConfirmDeleteId(id);
  }

  async function handleDeleteExecute() {
    if (!confirmDeleteId) return;
    await settings.deleteSlot(confirmDeleteId);
    setConfirmDeleteId(null);
  }

  const inputCls = cn(
    "h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-strong)]",
    "text-sm text-[var(--text-primary)] px-2 outline-none transition",
    "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10",
  );

  const tabCls = (tab: ActiveTab) =>
    cn(
      "px-4 py-2 text-sm font-bold rounded-lg transition-all",
      activeTab === tab
        ? "bg-[var(--primary)] text-white shadow-sm"
        : "text-[var(--text-muted)] hover:bg-[var(--surface-strong)]",
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-3xl border border-[var(--border)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[var(--primary)]" />
            <h2 className="font-black text-[var(--text-primary)] text-base">إعدادات الجدول</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-lg p-1 hover:bg-[var(--surface-soft)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--border)] shrink-0">
          <button className={tabCls("slots")} onClick={() => setActiveTab("slots")}>
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              أوقات الحصص
            </span>
          </button>
          <button className={tabCls("days")} onClick={() => setActiveTab("days")}>
            أيام الدوام
          </button>
        </div>

        {/* Error banner */}
        {settings.error && (
          <div className="mx-6 mt-3 rounded-xl border border-[var(--danger)]/30 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-2 text-xs font-bold text-[var(--danger)] shrink-0">
            {settings.error}
          </div>
        )}

        {/* Success banner */}
        {saveSuccess && (
          <div className="mx-6 mt-3 rounded-xl border border-[var(--success)]/30 bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-4 py-2 text-xs font-bold text-[var(--success)] shrink-0">
            تم حفظ الإعدادات بنجاح
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">

          {/* ── Tab: أوقات الحصص ── */}
          {activeTab === "slots" && (
            <div className="space-y-4">

              {/* Auto-fill toggle */}
              <div className="rounded-xl border border-[var(--warning)]/30 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-[var(--warning)]"
                  onClick={() => setShowAutoFill((v) => !v)}
                >
                  <span>⚡ تعبئة تلقائية للأوقات</span>
                  {showAutoFill ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {showAutoFill && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[var(--warning)]/25 pt-3">
                    <p className="text-xs text-[var(--warning)]">
                      أدخل وقت البداية ومدة كل حصة واستراحة — سيتم احتساب الأوقات تلقائياً لجميع الحصص والاستراحات.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--warning)]">
                          وقت بداية الحصة الأولى
                        </label>
                        <TimePicker
                          value={autoFillForm.startTime}
                          onChange={(v) => setAutoFillForm((f) => ({ ...f, startTime: v }))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--warning)]">
                          مدة الحصة (دقيقة)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={120}
                          value={autoFillForm.periodDuration}
                          onChange={(e) => setAutoFillForm((f) => ({ ...f, periodDuration: e.target.value }))}
                          className={cn(inputCls, "w-full")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--warning)]">
                          مدة الاستراحة (دقيقة)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={autoFillForm.breakDuration}
                          onChange={(e) => setAutoFillForm((f) => ({ ...f, breakDuration: e.target.value }))}
                          className={cn(inputCls, "w-full")}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAutoFill}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                    >
                      تعبئة الكل
                    </button>
                  </div>
                )}
              </div>

              {/* Slot rows */}
              {settings.loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[32px_32px_60px_1fr_90px_90px_64px_32px] gap-2 px-1">
                    <div />
                    <div />
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">النوع</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">الاسم</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">البداية</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">النهاية</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">المدة (د)</span>
                    <div />
                  </div>

                  {settings.slots.map((slot, idx) => (
                    <div
                      key={slot.id}
                      className={cn(
                        "grid grid-cols-[32px_32px_60px_1fr_90px_90px_64px_32px] gap-2 items-center p-2 rounded-xl border transition-colors",
                        slot.slot_type === "break"
                          ? "border-[var(--warning)]/25 bg-[color-mix(in_srgb,var(--warning)_6%,transparent)]"
                          : "border-[var(--border)] bg-[var(--surface-strong)]",
                      )}
                    >
                      {/* Order buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          disabled={idx === 0 || settings.saving}
                          onClick={() => moveSlot(idx, "up")}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          disabled={idx === settings.slots.length - 1 || settings.saving}
                          onClick={() => moveSlot(idx, "down")}
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>

                      {/* Slot number */}
                      <span className="text-[10px] font-black text-[var(--text-muted)] text-center">
                        {idx + 1}
                      </span>

                      {/* Type badge */}
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full text-center",
                          slot.slot_type === "break"
                            ? "bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)]"
                            : "bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]",
                        )}
                      >
                        {slot.slot_type === "break" ? "استراحة" : "حصة"}
                      </span>

                      {/* Name input */}
                      <input
                        type="text"
                        value={slot.name_ar}
                        onChange={(e) => handleSlotFieldChange(slot.id, "name_ar", e.target.value)}
                        className={cn(inputCls, "w-full")}
                        placeholder="اسم الحصة..."
                      />

                      {/* Start time */}
                      <TimePicker
                        value={slot.start_time}
                        onChange={(v) => handleSlotFieldChange(slot.id, "start_time", v)}
                        className="w-full"
                      />

                      {/* End time (auto-calculated, still editable) */}
                      <TimePicker
                        value={slot.end_time}
                        onChange={(v) => handleSlotFieldChange(slot.id, "end_time", v)}
                        className="w-full"
                      />

                      {/* Duration */}
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={slot.duration_minutes}
                        onChange={(e) =>
                          handleSlotFieldChange(slot.id, "duration_minutes", parseInt(e.target.value, 10) || 0)
                        }
                        className={cn(inputCls, "w-full")}
                      />

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteConfirm(slot.id)}
                        disabled={settings.saving}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {settings.slots.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                      لا توجد حصص. أضف حصة أو استراحة.
                    </div>
                  )}
                </div>
              )}

              {/* Add buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void settings.addSlot("period")}
                  disabled={settings.saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-[var(--primary)] text-xs font-bold hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] transition-colors disabled:opacity-50"
                >
                  <Plus size={13} />
                  إضافة حصة
                </button>
                <button
                  onClick={() => void settings.addSlot("break")}
                  disabled={settings.saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--warning)]/30 bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] text-[var(--warning)] text-xs font-bold hover:bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] transition-colors disabled:opacity-50"
                >
                  <Plus size={13} />
                  إضافة استراحة
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: أيام الدوام ── */}
          {activeTab === "days" && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                فعّل أو أوقف الأيام التي تعمل فيها المدرسة. انقر على اليوم لتغيير حالته ثم احفظ.
              </p>
              <div className="flex flex-wrap gap-3">
                {[...settings.workingDays]
                  .sort((a, b) => a.day_order - b.day_order)
                  .map((day) => (
                    <button
                      key={day.day_key}
                      onClick={() => settings.toggleDay(day.day_key)}
                      disabled={settings.saving}
                      className={cn(
                        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-2",
                        day.is_active
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/20"
                          : "bg-[var(--surface-strong)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--primary)]/40",
                      )}
                    >
                      {day.name_ar}
                    </button>
                  ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                الأيام النشطة: {settings.workingDays.filter((d) => d.is_active).map((d) => d.name_ar).join("، ") || "لا يوجد"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors border border-[var(--border)]"
          >
            إغلاق
          </button>
          <button
            onClick={activeTab === "slots" ? () => void handleSaveSlots() : () => void settings.saveWorkingDays()}
            disabled={settings.saving}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all",
              settings.saving
                ? "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed opacity-60"
                : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] active:scale-95",
            )}
          >
            <Save size={15} />
            {settings.saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border)] p-6 max-w-xs w-full space-y-4">
            <h3 className="font-black text-[var(--text-primary)]">تأكيد الحذف</h3>
            <p className="text-sm text-[var(--text-muted)]">
              هل أنت متأكد من حذف هذه الحصة؟ لا يمكن التراجع.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleDeleteExecute()}
                disabled={settings.saving}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {settings.saving ? "جارٍ الحذف..." : "حذف"}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
