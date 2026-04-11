"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  History,
  Info
} from "@/lib/icons";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { SectionCard, EmptyState, MigrationNotice, formatDate, cx } from "./UI";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";

interface AuditLog {
  id: string;
  actor_name: string | null;
  actor_email: string | null;
  action_type: string;
  entity_type: string;
  summary: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const PAGE_SIZE = 10;
const ENTITY_LABELS: Record<string, string> = {
  school: "مدرسة",
  user: "مستخدم",
  subscription: "اشتراك",
};

export function AuditLogTab({ infrastructure }: { infrastructure: AdminInfrastructure }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      if (query) {
        q = q.or(buildSafeOrFilter(["summary", "actor_name", "actor_email"], query));
      }

      if (actionFilter !== "all") {
        q = q.eq("action_type", actionFilter);
      }

      if (entityFilter !== "all") {
        q = q.eq("entity_type", entityFilter);
      }

      const { data, count, error } = await q
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, query, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!infrastructure.auditLogs) {
    return (
      <MigrationNotice description="جدول `audit_logs` غير موجود في قاعدة البيانات الحالية. شغّل `admin_infrastructure.sql` لتفعيل سجل العمليات وتتبع الإجراءات الإدارية." />
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="سجل العمليات (Audit Log)"
        description="تتبع جميع الإجراءات الحساسة التي قام بها مديرو النظام."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="بحث في السجلات..."
                className="ui-input min-h-0 py-2 ps-9 text-xs"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select 
              className="ui-input min-h-0 py-2 text-xs"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">جميع العمليات</option>
              <option value="create">إضافة</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
              <option value="login">تسجيل دخول</option>
            </select>
            <select 
              className="ui-input min-h-0 py-2 text-xs"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">جميع الكيانات</option>
              <option value="school">المدارس</option>
              <option value="user">المستخدمون</option>
              <option value="subscription">الاشتراكات</option>
            </select>
            <button
              type="button"
              className="ui-button ui-button--secondary inline-flex items-center gap-2 px-3 py-2"
              onClick={() => void fetchLogs()}
            >
              <RefreshCw size={14} />
              تحديث
            </button>
          </div>
        }
      >
        {loading && logs.length === 0 ? (
          <div className="space-y-3 py-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="sk h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState 
            icon={History}
            title="لا توجد سجلات"
            description="لم يتم العثور على أي عمليات مسجلة حالياً."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>المسؤول</th>
                  <th>العملية</th>
                  <th>الكيان</th>
                  <th>الوصف</th>
                  <th>التاريخ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-black text-[var(--text-primary)]">{log.actor_name || "نظام"}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">{log.actor_email || "system@internal"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={cx(
                        "ui-pill text-[10px]",
                        log.action_type === "delete" ? "ui-pill--danger" : 
                        log.action_type === "create" ? "ui-pill--success" :
                        log.action_type === "update" ? "ui-pill--warning" : ""
                      )}>
                        {log.action_type === "create" ? "إضافة" :
                         log.action_type === "update" ? "تعديل" :
                         log.action_type === "delete" ? "حذف" : 
                         log.action_type === "login" ? "دخول" : log.action_type}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-bold text-[var(--text-secondary)]">
                        {ENTITY_LABELS[log.entity_type] ?? "عنصر آخر"}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-xs font-semibold text-[var(--text-secondary)]">
                      {log.summary}
                    </td>
                    <td className="text-[11px] font-bold text-[var(--text-tertiary)]">
                      {formatDate(log.created_at)}
                    </td>
                    <td>
                      <button className="text-[var(--text-tertiary)] hover:text-[var(--primary)]">
                        <Info size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <p className="text-xs font-bold text-[var(--text-tertiary)]">
                  عرض {(page * PAGE_SIZE) + 1} إلى {Math.min((page + 1) * PAGE_SIZE, totalCount)} من أصل {totalCount} سجل
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="ui-button ui-button--secondary h-9 w-9 p-0 disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-xs font-black text-[var(--text-primary)]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="ui-button ui-button--secondary h-9 w-9 p-0 disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
