"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  RefreshCw,
  Building2,
  Users,
  GitBranch,
  Search,
  Download,
  Archive,
} from "@/lib/icons";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MigrationNotice, formatDate, cx } from "./UI";
import { logAction } from "@/lib/audit";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import { fetchWithAuthorizedSession } from "@/lib/authorized-api";

type TrashEntity = "schools" | "users" | "branches";

type TrashItem = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
};

type SchoolArchiveRow = {
  id: string;
  school_id: string | null;
  school_name: string | null;
  created_at: string | null;
  archive_source: string | null;
};

export function TrashTab({ infrastructure }: { infrastructure: AdminInfrastructure }) {
  const availableEntities = useMemo<TrashEntity[]>(
    () => [
      ...(infrastructure.softDeleteSchools ? ["schools" as const] : []),
      ...(infrastructure.softDeleteUsers ? ["users" as const] : []),
      ...(infrastructure.softDeleteBranches ? ["branches" as const] : []),
    ],
    [
      infrastructure.softDeleteBranches,
      infrastructure.softDeleteSchools,
      infrastructure.softDeleteUsers,
    ],
  );

  const [activeEntity, setActiveEntity] = useState<TrashEntity>(availableEntities[0] ?? "schools");
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<TrashItem | null>(null);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<TrashItem | null>(null);
  const [archiveToDelete, setArchiveToDelete] = useState<SchoolArchiveRow | null>(null);
  const [archivesBySchoolId, setArchivesBySchoolId] = useState<Record<string, SchoolArchiveRow>>({});

  const fetchDeleted = useCallback(async () => {
    if (availableEntities.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const table = activeEntity === "schools" ? "schools" : activeEntity === "users" ? "user_profiles" : "branches";
      let q = supabase
        .from(table)
        .select("*")
        .not("deleted_at", "is", null);

      if (query) {
        if (activeEntity === "schools") {
          q = q.ilike("name", `%${query}%`);
        } else if (activeEntity === "branches") {
          q = q.ilike("name", `%${query}%`);
        } else {
          q = q.or(buildSafeOrFilter(["full_name", "email"], query));
        }
      }

      const { data, error } = await q.order("deleted_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);

      if (activeEntity === "schools") {
        const archivesResult = await supabase
          .from("school_data_archives")
          .select("id, school_id, school_name, created_at, archive_source")
          .order("created_at", { ascending: false });

        if (!archivesResult.error) {
          const nextArchives: Record<string, SchoolArchiveRow> = {};
          for (const archive of (archivesResult.data ?? []) as SchoolArchiveRow[]) {
            if (archive.school_id && !nextArchives[archive.school_id]) {
              nextArchives[archive.school_id] = archive;
            }
          }
          setArchivesBySchoolId(nextArchives);
        }
      } else {
        setArchivesBySchoolId({});
      }
    } catch (err) {
      console.error("Failed to fetch deleted items:", err);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, availableEntities.length, query]);

  useEffect(() => {
    if (availableEntities.length > 0 && !availableEntities.includes(activeEntity)) {
      setActiveEntity(availableEntities[0]);
      return;
    }
    setSelected(new Set());
    fetchDeleted();
  }, [activeEntity, availableEntities, fetchDeleted]);

  const handleRestore = async (id: string) => {
    try {
      const table = activeEntity === "schools" ? "schools" : activeEntity === "users" ? "user_profiles" : "branches";
      const payload =
        activeEntity === "users"
          ? { deleted_at: null, deleted_by: null, is_active: true }
          : activeEntity === "branches"
            ? { deleted_at: null, deleted_by: null, is_active: true }
            : { deleted_at: null, deleted_by: null };
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      await logAction({
        action_type: "restore",
        entity_type: activeEntity === "schools" ? "school" : activeEntity === "users" ? "user" : "branch",
        entity_id: id,
        summary: `استعادة ${
          activeEntity === "schools" ? "مدرسة" : activeEntity === "users" ? "مستخدم" : "فرع"
        } من سلة المحذوفات`,
      });

      setMessage("");
      fetchDeleted();
    } catch (err) {
      console.error("Restore error:", err);
      setMessage("فشل في استعادة العنصر المطلوب.");
    }
  };

  const handleBulkRestore = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkRestoring(true);
    try {
      const table = activeEntity === "schools" ? "schools" : activeEntity === "users" ? "user_profiles" : "branches";
      const payload =
        activeEntity === "users"
          ? { deleted_at: null, deleted_by: null, is_active: true }
          : activeEntity === "branches"
            ? { deleted_at: null, deleted_by: null, is_active: true }
            : { deleted_at: null, deleted_by: null };
      const ids = Array.from(selected);
      const { error } = await supabase.from(table).update(payload).in("id", ids);
      if (error) throw error;
      setSelected(new Set());
      setMessage("");
      fetchDeleted();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "فشل في الاستعادة الجماعية.");
    } finally {
      setBulkRestoring(false);
    }
  }, [selected, activeEntity, fetchDeleted]);

  const downloadArchive = useCallback(async (archive: SchoolArchiveRow) => {
    try {
      const response = await fetchWithAuthorizedSession(`/api/web/super-admin/school-archives/${archive.id}`, {
        method: "GET",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "تعذر تحميل نسخة الأرشيف.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const fileName = `${archive.school_name || "school"}-archive-${archive.id}.json`;
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Archive download error:", err);
      setMessage(err instanceof Error ? err.message : "تعذر تحميل نسخة الأرشيف.");
    }
  }, []);

  const handlePermanentDeleteSchool = useCallback(async (id: string, purgeArchive = false) => {
    try {
      const response = await fetchWithAuthorizedSession(
        `/api/web/super-admin/schools/${id}?hardDelete=true${purgeArchive ? "&purgeArchive=true" : ""}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر حذف المدرسة نهائياً.");
      }
      const warnings = Array.isArray(payload?.warnings)
        ? payload.warnings.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      setMessage(
        warnings.length > 0
          ? `تم الحذف الكامل مع ${warnings.length} تنبيه يحتاج مراجعة.`
          : purgeArchive
            ? "تم حذف المدرسة نهائياً مع حذف نسخ الأرشيف المرتبطة بها."
            : "",
      );
      fetchDeleted();
    } catch (err) {
      console.error("Permanent delete error:", err);
      setMessage(err instanceof Error ? err.message : "تعذر حذف المدرسة نهائياً.");
    }
  }, [fetchDeleted]);

  const handleDeleteArchive = useCallback(async (archiveId: string) => {
    try {
      const response = await fetchWithAuthorizedSession(`/api/web/super-admin/school-archives/${archiveId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر حذف نسخة الأرشيف.");
      }
      setMessage("");
      fetchDeleted();
    } catch (err) {
      console.error("Archive delete error:", err);
      setMessage(err instanceof Error ? err.message : "تعذر حذف نسخة الأرشيف.");
    }
  }, [fetchDeleted]);

  if (availableEntities.length === 0) {
    return (
      <MigrationNotice description="سلة المحذوفات تحتاج تشغيل `admin_infrastructure.sql` لأن أعمدة `deleted_at` و `deleted_by` غير موجودة بعد على الجداول المدعومة." />
    );
  }

  const getItemName = (item: TrashItem) =>
    activeEntity === "users" ? (item.full_name || item.email) : item.name;

  return (
    <div className="space-y-3">
      {message ? <MigrationNotice title="تنبيه" description={message} /> : null}

      {/* Header row with entity tabs + search + refresh */}
      <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[var(--border)]">
        <span className="text-xs font-black text-[var(--text-primary)]">سلة المحذوفات</span>
        <div className="flex gap-1 flex-1">
          {availableEntities.includes("schools") && (
            <button
              onClick={() => setActiveEntity("schools")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-black transition",
                activeEntity === "schools"
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <Building2 size={11} />
              المدارس
            </button>
          )}
          {availableEntities.includes("users") && (
            <button
              onClick={() => setActiveEntity("users")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-black transition",
                activeEntity === "users"
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <Users size={11} />
              المستخدمون
            </button>
          )}
          {availableEntities.includes("branches") && (
            <button
              onClick={() => setActiveEntity("branches")}
              className={cx(
                "flex items-center gap-1 rounded px-2 py-1 text-[11px] font-black transition",
                activeEntity === "branches"
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <GitBranch size={11} />
              الفروع
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="بحث..."
            className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => void fetchDeleted()}
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1.5">
          <span className="text-xs font-black text-[var(--primary)]">{selected.size} محدد</span>
          <button
            onClick={() => void handleBulkRestore()}
            disabled={bulkRestoring}
            className="flex items-center gap-1 text-[10px] font-black text-[var(--success)] hover:underline disabled:opacity-50"
          >
            <RotateCcw size={11} />
            استعادة الكل
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ms-auto text-[10px] text-[var(--text-muted)] hover:underline"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sk h-9 w-full rounded" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد بيانات</p>
      ) : (
        <div>
          {items.map((item) => {
            const archive = activeEntity === "schools" ? archivesBySchoolId[item.id] ?? null : null;
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 py-1.5 px-2 border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    setSelected(next);
                  }}
                  className="cursor-pointer shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[var(--text-muted)]">
                    {activeEntity === "schools" ? <Building2 size={12} /> : activeEntity === "users" ? <Users size={12} /> : <GitBranch size={12} />}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[var(--text-primary)] truncate block">
                      {getItemName(item)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      حُذف: {formatDate(item.deleted_at)}
                      {archive && <span className="ms-2 text-[var(--primary)]">أرشيف: {formatDate(archive.created_at)}</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {archive && (
                    <>
                      <button
                        onClick={() => void downloadArchive(archive)}
                        className="flex items-center gap-1 text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--primary)]"
                        title="تحميل نسخة الأرشيف"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        onClick={() => setArchiveToDelete(archive)}
                        className="flex items-center gap-1 text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--danger)]"
                        title="حذف نسخة الأرشيف"
                      >
                        <Archive size={11} />
                      </button>
                    </>
                  )}
                  {activeEntity === "schools" && (
                    <button
                      onClick={() => setItemToDeletePermanently(item)}
                      className="text-[10px] font-black text-[var(--danger)] hover:underline"
                    >
                      حذف كامل
                    </button>
                  )}
                  <button
                    onClick={() => setItemToRestore(item)}
                    className="flex items-center gap-1 text-[10px] font-black text-[var(--primary)] hover:underline"
                  >
                    <RotateCcw size={11} />
                    استعادة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(itemToRestore)}
        title="استعادة عنصر من السلة"
        description={itemToRestore ? `سيتم استعادة ${activeEntity === "schools" ? "المدرسة" : activeEntity === "users" ? "المستخدم" : "الفرع"} "${activeEntity === "schools" ? itemToRestore.name : activeEntity === "users" ? itemToRestore.full_name || itemToRestore.email : itemToRestore.name}".` : ""}
        confirmLabel="نعم، استعد العنصر"
        cancelLabel="إلغاء"
        tone="primary"
        onClose={() => setItemToRestore(null)}
        onConfirm={async () => {
          const target = itemToRestore;
          setItemToRestore(null);
          if (target?.id) await handleRestore(target.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(itemToDeletePermanently)}
        title="حذف كامل من السلة"
        description={
          itemToDeletePermanently
            ? archivesBySchoolId[itemToDeletePermanently.id]
              ? `سيتم حذف المدرسة "${itemToDeletePermanently.name}" نهائياً من السلة مع حذف جميع نسخ الأرشيف المرتبطة بها. لا يمكن التراجع عن هذه العملية.`
              : `سيتم حذف المدرسة "${itemToDeletePermanently.name}" نهائياً من السلة. لا يمكن التراجع عن هذه العملية.`
            : ""
        }
        confirmLabel="نعم، احذف بالكامل"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setItemToDeletePermanently(null)}
        onConfirm={async () => {
          const target = itemToDeletePermanently;
          setItemToDeletePermanently(null);
          if (target?.id) await handlePermanentDeleteSchool(target.id, Boolean(archivesBySchoolId[target.id]));
        }}
      />
      <ConfirmDialog
        open={Boolean(archiveToDelete)}
        title="حذف نسخة الأرشيف"
        description={
          archiveToDelete
            ? `سيتم حذف نسخة الأرشيف الخاصة بالمدرسة "${archiveToDelete.school_name || "—"}".`
            : ""
        }
        confirmLabel="نعم، احذف النسخة"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setArchiveToDelete(null)}
        onConfirm={async () => {
          const target = archiveToDelete;
          setArchiveToDelete(null);
          if (target?.id) await handleDeleteArchive(target.id);
        }}
      />
    </div>
  );
}
