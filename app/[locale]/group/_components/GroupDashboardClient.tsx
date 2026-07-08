"use client";

import { DashboardExperience } from "../../dashboard/_components/DashboardExperience";

interface GroupDashboardClientProps {
  schoolId: string;
}

export function GroupDashboardClient({ schoolId }: GroupDashboardClientProps) {
  return <DashboardExperience currentPath="/group" schoolIdOverride={schoolId} />;
}
