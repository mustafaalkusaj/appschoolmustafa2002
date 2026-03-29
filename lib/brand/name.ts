import { resolvePlaceholderText } from "@/lib/brand/shared";

export const BRAND_NAME_PLACEHOLDERS = {
  nameAr: "{{SCHOOL_NAME_AR}}",
  nameEn: "{{SCHOOL_NAME_EN}}",
} as const;

export const BRAND_NAME_DEFAULTS = {
  nameAr: "منصة إدارة المدرسة",
  nameEn: "School Management Platform",
  subtitleAr: "النظام المدرسي الموحد",
  subtitleEn: "Premium School Administration",
} as const;

export const SCHOOL_BRAND_NAME = {
  nameAr: resolvePlaceholderText(BRAND_NAME_PLACEHOLDERS.nameAr, BRAND_NAME_DEFAULTS.nameAr),
  nameEn: resolvePlaceholderText(BRAND_NAME_PLACEHOLDERS.nameEn, BRAND_NAME_DEFAULTS.nameEn),
  subtitleAr: BRAND_NAME_DEFAULTS.subtitleAr,
  subtitleEn: BRAND_NAME_DEFAULTS.subtitleEn,
} as const;
