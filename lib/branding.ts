const PLACEHOLDER_PATTERN = /\{\{.+\}\}/;

function resolveValue(value: string | null | undefined, fallback: string) {
  if (!value || PLACEHOLDER_PATTERN.test(value.trim())) {
    return fallback;
  }

  return value;
}

function resolveLogo(value: string | null | undefined) {
  if (!value || PLACEHOLDER_PATTERN.test(value.trim())) {
    return null;
  }

  return value;
}

export const BRAND_PLACEHOLDERS = {
  nameAr: "{{SCHOOL_NAME_AR}}",
  nameEn: "{{SCHOOL_NAME_EN}}",
  logo: "{{SCHOOL_LOGO}}",
} as const;

export const SCHOOL_BRAND = {
  nameAr: resolveValue(BRAND_PLACEHOLDERS.nameAr, "منصة إدارة المدرسة"),
  nameEn: resolveValue(BRAND_PLACEHOLDERS.nameEn, "School Management Platform"),
  logo: resolveLogo(BRAND_PLACEHOLDERS.logo),
  subtitleAr: "النظام المدرسي الموحد",
  subtitleEn: "Premium School Administration",
  accent: "#4F8CFF",
  accentSoft: "#79D7FF",
} as const;

export function hasCustomSchoolLogo() {
  return Boolean(SCHOOL_BRAND.logo);
}
