"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { SCHOOL_MODULE_CSS } from "@/components/school/schoolModuleStyles";

export function SchoolModuleLayout({
  currentPath,
  title,
  subtitle,
  children,
  topbarExtra,
}: {
  currentPath: string;
  title: string;
  subtitle?: string;
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
