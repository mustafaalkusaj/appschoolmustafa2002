"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardExperience } from "./_components/DashboardExperience";

export default function DashboardPage() {
  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <DashboardExperience currentPath="/dashboard" />
    </ProtectedRoute>
  );
}
