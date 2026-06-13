"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumb, type BreadcrumbItem } from "@/components/school/Breadcrumb";

export function SchoolModuleLayout({
  currentPath,
  title,
  subtitle,
  breadcrumbs,
  children,
  topbarExtra,
}: {
  currentPath: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  topbarExtra?: React.ReactNode;
}) {
  return (
    <div className="app-module-layout">
      <AppSidebar currentPath={currentPath} />
      <div className="app-module-main">
        <div className="app-module-topbar">
          <div className="app-module-topbar__left">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb items={breadcrumbs} />
            )}
            <h1 className="app-module-topbar__title">{title}</h1>
            {subtitle ? (
              <p className="app-module-topbar__subtitle">{subtitle}</p>
            ) : null}
          </div>
          {topbarExtra ? (
            <div className="app-module-topbar__actions">{topbarExtra}</div>
          ) : null}
        </div>
        <div className="app-module-content">{children}</div>
      </div>
    </div>
  );
}
