"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { SectionCard, cx } from "./UI";

interface OpsErrorRecord {
  id: string;
  created_at: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "investigating" | "fixed" | "ignored";
  source: string;
  route: string | null;
  page_url: string | null;
  action: string | null;
  user_role: string | null;
  status_code: number | null;
  error_message: string;
  occurrence_count: number;
  last_seen_at: string;
}

type FilterStatus = "" | "open" | "investigating" | "fixed" | "ignored";
type FilterSeverity = "" | "info" | "warning" | "critical";

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border border-red-300",
  warning: "bg-amber-100 text-amber-700 border border-amber-300",
  info: "bg-blue-100 text-blue-600 border border-blue-200",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-red-50 text-red-600",
  investigating: "bg-amber-50 text-amber-700",
  fixed: "bg-green-50 text-green-700",
  ignored: "bg-gray-100 text-gray-500",
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟡",
  info: "🔵",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-IQ-u-nu-latn", {
      timeZone: "Asia/Baghdad",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ErrorsTab() {
  const [errors, setErrors] = useState<OpsErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("open");
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<Record<string, string>>({});
  const [loadingPromptId, setLoadingPromptId] = useState<string | null>(null);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      if (severityFilter) params.set("severity", severityFilter);

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        errors: OpsErrorRecord[];
      }>(`/api/web/super-admin/ops-errors?${params.toString()}`);

      if (!response.ok) {
        setFetchError("تعذر تحميل الأخطاء.");
        return;
      }
      setErrors(payload?.errors ?? []);
    } catch {
      setFetchError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    void fetchErrors();
  }, [fetchErrors]);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      setUpdatingId(id);
      try {
        const { response } = await fetchJsonWithAuthorizedSession(
          `/api/web/super-admin/ops-errors?id=${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        if (response.ok) {
          setErrors((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, status: status as OpsErrorRecord["status"] }
                : e,
            ),
          );
        }
      } catch {
        // ignore
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  const loadAndCopyPrompt = useCallback(
    async (id: string) => {
      if (promptText[id]) {
        await navigator.clipboard.writeText(promptText[id]).catch(() => {});
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        return;
      }

      setLoadingPromptId(id);
      try {
        // Fetch via the token-protected prompt endpoint
        // The OPS token is not available client-side, so we use the web route
        // which returns the full record including fix_prompt
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          error: { fix_prompt: string | null };
        }>(`/api/web/super-admin/ops-errors/${id}`);

        if (response.ok && payload?.error?.fix_prompt) {
          const text = payload.error.fix_prompt;
          setPromptText((prev) => ({ ...prev, [id]: text }));
          await navigator.clipboard.writeText(text).catch(() => {});
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        }
      } catch {
        // ignore
      } finally {
        setLoadingPromptId(null);
      }
    },
    [promptText],
  );

  return (
    <SectionCard
      title="أخطاء الإنتاج"
      description="أخطاء ملتقطة من API والواجهة. انسخ Fix Prompt وشغّله في Codex لإصلاح الخطأ."
      actions={
        <button
          onClick={() => void fetchErrors()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="flex items-center text-sm text-gray-500">الحالة:</span>
        {(
          ["", "open", "investigating", "fixed", "ignored"] as FilterStatus[]
        ).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cx(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition",
              statusFilter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {s === ""
              ? "الكل"
              : s === "open"
                ? "مفتوح"
                : s === "investigating"
                  ? "تحت التحقيق"
                  : s === "fixed"
                    ? "تم الإصلاح"
                    : "مُتجاهل"}
          </button>
        ))}
        <span className="ml-3 flex items-center text-sm text-gray-500">
          الخطورة:
        </span>
        {(["", "critical", "warning", "info"] as FilterSeverity[]).map(
          (sv) => (
            <button
              key={sv}
              onClick={() => setSeverityFilter(sv)}
              className={cx(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                severityFilter === sv
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {sv === ""
                ? "الكل"
                : sv === "critical"
                  ? "🔴 حرج"
                  : sv === "warning"
                    ? "🟡 تحذير"
                    : "🔵 معلومة"}
            </button>
          ),
        )}
      </div>

      {fetchError && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {loading && (
        <div className="py-10 text-center text-sm text-gray-400">
          جارٍ التحميل...
        </div>
      )}

      {!loading && errors.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">
          <AlertTriangle size={24} className="mx-auto mb-2 text-gray-300" />
          لا توجد أخطاء مطابقة للفلتر الحالي.
        </div>
      )}

      {!loading && errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err) => (
            <div
              key={err.id}
              className={cx(
                "rounded-2xl border p-4 transition",
                err.severity === "critical"
                  ? "border-red-200 bg-red-50/40"
                  : err.severity === "warning"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-gray-200 bg-white",
              )}
            >
              {/* Header row */}
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className={cx(
                    "rounded-lg px-2 py-0.5 text-xs font-bold",
                    SEVERITY_BADGE[err.severity] ?? "",
                  )}
                >
                  {SEVERITY_EMOJI[err.severity]} {err.severity}
                </span>
                <span
                  className={cx(
                    "rounded-lg px-2 py-0.5 text-xs font-semibold",
                    STATUS_BADGE[err.status] ?? "",
                  )}
                >
                  {err.status === "open"
                    ? "مفتوح"
                    : err.status === "investigating"
                      ? "تحت التحقيق"
                      : err.status === "fixed"
                        ? "تم الإصلاح"
                        : "مُتجاهل"}
                </span>
                <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {err.source}
                </span>
                {err.status_code !== null && (
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
                    {err.status_code}
                  </span>
                )}
                {err.occurrence_count > 1 && (
                  <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                    ×{err.occurrence_count}
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {formatDate(err.last_seen_at)}
                </span>
              </div>

              {/* Message */}
              <p className="mt-2 line-clamp-2 font-mono text-sm text-gray-800">
                {err.error_message}
              </p>

              {/* Meta */}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                {err.route && (
                  <span>
                    مسار: <code>{err.route}</code>
                  </span>
                )}
                {err.action && <span>إجراء: {err.action}</span>}
                {err.user_role && <span>دور: {err.user_role}</span>}
              </div>

              {/* Expanded prompt preview */}
              {expandedId === err.id && promptText[err.id] && (
                <pre className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-gray-900 p-3 text-xs text-green-300 whitespace-pre-wrap">
                  {promptText[err.id]}
                </pre>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void loadAndCopyPrompt(err.id)}
                  disabled={loadingPromptId === err.id}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {copiedId === err.id ? (
                    <>
                      <CheckCircle2 size={13} /> تم النسخ
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      {loadingPromptId === err.id
                        ? "جارٍ التحميل..."
                        : "نسخ Fix Prompt"}
                    </>
                  )}
                </button>

                {promptText[err.id] && (
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === err.id ? null : err.id)
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Eye size={13} />
                    {expandedId === err.id ? "إخفاء" : "عرض Prompt"}
                  </button>
                )}

                {(err.status === "open" || err.status === "investigating") && (
                  <button
                    onClick={() => void updateStatus(err.id, "fixed")}
                    disabled={updatingId === err.id}
                    className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={13} />
                    تم الإصلاح
                  </button>
                )}

                {(err.status === "open" || err.status === "investigating") && (
                  <button
                    onClick={() => void updateStatus(err.id, "ignored")}
                    disabled={updatingId === err.id}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <XCircle size={13} />
                    تجاهل
                  </button>
                )}

                {err.status === "open" && (
                  <button
                    onClick={() => void updateStatus(err.id, "investigating")}
                    disabled={updatingId === err.id}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                  >
                    تحت التحقيق
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
