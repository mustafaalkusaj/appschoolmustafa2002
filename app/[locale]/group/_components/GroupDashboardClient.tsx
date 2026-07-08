"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardExperience } from "../../dashboard/_components/DashboardExperience";

const SCHOOL_PARAM = "schoolId";

interface GroupDashboardClientProps {
  schoolId: string;
}

export function GroupDashboardClient({ schoolId }: GroupDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get(SCHOOL_PARAM) !== schoolId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(SCHOOL_PARAM, schoolId);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [schoolId, searchParams, router]);

  return <DashboardExperience currentPath="/group" />;
}
