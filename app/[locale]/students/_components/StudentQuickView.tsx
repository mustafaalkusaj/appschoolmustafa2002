"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, User, Phone, MapPin, GraduationCap, Calendar, CreditCard, Users2, Banknote, CheckCircle2, AlertCircle, Loader2, School } from "lucide-react";
import { formatNumber } from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/brand/brand-utils";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { computeGradeLabel, computePercentage } from "@/lib/grades/grade-calculator";
import type { GradeEntry } from "@/lib/grades/types";
import type { StudentWithFees } from "../_types";

// ── Grades tab types ─────────────────────────────────────────────────────────

interface StudentGradeResponse {
  ok: boolean;
  entries: GradeEntry[];
  grouped: Record<string, Record<string, GradeEntry[]>>;
}

type ActiveTab = "info" | "grades";

interface Props {
  student: StudentWithFees | null;
  schoolId?: string | null;
  onClose: () => void;
}

const statusVariantMap: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  transferred: "warning",
  graduated: "info",
  withdrawn: "danger",
  archived: "neutral",
  suspended: "warning",
  deleted: "neutral",
};

const statusLabelMap: Record<string, string> = {
  active: "نشط",
  transferred: "منقول",
  graduated: "متخرج",
  withdrawn: "منسحب",
  archived: "مؤرشف",
  suspended: "موقوف",
  deleted: "محذوف",
};

