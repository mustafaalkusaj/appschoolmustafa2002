"use client";

import type { Permission } from "@/lib/auth";

export type ActiveTab =
  | "overview"
  | "schools"
  | "users"
  | "subscriptions"
  | "audit"
  | "roles"
  | "trash"
  | "notifications"
  | "monitoring"
  | "branches";

export type SchoolPlan = "basic" | "premium" | "enterprise";
export type SubscriptionStatus = "active" | "suspended" | "inactive" | "expired";

export type SchoolRelation = { name: string | null } | Array<{ name: string | null }> | null;

export interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  plan: SchoolPlan;
  is_active: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string | null;
}

export interface UserRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "super_admin" | "admin" | "employee";
  school_id: string | null;
  phone: string | null;
  is_active: boolean;
  custom_permissions: Permission[] | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

export interface SubscriptionRecord {
  id: string;
  school_id: string;
  plan: SchoolPlan;
  status: SubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

export type OverviewDatasetStatus = "loaded" | "fallback" | "failed";

export interface OverviewDiagnostics {
  generatedAt: string;
  warnings: string[];
  schoolsStatus: OverviewDatasetStatus;
  usersStatus: OverviewDatasetStatus;
  subscriptionsStatus: OverviewDatasetStatus;
}

export type SpotlightFilter =
  | "inactive_schools"
  | "expiring_subscriptions"
  | "orphan_users"
  | "missing_branding";

export interface TabItem {
  id: ActiveTab;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const PLAN_LABELS: Record<SchoolPlan, string> = {
  basic: "أساسية",
  premium: "مميزة",
  enterprise: "مؤسسية",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  inactive: "غير نشط",
  expired: "منتهي",
};

export const DEFAULT_SCHOOL_BRANDING = {
  primary_color: "#4f8cff",
  secondary_color: "#79d7ff",
  sidebar_color: "#dceeff",
  accent_color: "#3e7df7",
  text_color: "#12304a",
};

export const DAY_IN_MS = 24 * 60 * 60 * 1000;
