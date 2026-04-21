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
import { SectionCard, EmptyState, MigrationNotice, formatDate, cx } from "./UI";
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
        {
        method: "DELETE",
        },
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

  return (
    <div className="space-y-6">
      {message ? <MigrationNotice title="تنبيه" description={message} /> : null}
      <div className="flex gap-2">
        {availableEntities.includes("schools") ? (
          <button
            onClick={() => setActiveEntity("schools")}
            className={cx(
              "ui-button flex-1 sm:flex-none inline-flex items-center gap-2",
              activeEntity === "schools" ? "ui-button--primary" : "ui-button--secondary"
            )}
          >
            <Building2 size={16} />
            المدارس المحذوفة
          </button>
        ) : null}
        {availableEntities.includes("users") ? (
          <button
            onClick={() => setActiveEntity("users")}
            className={cx(
              "ui-button flex-1 sm:flex-none inline-flex items-center gap-2",
              activeEntity === "users" ? "ui-button--primary" : "ui-button--secondary"
            )}
          >
            <Users size={16} />
            المستخدمون المحذوفون
          </button>
        ) : null}
        {availableEntities.includes("branches") ? (
          <button
            onClick={() => setActiveEntity("branches")}
            className={cx(
              "ui-button flex-1 sm:flex-none inline-flex items-center gap-2",
              activeEntity === "branches" ? "ui-button--primary" : "ui-button--secondary"
            )}
          >
            <GitBranch size={16} />
            الفروع المحذوفة
          </button>
        ) : null}
      </div>

      <SectionCard
        title="سلة المحذوفات"
        description="إدارة العناصر التي تم حذفها مؤقتاً مع إمكانية استعادتها."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="بحث..."
                className="ui-input min-h-0 py-2 ps-9 text-xs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ui-button ui-button--secondary h-9 w-9 p-0"
              onClick={() => void fetchDeleted()}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3 py-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="sk h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState 
            icon={Trash2}
            title="السلة فارغة"
            description={`لا توجد ${
              activeEntity === "schools" ? "مدارس" : activeEntity === "users" ? "مستخدمون" : "فروع"
            } محذوفة حالياً.`}
          />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              (() => {
                const archive = activeEntity === "schools" ? archivesBySchoolId[item.id] ?? null : null;
                return (
              <div key={item.id} className="ui-surface flex items-center justify-between rounded-[24px] p-4 border-dashed border-2">
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                    {activeEntity === "schools" ? <Building2 size={20} /> : activeEntity === "users" ? <Users size={20} /> : <GitBranch size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-[var(--text-primary)]">
                      {activeEntity === "schools"
                        ? item.name
                        : activeEntity === "users"
                          ? item.full_name || item.email
                          : item.name}
                    </h4>
                    <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                      تاريخ الحذف: {formatDate(item.deleted_at)}
                    </p>
                    {archive ? (
                      <p className="text-xs font-semibold text-[var(--primary)]">
                        آخر نسخة أرشيف: {formatDate(archive.created_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {archive ? (
                    <>
                      <button
                        onClick={() => void downloadArchive(archive)}
                        className="ui-button ui-button--secondary inline-flex items-center gap-2"
                      >
                        <Download size={16} />
                        تحميل النسخة
                      </button>
                      <button
                        onClick={() => setArchiveToDelete(archive)}
                        className="ui-button ui-button--secondary inline-flex items-center gap-2"
                      >
                        <Archive size={16} />
                        حذف نسخة الأرشيف
                      </button>
                    </>
                  ) : null}
                  {activeEntity === "schools" ? (
                    <button
                      onClick={() => setItemToDeletePermanently(item)}
                      className="ui-button ui-button--danger inline-flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      حذف كامل
                    </button>
                  ) : null}
                  <button
                    onClick={() => setItemToRestore(item)}
                    className="ui-button ui-button--secondary inline-flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    استعادة
                  </button>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </SectionCard>
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
          if (target?.id) {
            await handleRestore(target.id);
          }
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
          if (target?.id) {
            await handlePermanentDeleteSchool(target.id, Boolean(archivesBySchoolId[target.id]));
          }
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
          if (target?.id) {
            await handleDeleteArchive(target.id);
          }
        }}
      />
    </div>
  );
}
