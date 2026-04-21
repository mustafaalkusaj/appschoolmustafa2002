"use client";

import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { DashboardExperience } from "../dashboard/_components/DashboardExperience";

export default function BranchOverviewPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  return (
    <ProtectedRoute roles={["admin", "employee"]}>
      <DashboardExperience
        currentPath="/branch-overview"
        branchScoped
        titleOverride={locale === "en" ? "Branch Dashboard" : "لوحة الفرع"}
      />
    </ProtectedRoute>
  );
}
