"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// ─── Types ────────────────────────────────────────────────────────────────────

type OpsCheck = { ok: boolean; status: string; message: string };
type OpsReport = {
  status: string;
  score: number;
  summary: string;
  checks: {
    domain: OpsCheck;
    vercel: OpsCheck;
    supabaseAuth: OpsCheck;
    database: OpsCheck;
    storage: OpsCheck;
    upstash: OpsCheck;
    subscriptions: OpsCheck;
  };
  subscriptionSnapshot: {
    active_count: number | null;
    expired_count: number | null;
    expiring_7_days_count: number | null;
    expiring_30_days_count: number | null;
  };
};

// ─── DB row → OpsReport mapper ────────────────────────────────────────────────
// /api/ops/latest returns raw ops_health_reports rows. Column names differ
// from the in-memory OpsReport shape built by buildOpsReport(). This function
// maps the flat DB row to the display shape expected by the UI.
function mapDbRowToReport(row: Record<string, unknown>): OpsReport {
  const placeholder = (msg?: string): OpsCheck => ({
    ok: false,
    status: "down",
    message: msg ?? "لا توجد بيانات",
  });

  // subscriptions_status JSONB also embeds the snapshot
  const subsSt = (row.subscriptions_status ?? {}) as Record<string, unknown>;
  const snap = (subsSt.snapshot ?? {}) as Record<string, unknown>;

  const getCheck = (key: string): OpsCheck => {
    const v = row[key];
    if (!v || typeof v !== "object") return placeholder();
    const c = v as Record<string, unknown>;
    return {
      ok: Boolean(c.ok),
      status: typeof c.status === "string" ? c.status : "down",
      message: typeof c.message === "string" ? c.message : "",
    };
  };

  return {
    status: typeof row.status === "string" ? row.status : "unknown",
    score: typeof row.score === "number" ? row.score : 0,
    summary: typeof row.summary === "string" ? row.summary : "",
    checks: {
      domain: getCheck("domain_status"),
      vercel: getCheck("vercel_status"),
      supabaseAuth: getCheck("auth_status"),
      database: getCheck("database_status"),
      storage: getCheck("storage_status"),
      upstash: getCheck("upstash_status"),
      subscriptions: {
        ok: Boolean(subsSt.ok),
        status: typeof subsSt.status === "string" ? subsSt.status : "healthy",
        message: typeof subsSt.message === "string" ? subsSt.message : "",
      },
    },
    subscriptionSnapshot: {
      active_count: typeof snap.active_count === "number" ? snap.active_count : null,
      expired_count: typeof snap.expired_count === "number" ? snap.expired_count : null,
      expiring_7_days_count:
        typeof snap.expiring_7_days_count === "number" ? snap.expiring_7_days_count : null,
      expiring_30_days_count:
        typeof snap.expiring_30_days_count === "number" ? snap.expiring_30_days_count : null,
    },
  };
}

type OpsError = {
  id: string;
  created_at: string;
  severity: string;
  status: string;
  source: string;
  route: string | null;
  error_message: string;
  occurrence_count: number;
};

