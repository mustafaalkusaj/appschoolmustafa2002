"use client";

import { useCallback, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { CalendarEvent } from "../_hooks/useCalendarEvents";
import { Sparkles } from "@/lib/icons";
import { motion } from "framer-motion";

type Props = {
  upcomingEvents: CalendarEvent[];
  schoolName: string;
  studentsCount?: number;
};

export function AISuggestionsPanel({ upcomingEvents, schoolName, studentsCount }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const currentMonth = new Date().toLocaleDateString("ar-IQ-u-nu-latn", { month: "long", year: "numeric" });

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        suggestions: string[];
        error?: { message: string };
      }>("/api/web/calendar/ai-suggestions", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          upcomingEvents: upcomingEvents.map((e) => ({ title: e.title, date: e.date, type: e.type })),
          currentMonth,
          schoolName,
          studentsCount,
        }),
      });

      if (!response.ok) throw new Error(payload?.error?.message ?? "فشل تحميل الاقتراحات");
      setSuggestions(payload?.suggestions ?? []);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }, [upcomingEvents, currentMonth, schoolName, studentsCount]);

  if (!loaded && !loading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-violet-200/60"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(168,85,247,0.04) 100%)" }}>
        <div className="p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 8px 24px rgba(139,92,246,0.35)" }}>
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">اقتراحات ذكية بـ AI</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
              احصل على اقتراحات مخصصة بناءً على أحداث التقويم القادمة، مدعوم بـ Claude AI
            </p>
          </div>
          <motion.button onClick={() => void fetchSuggestions()}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 18px rgba(139,92,246,0.4)" }}>
            <Sparkles size={16} />
            توليد اقتراحات
          </motion.button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--surface-muted)] rounded-full w-4/5" />
                <div className="h-3 bg-[var(--surface-muted)] rounded-full w-3/5" />
              </div>
            </div>
          </div>
        ))}
        <p className="text-center text-xs font-bold text-[var(--text-muted)] animate-pulse">جارٍ تحليل التقويم بالذكاء الاصطناعي...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-5 text-sm text-[var(--danger)] font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-start gap-4 p-4 rounded-2xl border border-violet-200/50 bg-[var(--card-bg)]"
          style={{ borderInlineStart: "3px solid #8b5cf6" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            {i + 1}
          </div>
          <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">{s}</p>
        </motion.div>
      ))}
      <div className="text-center pt-2">
        <button onClick={() => void fetchSuggestions()}
          className="text-xs font-black text-violet-500 hover:text-violet-700 transition px-4 py-2 rounded-xl hover:bg-violet-50">
          تحديث الاقتراحات
        </button>
      </div>
    </div>
  );
}