const genderLabel: Record<string, string> = { male: "ذكر", female: "أنثى" };

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface-soft)]">
      <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0">
        <Icon size={13} className="text-[var(--text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide font-medium leading-none">{label}</p>
        <p className={`text-xs mt-0.5 truncate ${value ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)] italic"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export function StudentQuickView({ student, schoolId, onClose }: Props) {
  const [fullStudent, setFullStudent] = useState<StudentWithFees | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");

  // Grades tab state
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesEntries, setGradesEntries] = useState<GradeEntry[]>([]);
  const [gradesFetched, setGradesFetched] = useState(false);
  const [gradesError, setGradesError] = useState<string | null>(null);

  useEffect(() => {
    if (!student) { setFullStudent(null); setActiveTab("info"); setGradesFetched(false); return; }
    setFullStudent(student);
    setActiveTab("info");
    setGradesFetched(false);
    setGradesEntries([]);
    if (!student.school_id && !schoolId) return;
    const sid = student.school_id ?? schoolId;
    setLoading(true);
    fetchJsonWithAuthorizedSession<{ ok: boolean; student: StudentWithFees }>(
      `/api/web/students/${student.id}?schoolId=${sid}`
    ).then(({ payload }) => {
      if (payload?.ok && payload.student) setFullStudent(payload.student);
    }).finally(() => setLoading(false));
  }, [student?.id, schoolId]);

  const fetchGrades = useCallback(async () => {
    if (!student || gradesFetched) return;
    setGradesLoading(true);
    setGradesError(null);
    try {
      const sid = student.school_id ?? schoolId;
      const qs = sid ? `?schoolId=${sid}` : "";
      const { payload } = await fetchJsonWithAuthorizedSession<StudentGradeResponse>(
        `/api/web/grades/student/${student.id}${qs}`
      );
      if (payload?.ok) {
        // Show the most recent semester's entries
        const gp = payload.grouped ?? {};
        const years = Object.keys(gp).sort().reverse();
        if (years.length > 0) {
          const latestYear = years[0];
          const sems = Object.keys(gp[latestYear]).map(Number).sort().reverse();
          const latestSem = sems[0];
          setGradesEntries(gp[latestYear]?.[String(latestSem)] ?? []);
        } else {
          setGradesEntries([]);
        }
      } else {
        setGradesError("تعذر تحميل الدرجات.");
      }
    } catch {
      setGradesError("حدث خطأ أثناء تحميل الدرجات.");
    } finally {
      setGradesLoading(false);
      setGradesFetched(true);
    }
  }, [student, schoolId, gradesFetched]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "grades") {
      void fetchGrades();
    }
  };

  const s = fullStudent ?? student;

  const paidPct = s && s.total_fee > 0
    ? Math.round((s.paid_fee / s.total_fee) * 100)
    : 0;

  const initials = s?.full_name
    ? s.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("")
    : "؟";

  return (
    <AnimatePresence>
      {student && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg bg-[var(--card-bg)] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero Header */}
              <div
                className="relative p-6 pb-8 overflow-hidden"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
              >
                <div className="absolute top-0 end-0 w-48 h-48 rounded-full opacity-[0.1]" style={{ background: "white", transform: "translate(30%, -40%)" }} />
                <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full opacity-[0.07]" style={{ background: "white", transform: "translate(-30%, 50%)" }} />

                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 start-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors z-10"
                >
                  <X size={16} />
                </button>

                <div className="relative flex items-center gap-4 mt-2">
                  {s?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s?.photo_url} alt={s?.full_name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-2 border-white/30" />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                    >
                      {initials}
                    </div>
                  )}
                  <div>
                    <h2 className="text-white font-black text-xl leading-tight">{s?.full_name}</h2>
                    <p className="text-white/70 text-sm mt-0.5">
                      {[s?.class_name, s?.section].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={statusVariantMap[s?.status ?? ""] ?? "neutral"} size="sm" className="border-white/20 bg-white/15 text-white text-[10px]">
                        {statusLabelMap[s?.status ?? ""] ?? s?.status}
                      </Badge>
                      {s?.registration_number && (
                        <span className="text-white/60 text-[10px] font-mono">#{s.registration_number}</span>
                      )}
                    </div>
                  </div>
                </div>
                {loading && <Loader2 size={14} className="text-white/60 animate-spin absolute top-4 end-14" />}
              </div>

              {/* Fee Cards Strip */}
              <div className="grid grid-cols-3 gap-0 border-b border-[var(--border)] divide-x divide-x-reverse divide-[var(--border)]">
                {[
                  { label: "إجمالي الرسوم", value: s?.total_fee ?? 0, icon: Banknote, color: "var(--text-primary)" },
                  { label: "المدفوع", value: s?.paid_fee ?? 0, icon: CheckCircle2, color: "var(--success)" },
                  { label: "المتبقي", value: s?.remaining_fee ?? 0, icon: AlertCircle, color: (s?.remaining_fee ?? 0) > 0 ? "var(--danger)" : "var(--success)" },
                ].map((item) => (
                  <div key={item.label} className="p-4 text-center">
                    <item.icon size={14} className="mx-auto mb-1" style={{ color: item.color }} />
                    <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
                    <p className="text-sm font-black mt-0.5" style={{ color: item.color }}>
                      {formatNumber(item.value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Payment Progress */}
              {(s?.total_fee ?? 0) > 0 && (
                <div className="px-5 py-3 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[var(--text-muted)]">نسبة السداد</span>
                    <span className={cn("text-[11px] font-black", paidPct >= 100 ? "text-[var(--success)]" : paidPct >= 50 ? "text-[var(--warning)]" : "text-[var(--danger)]")}>
                      {paidPct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: paidPct >= 100 ? "var(--success)" : paidPct >= 50 ? "var(--warning)" : "var(--danger)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(paidPct, 100)}%` }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                  {(s?.discount_value ?? 0) > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">خصم: {formatNumber(s!.discount_value)} د.ع</p>
                  )}
                </div>
              )}

              {/* ── Tab bar ────────────────────────────────────────────── */}
              <div className="flex border-b border-[var(--border)]">
                {(["info", "grades"] as ActiveTab[]).map((tab) => {
                  const labels: Record<ActiveTab, string> = { info: "معلومات الطالب", grades: "الدرجات" };
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabChange(tab)}
                      className={cn(
                        "flex-1 py-2.5 text-xs font-bold transition-colors border-b-2",
                        activeTab === tab
                          ? "border-[var(--primary)] text-[var(--primary)]"
                          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab content ────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-4">

                {/* Info tab */}
                {activeTab === "info" && (
                  <div className="grid grid-cols-2 gap-2">
                    <InfoRow icon={User} label="اسم ولي الأمر" value={s?.parent_name} />
                    <InfoRow icon={Phone} label="الهاتف" value={s?.phone} />
                    <InfoRow icon={Phone} label="هاتف ثانوي" value={s?.phone2} />
                    <InfoRow icon={MapPin} label="العنوان" value={s?.address} />
                    <InfoRow icon={Calendar} label="تاريخ الميلاد" value={s?.date_of_birth} />
                    <InfoRow icon={Users2} label="الجنس" value={s?.gender ? genderLabel[s.gender] : null} />
                    <InfoRow icon={GraduationCap} label="الصف / الشعبة" value={[s?.class_name, s?.section].filter(Boolean).join(" · ")} />
                    <InfoRow icon={CreditCard} label="رقم التسجيل" value={s?.registration_number} />
                    <InfoRow icon={School} label="المدرسة السابقة" value={s?.prev_school} />
                  </div>
                )}

                {/* Grades tab */}
                {activeTab === "grades" && (
                  <div>
                    {gradesLoading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="h-9 rounded-xl bg-[var(--surface-muted)] animate-pulse"
                            style={{ animationDelay: `${i * 60}ms` }}
                          />
                        ))}
                      </div>
                    ) : gradesError ? (
                      <p className="text-xs text-red-500 text-center py-6">{gradesError}</p>
                    ) : gradesEntries.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-2xl mb-2">📋</p>
                        <p className="text-xs text-[var(--text-muted)]">لا توجد سجلات درجات بعد</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs" dir="rtl">
                          <thead>
                            <tr className="border-b border-[var(--border)]">
                              {["المادة", "المجموع", "%", "التقدير"].map((h) => (
                                <th key={h} className="px-2 py-2 text-center font-bold text-[var(--text-muted)] whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {gradesEntries.map((entry) => {
                              const total = entry.score;
                              const pct = total !== null ? computePercentage(total, entry.max_score) : null;
                              const gradeLabel = pct !== null ? computeGradeLabel(pct) : null;
                              return (
                                <tr key={entry.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                                  <td className="px-2 py-2 font-semibold text-[var(--text-primary)] max-w-[120px] truncate">
                                    {entry.subject_name ?? entry.subject_id}
                                  </td>
                                  <td className="px-2 py-2 text-center font-black text-[var(--text-primary)]">
                                    {total ?? "—"}
                                  </td>
                                  <td className="px-2 py-2 text-center text-[var(--text-muted)]">
                                    {pct !== null ? `${pct}%` : "—"}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    {gradeLabel ? (
                                      <span className={`font-bold ${gradeLabel.color}`}>
                                        {gradeLabel.badge} {gradeLabel.labelAr}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
