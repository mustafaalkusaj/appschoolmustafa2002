"use client";

import { useState } from "react";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import {
  Archive, X, ChevronDown, Users, CreditCard, TrendingUp, ExternalLink,
} from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";

export function GlobalArchiveBanner() {
  const { isArchiveMode, archiveData, availableArchives, switching, exitArchiveMode, switchToArchive } =
    useArchiveMode();
  const [showYearMenu, setShowYearMenu] = useState(false);
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const schoolId =
    schoolScope.selectedSchoolId ?? profile?.school_id ?? (profile?.school as { id?: string } | undefined)?.id ?? "";

  if (!isArchiveMode || !archiveData) return null;

  const otherArchives = availableArchives.filter((a) => a.year !== archiveData.year);

  return (
    <div
      className="w-full border-b relative z-10"
      style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)",
        borderColor: "#4338ca33",
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        {/* Icon + Label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Archive size={13} className="text-indigo-200" />
          </div>
          <div className="leading-tight">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">وضع الأرشيف</p>
            <p className="text-sm font-black text-white">سنة {archiveData.year}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15 flex-shrink-0 mx-1" />

        {/* Stats */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          <span className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 flex-shrink-0">
            <Users size={10} className="text-indigo-300" />
            <span className="text-[11px] font-bold text-white">{archiveData.students.length} طالب</span>
          </span>
          <span className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 flex-shrink-0">
            <CreditCard size={10} className="text-indigo-300" />
            <span className="text-[11px] font-bold text-white">{archiveData.payments.length} دفعة</span>
          </span>
          <span className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 flex-shrink-0">
            <TrendingUp size={10} className="text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-300">
              د.ع {formatNumber(archiveData.totalAmount)}
            </span>
          </span>
          <span className="hidden sm:block text-[9px] font-black text-indigo-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10 flex-shrink-0 uppercase tracking-wide">
            للقراءة فقط
          </span>
        </div>

        {/* Quick nav */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          <Link
            href={`/${locale}/payments`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-indigo-200 transition"
          >
            <ExternalLink size={10} />
            المدفوعات
          </Link>
          <Link
            href={`/${locale}/students`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-indigo-200 transition"
          >
            <ExternalLink size={10} />
            الطلاب
          </Link>
        </div>

        {/* Year switcher */}
        {otherArchives.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowYearMenu((s) => !s)}
              disabled={switching}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-indigo-200 transition disabled:opacity-50"
            >
              {switching ? (
                <span className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChevronDown size={11} />
              )}
              <span className="hidden sm:block">تبديل</span>
            </button>
            {showYearMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowYearMenu(false)}
                />
                <div
                  className="absolute top-full mt-1.5 end-0 min-w-[180px] rounded-xl shadow-2xl z-50 overflow-hidden border border-indigo-700/50"
                  style={{ background: "#1e1b4b", direction: "rtl" }}
                >
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-3 pt-2.5 pb-1">
                    تبديل السنة
                  </p>
                  {otherArchives
                    .sort((a, b) => b.year - a.year)
                    .map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setShowYearMenu(false);
                          void switchToArchive(a, schoolId);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/10 transition text-start"
                      >
                        <span className="text-sm font-black text-white">سنة {a.year}</span>
                        <span className="text-[11px] text-indigo-400 font-semibold">
                          {a.totalStudents} طالب
                        </span>
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Exit */}
        <button
          onClick={exitArchiveMode}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 border border-white/10 hover:border-red-400/40 text-[11px] font-black text-white transition flex-shrink-0"
        >
          <X size={11} />
          <span className="hidden sm:block">خروج</span>
        </button>
      </div>
    </div>
  );
}
