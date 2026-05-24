"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  containerVariants,
  cardVariants,
  usePrefersReducedMotion,
  getVariants,
} from "@/lib/motion-variants";
import {
  Users, CreditCard, ClipboardList, CalendarDays, BookOpen,
  GraduationCap, Plus, ReceiptText, Wallet, X, Loader2, CheckCircle2, Banknote,
} from "@/lib/icons";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { DatePicker } from "@/components/ui/date-picker";
import type { Permission } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuickAction = "attendance";
type CardAction = QuickAction | "student-modal" | "payment-modal" | "teacher-modal" | "expense-modal" | "income-modal" | "classes-modal" | "fee-modal" | "navigate";

// ─── Quick Attendance Modal ────────────────────────────────────────────────────

interface QuickAddModalProps {
  action: QuickAction;
  schoolId: string;
  availableClassNames: string[];
  locale: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}

function QuickAddModal({ action, schoolId, availableClassNames, locale, onClose, onSuccess }: QuickAddModalProps) {
  const isEn = locale === "en";
  const today = new Date().toISOString().slice(0, 10);

  // attendance
  const [attendanceClass, setAttendanceClass] = useState(availableClassNames[0] ?? "");
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceStudents, setAttendanceStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  // ui
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // fetch students for attendance
  useEffect(() => {
    if (action !== "attendance" || !attendanceClass) return;
    setAttendanceLoading(true);
    fetchWithAuthorizedSession(`/api/dashboard/users?schoolId=${schoolId}&role=student&pageSize=500`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data as { users?: unknown[]; data?: unknown[] };
        const all: { id: string; full_name: string; student?: { class_name?: string | null } }[] =
          Array.isArray(raw.users) ? raw.users as { id: string; full_name: string; student?: { class_name?: string | null } }[]
          : Array.isArray(raw.data) ? raw.data as { id: string; full_name: string; student?: { class_name?: string | null } }[]
          : [];
        const filtered = all.filter((u) => u.student?.class_name === attendanceClass);
        setAttendanceStudents(filtered.map((u) => ({ id: u.id, full_name: u.full_name })));
      })
      .catch(() => setError(isEn ? "Failed to load students" : "تعذر تحميل الطلاب"))
      .finally(() => setAttendanceLoading(false));
  }, [action, attendanceClass, schoolId, isEn]);

  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};

      if (action === "attendance") {
        if (!attendanceStudents.length) { setError(isEn ? "No students found in this class" : "لا يوجد طلاب في هذا الصف"); setSaving(false); return; }
        endpoint = "/api/web/attendance";
        body = {
          school_id: schoolId,
          attendance_date: attendanceDate,
          entries: attendanceStudents.map((s) => ({ student_id: s.id, status: "present" })),
        };

      }

      const res = await fetchWithAuthorizedSession(endpoint, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setError(data?.error?.message || (isEn ? "Failed to save" : "فشل الحفظ"));
        return;
      }

      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch {
      setError(isEn ? "Network error" : "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const TITLES: Record<QuickAction, string> = {
    attendance: isEn ? "Mark Attendance" : "تسجيل الحضور",
  };

  const inp = "w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition-colors";
  const lbl = "text-xs font-bold text-[var(--text-muted)] block mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" dir={isEn ? "ltr" : "rtl"}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--border)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="font-bold text-[var(--text-primary)]">{TITLES[action]}</span>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full bg-[color-mix(in_srgb,var(--success)_15%,transparent)] flex items-center justify-center">
                <CheckCircle2 size={24} className="text-[var(--success)]" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{isEn ? "Saved!" : "تم الحفظ!"}</p>
            </div>
          ) : (
            <>
              {/* attendance: class + date */}
              {action === "attendance" && (
                <>
                  <div>
                    <label className={lbl}>{isEn ? "Class *" : "الصف *"}</label>
                    <select value={attendanceClass} onChange={(e) => setAttendanceClass(e.target.value)} className={inp}>
                      {availableClassNames.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>{isEn ? "Date" : "التاريخ"}</label>
                    <DatePicker value={attendanceDate || undefined} onChange={(v) => setAttendanceDate(v ?? "")} />
                  </div>
                  <div className="rounded-xl bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-3 py-2 text-xs flex items-center gap-2">
                    {attendanceLoading
                      ? <><Loader2 size={12} className="animate-spin text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">{isEn ? "Loading students..." : "جاري التحميل..."}</span></>
                      : <span className="text-[var(--success)] font-bold">
                          {isEn
                            ? `${attendanceStudents.length} students will be marked present`
                            : `سيتم تسجيل ${attendanceStudents.length} طالب حاضرين`}
                        </span>
                    }
                  </div>
                </>
              )}

              {error && (
                <p className="text-xs text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] rounded-xl px-3 py-2">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-5 pb-5 flex gap-2">
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {isEn ? "Save" : "حفظ"}
            </button>
            <button onClick={onClose} className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
  locale: "ar" | "en";
  buildLocalizedPath: (pathname: string, locale?: string) => string;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  schoolId: string | null;
  availableClassNames: string[];
  onOpenClassesModal: () => void;
  onOpenAddStudentModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenTeacherModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
  onOpenFeeModal: () => void;
}

interface CardDef {
  key: string;
  labelAr: string;
  labelEn: string;
  path: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  action: CardAction;
  canShow: (can: (p: Permission) => boolean, canAny: (ps: Permission[]) => boolean) => boolean;
}

const CARDS: CardDef[] = [
  {
    key: "students", labelAr: "الطلاب", labelEn: "Students", path: "/students",
    Icon: Users, color: "var(--primary)", action: "student-modal",
    canShow: () => true,
  },
  {
    key: "payments", labelAr: "فاتورة", labelEn: "Invoice", path: "/payments",
    Icon: CreditCard, color: "var(--success)", action: "payment-modal",
    canShow: (can) => can("view_payments"),
  },
  {
    key: "schedule", labelAr: "الجدول", labelEn: "Schedule", path: "/schedule",
    Icon: CalendarDays, color: "var(--info)", action: "navigate",
    canShow: (can) => can("manage_schedule"),
  },
  {
    key: "classes", labelAr: "الصفوف", labelEn: "Classes", path: "/classes",
    Icon: BookOpen, color: "#8b5cf6", action: "classes-modal",
    canShow: (_, canAny) => canAny(["add_students", "edit_students"]),
  },
  {
    key: "teachers", labelAr: "الأساتذة", labelEn: "Teachers", path: "/teachers",
    Icon: GraduationCap, color: "#0891b2", action: "teacher-modal",
    canShow: (can) => can("view_teachers"),
  },
  {
    key: "expenses", labelAr: "المصروفات", labelEn: "Expenses", path: "/expenses",
    Icon: ReceiptText, color: "#ef4444", action: "expense-modal",
    canShow: (can) => can("view_expenses"),
  },
  {
    key: "incomes", labelAr: "الإيرادات", labelEn: "Incomes", path: "/incomes",
    Icon: Wallet, color: "#10b981", action: "income-modal",
    canShow: (can) => can("view_incomes"),
  },
  {
    key: "fee", labelAr: "قسط دراسي", labelEn: "Tuition Fee", path: "/",
    Icon: Banknote, color: "#f59e0b", action: "fee-modal",
    canShow: (_, canAny) => canAny(["add_students", "edit_students", "delete_students"]),
  },
];

export function QuickAccessPanel({ locale, buildLocalizedPath, can, canAny, schoolId, availableClassNames, onOpenClassesModal, onOpenAddStudentModal, onOpenPaymentModal, onOpenTeacherModal, onOpenExpenseModal, onOpenIncomeModal, onOpenFeeModal }: Props) {
  const isEn = locale === "en";
  const reduced = usePrefersReducedMotion();
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);

  const visibleCards = CARDS.filter((c) => c.canShow(can, canAny));
  if (visibleCards.length === 0) return null;

  const handleCardClick = (card: CardDef) => {
    if (card.action === "classes-modal") { onOpenClassesModal(); return; }
    if (card.action === "student-modal") { onOpenAddStudentModal(); return; }
    if (card.action === "payment-modal") { onOpenPaymentModal(); return; }
    if (card.action === "teacher-modal") { onOpenTeacherModal(); return; }
    if (card.action === "expense-modal") { onOpenExpenseModal(); return; }
    if (card.action === "income-modal") { onOpenIncomeModal(); return; }
    if (card.action === "fee-modal") { onOpenFeeModal(); return; }
    if (card.action === "navigate") return; // Link handles it
    setActiveAction(card.action as QuickAction);
  };

  return (
    <>
      <div>
        <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          {isEn ? "Quick Access" : "الوصول السريع"}
        </h2>
        <motion.div
          className="grid grid-cols-4 sm:grid-cols-8 gap-3"
          variants={getVariants(reduced, containerVariants(0.08))}
          initial="hidden"
          animate="visible"
        >
          {visibleCards.map((card) => {
            const href = buildLocalizedPath(card.path, locale);
            const isNavigate = card.action === "navigate";

            const cardInner = (
              <div className="flex flex-col items-center gap-3 p-4 py-5">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `color-mix(in srgb, ${card.color} 14%, transparent)`, color: card.color }}
                >
                  <card.Icon size={22} />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)] text-center leading-tight">
                  {isEn ? card.labelEn : card.labelAr}
                </span>
              </div>
            );

            return (
              <motion.div
                key={card.key}
                variants={getVariants(reduced, cardVariants)}
                whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                onClick={() => !isNavigate && handleCardClick(card)}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top, color-mix(in srgb, ${card.color} 10%, transparent), transparent 70%)` }}
                />

                {/* "+" indicator top-right */}
                <div
                  className="absolute top-2 end-2 h-4 w-4 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: `color-mix(in srgb, ${card.color} 18%, transparent)`, color: card.color }}
                >
                  <Plus size={9} strokeWidth={3} />
                </div>

                {isNavigate ? (
                  <Link href={href} className="relative block">{cardInner}</Link>
                ) : (
                  <div className="relative">{cardInner}</div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {activeAction && schoolId && (
        <QuickAddModal
          action={activeAction}
          schoolId={schoolId}
          availableClassNames={availableClassNames}
          locale={locale}
          onClose={() => setActiveAction(null)}
          onSuccess={() => setActiveAction(null)}
        />
      )}
    </>
  );
}
