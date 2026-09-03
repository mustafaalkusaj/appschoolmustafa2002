"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Search, Plus } from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { EmptyState } from "@/components/ui/empty-state";

interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  otherParticipantName: string;
  unreadCount: number;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string, isAr: boolean): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return isAr ? "الآن" : "now";
  if (diffMin < 60) return isAr ? `${diffMin} د` : `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return isAr ? `${diffHr} س` : `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return isAr ? `${diffDay} ي` : `${diffDay}d`;
  const diffMonth = Math.floor(diffDay / 30);
  return isAr ? `${diffMonth} ش` : `${diffMonth}mo`;
}

export default function TeacherMessagesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/messages")
      .then((res) => {
        if (res.response.ok) {
          setThreads((res.payload as { data: Thread[] })?.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? threads.filter((th) =>
        th.otherParticipantName
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : threads;

  return (
    <TeacherShell
      currentPath="/teacher/messages"
      titleAr="الرسائل"
      titleEn="Messages"
      actions={
        <button
          onClick={() => router.push(`/${locale}/teacher/messages/new`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--card-radius)] bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          {t("رسالة جديدة", "New Message")}
        </button>
      }
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("بحث بالاسم...", "Search by name...")}
            className="w-full ps-9 pe-3 py-2.5 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={
              <MessageSquare className="h-12 w-12 text-[var(--text-tertiary)]" />
            }
            title={t("لا توجد رسائل", "No messages")}
            description={t(
              "لم تقم بارسال اي رسالة بعد",
              "You haven't sent any messages yet",
            )}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((th) => (
              <button
                key={th.id}
                onClick={() =>
                  router.push(`/${locale}/teacher/messages/${th.id}`)
                }
                className="w-full flex items-center gap-3 p-3 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] hover:bg-[var(--surface-soft)] transition-colors text-start"
              >
                {/* Avatar */}
                <div className="shrink-0 h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-semibold">
                  {getInitials(th.otherParticipantName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm truncate ${
                        th.unreadCount > 0
                          ? "font-semibold text-[var(--text-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {th.otherParticipantName || th.title}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {timeAgo(th.lastMessageAt, isAr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-[var(--text-muted)] truncate">
                      {th.lastMessage ||
                        t("لا توجد رسائل بعد", "No messages yet")}
                    </span>
                    {th.unreadCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[var(--primary)] text-white text-[11px] font-semibold">
                        {th.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
