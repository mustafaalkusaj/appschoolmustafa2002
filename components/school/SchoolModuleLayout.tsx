"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { SCHOOL_MODULE_CSS } from "@/components/school/schoolModuleStyles";
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
    <>
      <style>{SCHOOL_MODULE_CSS}</style>
      <div className="layout">
        <AppSidebar currentPath={currentPath} />
        <div className="main">
          <div className="topbar">
            <div>
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumb items={breadcrumbs} />
              )}
              <div className="topbar-title">{title}</div>
              {subtitle ? <div className="topbar-sub">{subtitle}</div> : null}
            </div>
            {topbarExtra}
          </div>
          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
