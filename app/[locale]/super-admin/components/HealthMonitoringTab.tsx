"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Server, Clock, Activity } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface HealthStatus {
  status: "healthy" | "warning" | "critical";
  message: string;
  uptime?: string;
  latency?: number;
}

interface SystemMetrics {
  database: HealthStatus;
  api: HealthStatus;
  storage: HealthStatus;
  memory: number;
  cpu: number;
  activeConnections: number;
  lastChecked: Date;
}

export function HealthMonitoringTab() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      setError(null);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          database?: HealthStatus;
          api?: HealthStatus;
          storage?: HealthStatus;
          memory?: number;
          cpu?: number;
          activeConnections?: number;
          lastChecked?: string;
          error?: { message?: string };
        }>("/api/web/super-admin/health");

        if (!response.ok) {
          setError(payload?.error?.message || "تعذر تحميل معلومات الصحة");
          setMetrics(null);
          return;
        }

        if (payload?.database && payload?.api && payload?.storage) {
          setMetrics({
            database: payload.database,
            api: payload.api,
            storage: payload.storage,
            memory: payload.memory ?? 0,
            cpu: payload.cpu ?? 0,
            activeConnections: payload.activeConnections ?? 0,
            lastChecked: payload.lastChecked ? new Date(payload.lastChecked) : new Date(),
          });
        } else {
          setError("بيانات غير صحيحة من الخادم");
          setMetrics(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ في الاتصال بالخادم");
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent mx-auto" />
          <p className="text-[var(--text-secondary)]">جاري التحقق من صحة النظام...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-600" size={32} />
          <p className="text-[var(--text-secondary)]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold"
          >
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Activity className="mx-auto mb-4 text-[var(--text-tertiary)]" size={32} />
          <p className="text-[var(--text-secondary)]">لا توجد بيانات متاحة</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-600 border-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-600 border-yellow-200";
      case "critical":
        return "bg-red-100 text-red-600 border-red-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    return status === "healthy" ? CheckCircle2 : AlertTriangle;
  };

  return (
    <div className="space-y-6 p-6">
      {/* System Status Overview */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          حالة النظام
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "قاعدة البيانات", service: metrics.database, icon: Database },
            { label: "واجهة البرنامج", service: metrics.api, icon: Server },
            { label: "التخزين", service: metrics.storage, icon: Activity },
          ].map(({ label, service, icon: Icon }) => {
            const StatusIcon = getStatusIcon(service.status);
            return (
              <div
                key={label}
                className={`rounded-[24px] border-2 p-5 ${getStatusColor(service.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-2 text-xs opacity-80">{service.message}</p>
                    {service.latency && (
                      <p className="mt-1 text-xs font-bold">
                        Latency: {service.latency}ms
                      </p>
                    )}
                  </div>
                  <StatusIcon size={24} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resource Usage */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          استخدام الموارد
        </h3>
        <div className="space-y-5">
          {[
            { label: "استخدام الذاكرة", value: metrics.memory, color: "bg-blue-500" },
            { label: "استخدام المعالج", value: metrics.cpu, color: "bg-purple-500" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-[var(--text-secondary)]">
                  {label}
                </p>
                <p className="text-sm font-black text-[var(--text-primary)]">
                  {value}%
                </p>
              </div>
              <div className="h-3 rounded-full bg-[var(--surface-muted)]">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connections & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            الاتصالات النشطة
          </h3>
          <p className="text-4xl font-black text-blue-600">
            {metrics.activeConnections}
          </p>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            اتصال نشط حالياً
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-[var(--text-tertiary)]" />
            <h3 className="text-sm font-bold text-[var(--text-tertiary)]">
              آخر فحص
            </h3>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {metrics.lastChecked.toLocaleTimeString("ar-IQ")}
          </p>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            التحقق التلقائي كل 30 ثانية
          </p>
        </div>
      </div>

      {/* Active Alerts - Only show if there are warnings/critical issues */}
      {([metrics.database, metrics.api, metrics.storage].some((s) => s.status !== "healthy") ||
        metrics.memory > 80 ||
        metrics.cpu > 80) && (
        <div className="rounded-[24px] border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 text-yellow-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">التنبيهات النشطة</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                {metrics.database.status !== "healthy" && (
                  <li>• قاعدة البيانات: {metrics.database.message}</li>
                )}
                {metrics.api.status !== "healthy" && <li>• واجهة البرنامج: {metrics.api.message}</li>}
                {metrics.storage.status !== "healthy" && (
                  <li>• التخزين: {metrics.storage.message}</li>
                )}
                {metrics.memory > 80 && <li>• استخدام الذاكرة مرتفع ({metrics.memory}%)</li>}
                {metrics.cpu > 80 && <li>• استخدام المعالج مرتفع ({metrics.cpu}%)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
