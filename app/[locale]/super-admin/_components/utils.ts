"use client";

import { DAY_IN_MS, type SchoolRelation, type OverviewDatasetStatus } from "./types";

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

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ar-IQ", {
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

  return Math.ceil((parsed.getTime() - Date.now()) / DAY_IN_MS);
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

export function datasetStatusMeta(status: OverviewDatasetStatus) {
  if (status === "loaded") {
    return { label: "محمّل بالكامل", tone: "ui-pill ui-pill--success" };
  }

  if (status === "fallback") {
    return { label: "وضع بديل", tone: "ui-pill ui-pill--warning" };
  }

  return { label: "تحميل ناقص", tone: "ui-pill ui-pill--danger" };
}

export function spotlightFilterLabel(filter: string | null) {
  switch (filter) {
    case "inactive_schools":
      return "المدارس غير النشطة";
    case "expiring_subscriptions":
      return "الاشتراكات القريبة من الانتهاء";
    case "orphan_users":
      return "المستخدمون بدون مدرسة";
    case "missing_branding":
      return "المدارس ذات الهوية غير المكتملة";
    default:
      return "";
  }
}
