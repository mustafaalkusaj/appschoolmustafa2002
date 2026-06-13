"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Info,
  FileDown,
} from "@/lib/icons";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { MigrationNotice, formatDate, cx } from "./UI";
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
  const [actorFilter, setActorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actorFilter) {
        const actor = ((log.actor_name ?? "") + " " + (log.actor_email ?? "")).toLowerCase();
        if (!actor.includes(actorFilter.toLowerCase())) return false;
      }
      if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [logs, actorFilter, dateFrom, dateTo]);

  const exportCSV = useCallback(() => {
    const headers = ["الفاعل", "الإجراء", "النوع", "الملخص", "التاريخ"];
    const rows = filteredLogs.map((l) => [
      `"${(l.actor_name ?? l.actor_email ?? "—").replace(/"/g, '""')}"`,
      l.action_type,
      l.entity_type,
      `"${(l.summary ?? "").replace(/"/g, '""')}"`,
      l.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!infrastructure.auditLogs) {
    return (
      <MigrationNotice description="جدول `audit_logs` غير موجود في قاعدة البيانات الحالية. شغّل `admin_infrastructure.sql` لتفعيل سجل العمليات وتتبع الإجراءات الإدارية." />
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact inline header + filters */}
      <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[var(--border)]">
        <span className="text-xs font-black text-[var(--text-primary)]">سجل العمليات (Audit Log)</span>
        <div className="relative flex-1 min-w-[120px]">
          <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="بحث في السجلات..."
            className="h-6 w-full rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)]"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-1 text-[11px] text-[var(--text-secondary)]"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
        >
          <option value="all">جميع العمليات</option>
          <option value="create">إضافة</option>
          <option value="update">تعديل</option>
          <option value="delete">حذف</option>
          <option value="login">تسجيل دخول</option>
        </select>
        <select
          className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-1 text-[11px] text-[var(--text-secondary)]"
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(0); }}
        >
          <option value="all">جميع الكيانات</option>
          <option value="school">المدارس</option>
          <option value="user">المستخدمون</option>
          <option value="subscription">الاشتراكات</option>
        </select>
        <input
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setPage(0); }}
          placeholder="فلتر بالمستخدم..."
          className="h-6 px-2 text-[11px] rounded border border-[var(--border)] bg-[var(--surface-muted)] outline-none focus:border-[var(--primary)] min-w-[120px]"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="h-6 px-2 text-[11px] rounded border border-[var(--border)] bg-[var(--surface-muted)] outline-none focus:border-[var(--primary)]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="h-6 px-2 text-[11px] rounded border border-[var(--border)] bg-[var(--surface-muted)] outline-none focus:border-[var(--primary)]"
        />
        <button
          type="button"
          title="تصدير CSV"
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-40"
          onClick={exportCSV}
          disabled={filteredLogs.length === 0}
        >
          <FileDown size={11} />
        </button>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => void fetchLogs()}
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Table */}
      {loading && logs.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="sk h-8 w-full rounded" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد سجلات</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">المسؤول</th>
                <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">العملية</th>
                <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">الكيان</th>
                <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">الوصف</th>
                <th className="py-1.5 px-2 text-start text-[10px] font-black text-[var(--text-muted)] uppercase border-b border-[var(--border)]">التاريخ</th>
                <th className="py-1.5 px-2 border-b border-[var(--border)]" />
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className="hover:bg-[var(--surface-muted)] cursor-pointer transition-colors"
                  >
                    <td className="py-1.5 px-2 border-b border-[var(--border)]">
                      <div className="font-black text-[var(--text-primary)]">{log.actor_name || "نظام"}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{log.actor_email || "system@internal"}</div>
                    </td>
                    <td className="py-1.5 px-2 border-b border-[var(--border)]">
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
                    <td className="py-1.5 px-2 border-b border-[var(--border)] text-[var(--text-secondary)]">
                      {ENTITY_LABELS[log.entity_type] ?? "عنصر آخر"}
                    </td>
                    <td className="py-1.5 px-2 border-b border-[var(--border)] max-w-xs truncate text-[var(--text-secondary)]">
                      {log.summary}
                    </td>
                    <td className="py-1.5 px-2 border-b border-[var(--border)] text-[var(--text-muted)]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-1.5 px-2 border-b border-[var(--border)]">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === log.id ? null : log.id); }}
                        className={cx("transition-colors", expandedId === log.id ? "text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--primary)]")}
                      >
                        <Info size={13} />
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && log.metadata && (
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                      <td colSpan={6} className="px-4 py-2">
                        <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap max-h-32 overflow-y-auto font-mono bg-[var(--surface-muted)] rounded p-2">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2">
              <p className="text-[10px] font-bold text-[var(--text-muted)]">
                {(page * PAGE_SIZE) + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} من {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text-primary)]"
                >
                  <ChevronRight size={13} />
                </button>
                <span className="text-[10px] font-black text-[var(--text-primary)]">
                  {page + 1}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-30 hover:text-[var(--text-primary)]"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
