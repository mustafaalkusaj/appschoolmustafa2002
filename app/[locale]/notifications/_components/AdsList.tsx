"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Trash2, Plus, ToggleLeft, ToggleRight, Pencil, Search } from "@/lib/icons";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatDate } from "@/lib/formatting";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/brand/brand-utils";
import { CreateAdModal } from "./CreateAdModal";

interface AdItem {
  id: string;
  type: "image" | "countdown" | "video" | "document";
  title: string;
  body: string | null;
  bg_color: string | null;
  image_url: string | null;
  target_date: string | null;
  social_url: string | null;
  social_label: string | null;
  video_url: string | null;
  doc_url: string | null;
  doc_pages: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

interface Props {
  schoolId: string;
  locale: string;
}

const TYPE_LABEL: Record<AdItem["type"], string> = {
  image: "صورة",
  countdown: "عداد",
  video: "فيديو",
  document: "مستند",
};

const TYPE_COLOR: Record<AdItem["type"], string> = {
  image: "var(--primary)",
  countdown: "var(--warning)",
  video: "var(--danger)",
  document: "var(--success)",
};

export function AdsList({ schoolId, locale }: Props) {
  const [items, setItems] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<AdItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuthorizedSession(
        `/api/web/ads?schoolId=${schoolId}`,
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setItems(data.items ?? []);
      } else {
        setError(data?.error?.message ?? data?.error ?? "Error");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { void load(); }, [load]);

  async function handleToggleActive(id: string, currentlyActive: boolean) {
    setActionLoading(id);
    try {
      await fetchWithAuthorizedSession(`/api/web/ads/${id}`, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ schoolId, isActive: !currentlyActive }),
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_active: !currentlyActive } : item,
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
        `/api/web/ads/${id}?schoolId=${schoolId}`,
        { method: "DELETE" },
      );
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          (i.body ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const active   = filtered.filter((i) => i.is_active);
  const inactive = filtered.filter((i) => !i.is_active);

  function renderCard(item: AdItem) {
    const isActing = actionLoading === item.id;
    const typeColor = TYPE_COLOR[item.type];
    return (
      <div
        key={item.id}
        className={cn(
          "group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5",
          !item.is_active && "opacity-60",
        )}
      >
        {/* Colored top strip */}
        <div className="h-1 w-full" style={{ background: typeColor }} />

        <div className="p-4 space-y-2">
          {/* Type badge */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
              color: typeColor,
            }}
          >
            {TYPE_LABEL[item.type]}
          </span>

          <p className="font-bold text-[var(--text-primary)] text-sm leading-snug line-clamp-2">
            {item.title}
          </p>
          {item.body && (
            <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
              {item.body}
            </p>
          )}

          {/* Image preview */}
          {item.image_url && item.type === "image" && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] mt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full max-h-36 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Countdown target */}
          {item.type === "countdown" && item.target_date && (
            <p className="text-xs text-[var(--warning)] font-medium">
              📅 {formatDate(item.target_date)}
            </p>
          )}

          {/* Doc info */}
          {item.type === "document" && item.doc_url && (
            <a
              href={item.doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
            >
              📄 {item.doc_pages ? `${item.doc_pages} صفحة` : "عرض المستند"}
            </a>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">
              {item.created_at ? formatDate(item.created_at) : "—"}
            </span>

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
                onClick={() => void handleToggleActive(item.id, item.is_active)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] border border-transparent hover:border-[color-mix(in_srgb,var(--success)_20%,transparent)] transition-all"
                title={item.is_active ? "إيقاف" : "تفعيل"}
              >
                {item.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={() => void handleDelete(item.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-transparent hover:border-[color-mix(in_srgb,var(--danger)_20%,transparent)] transition-all"
                title="حذف"
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
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
              }}
            >
              <LayoutGrid size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">الإعلانات الترويجية</h2>
              {items.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {items.length} إعلان · {active.length} نشط
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
            <Plus size={14} />
            إضافة إعلان
          </Button>
        </div>

        {/* Search bar */}
        {items.length > 3 && (
          <div className="px-5 pb-3 pt-3">
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
              title="تعذر تحميل الإعلانات"
              description="حدث خطأ أثناء جلب البيانات"
              onRetry={() => void load()}
              retryLabel="إعادة المحاولة"
            />
          ) : loading && items.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
                >
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
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}
              >
                <LayoutGrid size={28} />
              </div>
              <p className="font-bold text-[var(--text-primary)]">لا توجد إعلانات بعد</p>
              <p className="text-sm text-[var(--text-muted)]">ابدأ بإضافة أول إعلان ترويجي للمدرسة</p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2 mt-2" size="sm">
                <Plus size={14} />
                إضافة إعلان
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {active.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--success)" }}>
                      نشط
                    </p>
                    <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--success) 20%, transparent)" }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {active.map(renderCard)}
                  </div>
                </div>
              )}

              {inactive.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      موقوف
                    </p>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {inactive.map(renderCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateAdModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        schoolId={schoolId}
        onSuccess={() => void load()}
      />

      {editItem && (
        <CreateAdModal
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          schoolId={schoolId}
          item={editItem}
          onSuccess={() => { setEditItem(null); void load(); }}
        />
      )}
    </>
  );
}
