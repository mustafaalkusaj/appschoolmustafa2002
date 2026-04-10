"use client";

import * as React from "react";
import { cn } from "@/lib/brand/brand-utils";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional action buttons slot */
  actions?: React.ReactNode;
  /** Whether to show bottom border */
  bordered?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * PageHeader - Reusable page header for consistency across all routes.
 * 
 * - Layout: flex row, items-center, justify-between
 * - Left side: breadcrumb (optional) + page title + optional subtitle
 * - Right side: action buttons slot
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  bordered = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4",
        bordered && "border-b border-[var(--border)]",
        className
      )}
    >
      {/* Left Section: Breadcrumbs + Title + Subtitle */}
      <div className="flex flex-col gap-2 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} />
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-muted)] truncate max-w-[400px]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Section: Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
