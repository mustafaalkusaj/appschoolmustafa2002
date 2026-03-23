"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

function getInitial(value: string | null | undefined) {
  const normalized = (value || "").trim();
  return normalized.charAt(0).toUpperCase() || "S";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SchoolLogo({
  src,
  alt,
  label,
  size = 44,
  className,
  imageClassName,
  fallbackClassName,
}: {
  src?: string | null;
  alt: string;
  label?: string | null;
  size?: number;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [broken, setBroken] = useState(false);
  const resolvedSrc = typeof src === "string" && src.trim().length > 0 ? src.trim() : null;
  const fallbackLabel = useMemo(() => getInitial(label || alt), [alt, label]);

  useEffect(() => {
    setBroken(false);
  }, [resolvedSrc]);

  return (
    <div
      className={cx("school-logo", className)}
      style={{ width: size, height: size, borderRadius: Math.max(14, Math.round(size * 0.34)) }}
      aria-hidden="true"
    >
      {resolvedSrc && !broken ? (
        <img
          src={resolvedSrc}
          alt={alt}
          width={size}
          height={size}
          className={cx("school-logo__image", imageClassName)}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={cx("school-logo__fallback", fallbackClassName)}>{fallbackLabel}</span>
      )}
    </div>
  );
}
