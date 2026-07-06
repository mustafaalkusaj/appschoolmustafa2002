"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/brand/brand-utils";
import { X, Settings, Clock, Clock3 } from "@/lib/icons";
import { motion, AnimatePresence } from "framer-motion";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

type TimeSlot = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  slot_type: "period" | "break";
  slot_order: number;
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  schoolId: string;
};

const DEFAULT_SLOTS: TimeSlot[] = [
  { id: "slot-1", name_ar: "الحصة الأولى", start_time: "07:30", end_time: "08:15", slot_type: "period", slot_order: 1, is_active: true },
  { id: "slot-2", name_ar: "الحصة الثانية", start_time: "08:15", end_time: "09:00", slot_type: "period", slot_order: 2, is_active: true },
  { id: "slot-3", name_ar: "استراحة", start_time: "09:00", end_time: "09:15", slot_type: "break", slot_order: 3, is_active: true },
  { id: "slot-4", name_ar: "الحصة الثالثة", start_time: "09:15", end_time: "10:00", slot_type: "period", slot_order: 4, is_active: true },
  { id: "slot-5", name_ar: "الحصة الرابعة", start_time: "10:00", end_time: "10:45", slot_type: "period", slot_order: 5, is_active: true },
  { id: "slot-6", name_ar: "استراحة", start_time: "10:45", end_time: "11:00", slot_type: "break", slot_order: 6, is_active: true },
  { id: "slot-7", name_ar: "الحصة الخامسة", start_time: "11:00", end_time: "11:45", slot_type: "period", slot_order: 7, is_active: true },
  { id: "slot-8", name_ar: "الحصة السادسة", start_time: "11:45", end_time: "12:30", slot_type: "period", slot_order: 8, is_active: true },
  { id: "slot-9", name_ar: "الحصة السابعة", start_time: "12:30", end_time: "13:15", slot_type: "period", slot_order: 9, is_active: true },
  { id: "slot-10", name_ar: "الحصة الثامنة", start_time: "13:15", end_time: "14:00", slot_type: "period", slot_order: 10, is_active: true },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export function TimeSlotsModal({ open, onClose, schoolId }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{
        timeSlots?: TimeSlot[];
      }>(`/api/web/schedule/time-slots?schoolId=${encodeURIComponent(schoolId)}`);

      if (payload?.timeSlots && payload.timeSlots.length > 0) {
        setSlots(
          [...payload.timeSlots].sort((a, b) => a.slot_order - b.slot_order),
        );
      } else {
        setSlots(DEFAULT_SLOTS);
      }
    } catch {
      setSlots(DEFAULT_SLOTS);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (open) {
      fetchSlots();
    }
  }, [open, fetchSlots]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={overlayVariants}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl",
              "border border-gray-200 bg-white shadow-2xl",
              "dark:border-gray-700 dark:bg-gray-900",
            )}
            style={{ direction: "rtl" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeslots-modal-title"
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between border-b px-6 py-4",
                "border-gray-100 dark:border-gray-800",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    "bg-blue-100 dark:bg-blue-900/40",
                  )}
                >
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2
                  id="timeslots-modal-title"
                  className="text-lg font-bold text-gray-900 dark:text-gray-100"
                >
                  إعدادات الحصص الدراسية
                </h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  "text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600",
                  "dark:hover:bg-gray-800 dark:hover:text-gray-300",
                )}
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className={cn(
                          "border-b text-xs font-semibold text-gray-500",
                          "border-gray-100 dark:border-gray-800 dark:text-gray-400",
                        )}
                      >
                        <th className="pb-3 text-right">الاسم</th>
                        <th className="pb-3 text-right">من</th>
                        <th className="pb-3 text-right">إلى</th>
                        <th className="pb-3 text-right">النوع</th>
                        <th className="pb-3 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((slot) => {
                        const isBreak = slot.slot_type === "break";
                        return (
                          <tr
                            key={slot.id}
                            className={cn(
                              "border-b transition-colors",
                              "border-gray-50 dark:border-gray-800/50",
                              isBreak &&
                                "bg-amber-50/60 dark:bg-amber-950/20",
                            )}
                          >
                            <td className="py-3 pe-4">
                              <div className="flex items-center gap-2">
                                {isBreak ? (
                                  <Clock3 className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                )}
                                <span
                                  className={cn(
                                    "font-medium",
                                    isBreak
                                      ? "text-amber-700 dark:text-amber-400"
                                      : "text-gray-900 dark:text-gray-100",
                                  )}
                                >
                                  {slot.name_ar}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pe-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {slot.start_time}
                            </td>
                            <td className="py-3 pe-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {slot.end_time}
                            </td>
                            <td className="py-3 pe-4">
                              <span
                                className={cn(
                                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  isBreak
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                                )}
                              >
                                {isBreak ? "استراحة" : "حصة"}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  slot.is_active
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    slot.is_active
                                      ? "bg-emerald-500"
                                      : "bg-gray-400 dark:bg-gray-600",
                                  )}
                                />
                                {slot.is_active ? "مفعّل" : "معطّل"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={cn(
                "border-t px-6 py-4",
                "border-gray-100 dark:border-gray-800",
              )}
            >
              <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
                يتم إدارة إعدادات الحصص من قبل مسؤول النظام
              </p>
              <button
                onClick={onClose}
                className={cn(
                  "w-full rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TimeSlotsModal;
