"use client";

import { DAY_IN_MS, type SchoolRelation } from "./types";
import { endOfDayBaghdad } from "@/lib/tz";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function relationName(value: SchoolRelation | undefined | null) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }
  return value?.name ?? null;
}

export function getErrorMessage(error: unknown, fallback = "حدث خطأ غير متوقع") {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function calculateDaysLeft(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return Math.ceil((endOfDayBaghdad(parsed).getTime() - Date.now()) / DAY_IN_MS);
}

export function isSubscriptionExpired(subscription: { status: string; end_date: string | null } | null | undefined) {
  if (!subscription) return true;
  if (subscription.status !== "active") return true;

  const days = calculateDaysLeft(subscription.end_date);
  return days !== null && days < 0;
}

export function statusTone(status: "success" | "warning" | "danger") {
  if (status === "success") return "ui-pill ui-pill--success";
  if (status === "warning") return "ui-pill ui-pill--warning";
  return "ui-pill ui-pill--danger";
}

export function createTintSurface(tint: string, percentage = 16) {
  return `color-mix(in srgb, ${tint} ${percentage}%, transparent)`;
}

import type { SpotlightFilter, OverviewDatasetStatus } from "./types";

export function spotlightFilterLabel(filter: SpotlightFilter): string {
  switch (filter) {
    case "inactive_schools": return "مدارس غير نشطة";
    case "expiring_subscriptions": return "اشتراكات قاربت على الانتهاء";
    case "orphan_users": return "مستخدمون بلا مدرسة";
    case "missing_branding": return "مدارس بدون هوية بصرية";
    default: return filter;
  }
}

export function datasetStatusMeta(status: OverviewDatasetStatus): { label: string; tone: string } {
  switch (status) {
    case "loaded": return { label: "محمّل", tone: "success" };
    case "fallback": return { label: "بيانات احتياطية", tone: "warning" };
    case "failed": return { label: "فشل التحميل", tone: "danger" };
    default: return { label: status, tone: "warning" };
  }
}

