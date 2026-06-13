import { resolvePlaceholderAsset } from "@/lib/brand/shared";

export const BRAND_LOGO_PLACEHOLDER = "{{SCHOOL_LOGO}}" as const;

export const SCHOOL_BRAND_LOGO = resolvePlaceholderAsset(BRAND_LOGO_PLACEHOLDER);

export function hasCustomSchoolLogo(logo: string | null = SCHOOL_BRAND_LOGO) {
  return Boolean(logo);
}
