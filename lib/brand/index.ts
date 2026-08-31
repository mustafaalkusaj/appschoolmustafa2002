import { SCHOOL_BRAND_LOGO, hasCustomSchoolLogo } from "@/lib/brand/logo";
import { SCHOOL_BRAND_NAME } from "@/lib/brand/name";
import { SCHOOL_BRAND_COLORS } from "@/lib/brand/colors";

export const SCHOOL_BRAND = {
  ...SCHOOL_BRAND_NAME,
  logo: SCHOOL_BRAND_LOGO,
  ...SCHOOL_BRAND_COLORS,
} as const;

export { hasCustomSchoolLogo };
export { BRAND_NAME_DEFAULTS, SCHOOL_BRAND_NAME } from "@/lib/brand/name";
export { SCHOOL_BRAND_LOGO } from "@/lib/brand/logo";
export { sanitizeImageUrl } from "@/lib/brand/asset-url";
export * from "@/lib/brand/palette";
export * from "@/lib/brand/themes";
export {
  APP_THEME_COLOR_TOKENS,
  BRAND_COLOR_DEFAULTS,
  SCHOOL_BRAND_COLORS,
  BRAND_THEME_COLOR_LIBRARY,
  BRAND_THEME_SWATCHES,
  PROJECT_COLOR_LIBRARY,
} from "@/lib/brand/colors";
