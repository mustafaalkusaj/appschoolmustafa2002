"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Pin, PinOff, Trash2, Plus, ExternalLink, Image, FileText, Video, Pencil, Search } from "@/lib/icons";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatDate } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/brand/brand-utils";
import { CreateAnnouncementModal } from "./CreateAnnouncementModal";
import type { AnnouncementListItem, AnnouncementMediaType } from "@/lib/notifications/types";

interface Props {
  schoolId: string;
  branchId?: string;
  locale: string;
}

const MEDIA_ICON: Record<AnnouncementMediaType, React.ReactNode> = {
  image: <Image size={14} />,
  video: <Video size={14} />,
  pdf: <FileText size={14} />,
  link: <ExternalLink size={14} />,
};

export function AnnouncementsList({ schoolId, branchId, locale }: Props) {
  const t = useTranslations("notifications.announcements");
  const commonT = useTranslations("common");

  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editItem,      setEditItem]      = useState<AnnouncementListItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search,        setSearch]        = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/announcements?schoolId=${schoolId}&pageSize=50`,
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setItems(data.items ?? []);
      } else {
        setError(data?.error ?? "Error");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { void load(); }, [load]);

  async function handlePin(id: string, currentlyPinned: boolean) {
    setActionLoading(id);
    try {
      await fetchWithAuthorizedSession(`/api/web/announcements/${id}`, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ schoolId, isPinned: !currentlyPinned }),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isPinned: !currentlyPinned } : item,
        ),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(id);
    try {
      await fetchWithAuthorizedSession(
        `/api/web/announcements/${id}?schoolId=${schoolId}`,
        { method: "DELETE" },
      );
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = search.trim()
    ? items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || i.body.toLowerCase().includes(search.toLowerCase()))
    : items;
  const pinned   = filtered.filter((i) => i.isPinned);
  const unpinned = filtered.filter((i) => !i.isPinned);

  function renderCard(item: AnnouncementListItem) {
    const isActing = actionLoading === item.id;
    return (
      <div
        key={item.id}
        className={cn(
          "group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5",
        )}
      >
        {/* Colored top strip */}
        <div
          className="h-1 w-full"
          style={{
            background: item.isPinned
              ? "var(--warning)"
              : "color-mix(in srgb, var(--primary) 60%, transparent)",
          }}
        />

        <div className="p-4 space-y-2">
          {/* Pinned badge */}
          {item.isPinned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-[var(--warning)] text-[10px] font-bold uppercase tracking-wider">
              <Pin size={10} />
              {t("pinnedBadge")}
            </span>
          )}

          <p className="font-bold text-[var(--text-primary)] text-sm leading-snug line-clamp-2">
            {item.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
            {item.body}
          </p>

          {/* معاينة صورة مضمّنة */}
          {item.mediaUrl && item.mediaType === "image" && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] mt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.mediaUrl} alt={item.title} className="w-full max-h-36 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
            </div>
          )}

          {/* رابط وسائط أخرى */}
          {item.mediaUrl && item.mediaType !== "image" && (
            <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline font-medium mt-1">
              {item.mediaType ? MEDIA_ICON[item.mediaType] : <ExternalLink size={12} />}
              {t("viewMedia")}
            </a>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-2">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[var(--text-muted)] block">
                {item.createdAt ? formatDate(item.createdAt) : "—"}
              </span>
              {item.expiresAt && (
                <span className="text-[10px] text-[var(--warning)] block">
                  · {t("expires")} {formatDate(item.expiresAt)}
                </span>
              )}
            </div>

            {/* Action buttons — always visible on mobile, hover-reveal on desktop */}
            <div className="flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                disabled={isActing}
                onClick={() => setEditItem(item)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] border border-transparent hover:border-[color-mix(in_srgb,var(--primary)_20%,transparent)] transition-all"
                title="تعديل"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={() => void handlePin(item.id, item.isPinned)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--warning)] hover:bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] border border-transparent hover:border-[color-mix(in_srgb,var(--warning)_20%,transparent)] transition-all"
                title={item.isPinned ? t("unpin") : t("pin")}
              >
                {item.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={() => void handleDelete(item.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-transparent hover:border-[color-mix(in_srgb,var(--danger)_20%,transparent)] transition-all"
                title={commonT("delete")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "color-mix(in srgb, var(--warning) 12%, transparent)",
                color: "var(--warning)",
              }}
            >
              <Megaphone size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{t("heading")}</h2>
              {items.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {items.length} {pinned.length > 0 ? `· ${pinned.length} مثبّت` : ""}
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
            <Plus size={14} />
            {t("create")}
          </Button>
        </div>

        {/* شريط البحث */}
        {items.length > 3 && (
          <div className="px-5 pb-3">
            <div className="relative">
              <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في الإعلانات..."
                className="w-full ps-9 pe-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {error && items.length === 0 ? (
            <ErrorState
              title={t("errorTitle")}
              description={t("errorDesc")}
              onRetry={() => void load()}
              retryLabel={commonT("retry")}
            />
          ) : loading && items.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                  <div className="h-1 w-full bg-[var(--surface-soft)]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-[var(--surface-soft)]" />
                    <div className="h-3 w-full rounded bg-[var(--surface-soft)]" />
                    <div className="h-3 w-5/6 rounded bg-[var(--surface-soft)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--warning)" }}
              >
                <Megaphone size={28} />
              </div>
              <p className="font-bold text-[var(--text-primary)]">{t("empty")}</p>
              <p className="text-sm text-[var(--text-muted)]">ابدأ بإنشاء أول إعلان للمدرسة</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 mt-2" size="sm">
                <Plus size={14} />
                {t("create")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* المثبّت */}
              {pinned.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pin size={12} style={{ color: "var(--warning)" }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--warning)" }}>
                      {t("pinnedSection")}
                    </p>
                    <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--warning) 20%, transparent)" }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pinned.map(renderCard)}
                  </div>
                </div>
              )}

              {/* الباقي */}
              {unpinned.length > 0 && (
                <div className="space-y-3">
                  {pinned.length > 0 && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {t("allSection")}
                      </p>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unpinned.map(renderCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schoolId={schoolId}
        branchId={branchId}
        onSuccess={() => void load()}
      />

      {editItem && (
        <CreateAnnouncementModal
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          schoolId={schoolId}
          branchId={branchId}
          item={editItem}
          onSuccess={() => { setEditItem(null); void load(); }}
        />
      )}
    </>
  );
}