type AuditLog = {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_source: string;
  action_type: string;
  entity_type: string | null;
  summary: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusIcon(status: string) {
  if (status === "healthy") return "✅";
  if (status === "degraded") return "⚠️";
  return "❌";
}

function severityColor(severity: string) {
  if (severity === "critical") return "#dc2626";
  if (severity === "warning") return "#d97706";
  return "#2563eb";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-IQ", {
      timeZone: "Asia/Baghdad",
    });
  } catch {
    return iso;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

function OpsPageContent() {
  const [report, setReport] = useState<OpsReport | null>(null);
  const [errors, setErrors] = useState<OpsError[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deepCheckLoading, setDeepCheckLoading] = useState(false);
  const [deepCheckResult, setDeepCheckResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [latestRes, errorsRes, auditRes] = await Promise.all([
        fetchJsonWithAuthorizedSession("/api/ops/latest"),
        fetchJsonWithAuthorizedSession("/api/web/super-admin/ops-errors?limit=10&status=open"),
        fetchJsonWithAuthorizedSession("/api/ops/audit-logs?limit=20"),
      ]);

      const latest = latestRes.payload as Record<string, unknown> | null;
      const errorsData = errorsRes.payload as Record<string, unknown> | null;
      const auditData = auditRes.payload as Record<string, unknown> | null;

      if (latest?.ok && latest.report && typeof latest.report === "object") {
        // Map flat DB row → display-friendly OpsReport shape
        setReport(mapDbRowToReport(latest.report as Record<string, unknown>));
      }
      if (errorsData?.ok) {
        setErrors((errorsData.errors as OpsError[]) ?? []);
      }
      if (auditData?.ok) {
        setAuditLogs((auditData.logs as AuditLog[]) ?? []);
      }
    } catch {
      setErrorMessage("تعذر تحميل بيانات لوحة الـ Ops.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchAll();
  };

  const handleDeepCheck = async () => {
    setDeepCheckLoading(true);
    setDeepCheckResult(null);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession(
        "/api/ops/deepcheck",
        { method: "POST" },
      );
      const res = payload as Record<string, unknown> | null;
      if (res?.ok) {
        const r = res.report as OpsReport | null;
        const errs = res.errorSummary as { open: number; critical: number } | null;
        setDeepCheckResult(
          `الحالة: ${r?.status ?? "?"} | التقييم: ${r?.score ?? "?"}/100 | الأخطاء المفتوحة: ${errs?.open ?? "?"} (حرجة: ${errs?.critical ?? "?"})`,
        );
        setSuccessMessage("تم تنفيذ الفحص الشامل بنجاح.");
      } else {
        setDeepCheckResult("تعذر تنفيذ الفحص الشامل.");
      }
    } catch {
      setDeepCheckResult("تعذر تنفيذ الفحص الشامل.");
    } finally {
      setDeepCheckLoading(false);
    }
  };

  const handleMarkError = async (id: string, status: "fixed" | "ignored") => {
    try {
      const { payload } = await fetchJsonWithAuthorizedSession(
        `/api/web/super-admin/ops-errors?id=${id}`,
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ status }),
        },
      );
      const res = payload as Record<string, unknown> | null;
      if (res?.ok) {
        setErrors((prev) => prev.filter((e) => e.id !== id));
        setSuccessMessage(`تم تحديث حالة الخطأ إلى ${status}.`);
      }
    } catch {
      setErrorMessage("تعذر تحديث حالة الخطأ.");
    }
  };

  const handleSendTelegramTest = async () => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession(
        "/api/ops/notification-test",
        { method: "POST" },
      );
      const res = payload as Record<string, unknown> | null;
      if (!response.ok) {
        const msg = (res as Record<string, unknown> | null)?.message;
        setErrorMessage(`تعذر إرسال الاختبار (${response.status})${msg ? `: ${msg}` : ""}`);
        return;
      }
      // ok=true means route ran; sent=true means a channel actually delivered
      const sent = res?.sent as boolean | undefined;
      const channel = res?.primaryChannel as string | undefined;
      if (sent) {
        setSuccessMessage(`تم إرسال رسالة اختبار عبر ${channel ?? "مجهول"}.`);
      } else {
        setSuccessMessage("تم تشغيل اختبار الإشعارات — لم يُرسل عبر أي قناة (Telegram/Email معطل أو throttled).");
      }
    } catch {
      setErrorMessage("تعذر الاتصال بـ API.");
    }
  };

  const handleSendDailyReport = async () => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession(
        "/api/ops/daily-report",
        { method: "POST" },
      );
      const res = payload as Record<string, unknown> | null;
      if (!response.ok) {
        const msg = (res as Record<string, unknown> | null)?.message;
        setErrorMessage(`تعذر إرسال التقرير (${response.status})${msg ? `: ${msg}` : ""}`);
        return;
      }
      const summary = res?.summary as string | undefined;
      const score = res?.score as number | undefined;
      setSuccessMessage(
        `تم إرسال التقرير اليومي — الحالة: ${res?.status ?? "?"} | التقييم: ${score ?? "?"}/100${summary ? ` | ${summary.slice(0, 80)}` : ""}`,
      );
    } catch {
      setErrorMessage("تعذر الاتصال بـ API.");
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 20,
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  };

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "right",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 600,
    color: "#374151",
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    color: "#111827",
  };

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          لوحة Ops
        </h1>
        <button
          style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "جاري التحديث..." : "تحديث"}
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {errorMessage}
          <button
            style={{
              marginRight: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#991b1b",
              fontWeight: 700,
            }}
            onClick={() => setErrorMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div
          style={{
            background: "#d1fae5",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {successMessage}
          <button
            style={{
              marginRight: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#065f46",
              fontWeight: 700,
            }}
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          style={{ ...btnStyle, background: "#1d4ed8", color: "#fff" }}
          onClick={handleDeepCheck}
          disabled={deepCheckLoading}
        >
          {deepCheckLoading ? "جاري الفحص..." : "فحص شامل"}
        </button>
        <button
          style={{ ...btnStyle, background: "#0891b2", color: "#fff" }}
          onClick={handleSendTelegramTest}
        >
          إرسال Telegram اختبار
        </button>
        <button
          style={{ ...btnStyle, background: "#7c3aed", color: "#fff" }}
          onClick={handleSendDailyReport}
        >
          إرسال تقرير يومي
        </button>
      </div>

      {deepCheckResult && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {deepCheckResult}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
          جاري التحميل...
        </div>
      ) : (
        <>
          {/* Health Report */}
          {report && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>
                حالة النظام
              </h2>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <strong>الحالة:</strong>{" "}
                  {statusIcon(report.status)} {report.status}
                </div>
                <div>
                  <strong>التقييم:</strong> {report.score}/100
                </div>
                <div>
                  <strong>نشطة:</strong> {report.subscriptionSnapshot.active_count ?? "?"}
                </div>
                <div>
                  <strong>منتهية:</strong>{" "}
                  {report.subscriptionSnapshot.expired_count ?? 0}
                </div>
                <div>
                  <strong>تنتهي خلال 7 أيام:</strong>{" "}
                  {report.subscriptionSnapshot.expiring_7_days_count ?? 0}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 8,
                }}
              >
                {Object.entries(report.checks).map(([key, check]) => (
                  <div
                    key={key}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: check.status === "healthy" ? "#f0fdf4" : check.status === "degraded" ? "#fffbeb" : "#fef2f2",
                      border: `1px solid ${check.status === "healthy" ? "#bbf7d0" : check.status === "degraded" ? "#fde68a" : "#fecaca"}`,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {statusIcon(check.status)} {key}
                    </div>
                    <div style={{ color: "#6b7280", marginTop: 2 }}>
                      {(check.message ?? "").slice(0, 60)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors Table */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>
              الأخطاء المفتوحة ({errors.length})
            </h2>
            {errors.length === 0 ? (
              <p style={{ color: "#6b7280" }}>لا توجد أخطاء مفتوحة.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>الخطورة</th>
                      <th style={thStyle}>المصدر</th>
                      <th style={thStyle}>المسار</th>
                      <th style={thStyle}>الرسالة</th>
                      <th style={thStyle}>التكرار</th>
                      <th style={thStyle}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err) => (
                      <tr key={err.id}>
                        <td style={tdStyle}>
                          <code style={{ fontSize: 11 }}>{err.id.slice(0, 8)}</code>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              color: severityColor(err.severity),
                              fontWeight: 600,
                            }}
                          >
                            {err.severity}
                          </span>
                        </td>
                        <td style={tdStyle}>{err.source}</td>
                        <td style={tdStyle}>
                          <code style={{ fontSize: 11 }}>
                            {err.route ?? "—"}
                          </code>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 250 }}>
                          <span
                            title={err.error_message}
                            style={{
                              overflow: "hidden",
                              display: "block",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {err.error_message.slice(0, 80)}
                          </span>
                        </td>
                        <td style={tdStyle}>{err.occurrence_count}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              style={{
                                ...btnStyle,
                                padding: "4px 8px",
                                background: "#d1fae5",
                                color: "#065f46",
                                fontSize: 12,
                              }}
                              onClick={() => handleMarkError(err.id, "fixed")}
                            >
                              fixed
                            </button>
                            <button
                              style={{
                                ...btnStyle,
                                padding: "4px 8px",
                                background: "#f3f4f6",
                                color: "#374151",
                                fontSize: 12,
                              }}
                              onClick={() => handleMarkError(err.id, "ignored")}
                            >
                              ignore
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Log Table */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>
              سجل العمليات
            </h2>
            {auditLogs.length === 0 ? (
              <p style={{ color: "#6b7280" }}>لا توجد سجلات حتى الآن.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>التاريخ</th>
                      <th style={thStyle}>المستخدم</th>
                      <th style={thStyle}>المصدر</th>
                      <th style={thStyle}>الإجراء</th>
                      <th style={thStyle}>نوع الكيان</th>
                      <th style={thStyle}>الملخص</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={tdStyle}>
                          {log.actor_name ?? log.actor_email ?? "—"}
                        </td>
                        <td style={tdStyle}>{log.actor_source}</td>
                        <td style={tdStyle}>
                          <code style={{ fontSize: 11 }}>{log.action_type}</code>
                        </td>
                        <td style={tdStyle}>{log.entity_type ?? "—"}</td>
                        <td style={{ ...tdStyle, maxWidth: 300 }}>
                          {log.summary?.slice(0, 100) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function OpsPage() {
  return (
    <ProtectedRoute roles={["super_admin"]}>
      <OpsPageContent />
    </ProtectedRoute>
  );
}
