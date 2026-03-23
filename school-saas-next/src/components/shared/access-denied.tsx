"use client";

import { ShieldX } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";

interface AccessDeniedProps {
  title?: string;
  description?: string;
}

export function AccessDenied({ title, description }: AccessDeniedProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <ShieldX className="mt-0.5 h-5 w-5" />
        <div>
          <p className="font-semibold">{title ?? t.accessDenied.title}</p>
          <p className="mt-1 text-sm opacity-90">{description ?? t.accessDenied.description}</p>
        </div>
      </div>
    </div>
  );
}
