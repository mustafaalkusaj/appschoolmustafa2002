"use client";

import { SCHOOL_BRAND } from "@/lib/branding";
import { useRuntimeBranding } from "@/hooks/useRuntimeBranding";
import { SchoolLogo } from "@/components/SchoolLogo";

interface UltrathinkLogoProps {
  size?: number;
  showText?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  logoSrc?: string | null;
}

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function UltrathinkLogo({
  size = 36,
  showText = true,
  titleClassName,
  subtitleClassName,
  title,
  subtitle,
  className,
  logoSrc,
}: UltrathinkLogoProps) {
  const runtimeBranding = useRuntimeBranding();
  const resolvedTitle = title ?? runtimeBranding.schoolName ?? SCHOOL_BRAND.nameAr;
  const resolvedLogo = logoSrc ?? runtimeBranding.logoUrl ?? SCHOOL_BRAND.logo;
  const resolvedSubtitle =
    subtitle ??
    (SCHOOL_BRAND.nameEn !== "School Management Platform"
      ? SCHOOL_BRAND.nameEn
      : SCHOOL_BRAND.subtitleAr);

  return (
    <div className={cx("brand-lockup", className)}>
      <div
        className="brand-lockup__badge"
        style={{ width: size, height: size, borderRadius: Math.max(16, Math.round(size * 0.38)) }}
      >
        <SchoolLogo
          src={resolvedLogo}
          alt={resolvedTitle}
          label={resolvedTitle}
          size={size}
          className="h-full w-full rounded-[inherit] border-0 bg-transparent shadow-none"
          imageClassName="h-full w-full object-cover"
          fallbackClassName="text-white"
        />
      </div>

      {showText ? (
        <div className="brand-lockup__copy">
          <span className={cx("brand-lockup__title", titleClassName)}>{resolvedTitle}</span>
          <span className={cx("brand-lockup__subtitle", subtitleClassName)}>
            {resolvedSubtitle}
          </span>
        </div>
      ) : (
        <span className="sr-only">{resolvedTitle}</span>
      )}
    </div>
  );
}
