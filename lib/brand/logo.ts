const envLogo = process.env.NEXT_PUBLIC_BRAND_LOGO_URL;

export const SCHOOL_BRAND_LOGO: string | null = envLogo || null;

export function hasCustomSchoolLogo(logo: string | null = SCHOOL_BRAND_LOGO) {
  return Boolean(logo);
}
