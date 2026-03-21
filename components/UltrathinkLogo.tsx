"use client";

/* eslint-disable @next/next/no-img-element */

import { SCHOOL_BRAND } from "@/lib/branding";

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
  const resolvedTitle = title ?? SCHOOL_BRAND.nameAr;
  const resolvedLogo = logoSrc ?? SCHOOL_BRAND.logo;
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
        {resolvedLogo ? (
          <img
            src={resolvedLogo}
            alt={resolvedTitle}
            width={size}
            height={size}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M32 11L13 22.4L32 33.8L51 22.4L32 11Z"
              fill="white"
              fillOpacity="0.96"
            />
            <path
              d="M19.5 29.9V40.4C19.5 45.1 25 49 32 49C39 49 44.5 45.1 44.5 40.4V29.9L32 37L19.5 29.9Z"
              fill="white"
            />
            <path
              d="M32 18.4L21.3 24.7L32 31L42.7 24.7L32 18.4Z"
              fill="rgba(79,140,255,0.26)"
            />
          </svg>
        )}
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
