export const BRAND_NAME_DEFAULTS = {
  nameAr: "School Iraq",
  nameEn: "School Iraq",
  subtitleAr: "سكول عراق",
  subtitleEn: "School Iraq",
} as const;

export const SCHOOL_BRAND_NAME = {
  nameAr: process.env.NEXT_PUBLIC_BRAND_NAME_AR || BRAND_NAME_DEFAULTS.nameAr,
  nameEn: process.env.NEXT_PUBLIC_BRAND_NAME_EN || BRAND_NAME_DEFAULTS.nameEn,
  subtitleAr: process.env.NEXT_PUBLIC_BRAND_SUBTITLE_AR || BRAND_NAME_DEFAULTS.subtitleAr,
  subtitleEn: process.env.NEXT_PUBLIC_BRAND_SUBTITLE_EN || BRAND_NAME_DEFAULTS.subtitleEn,
} as const;
