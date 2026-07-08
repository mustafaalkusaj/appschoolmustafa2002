"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardExperience } from "../dashboard/_components/DashboardExperience";

export default function GroupDashboardPage() {
  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <DashboardExperience currentPath="/group" />
    </ProtectedRoute>
  );
}
