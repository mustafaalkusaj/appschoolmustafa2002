"use client";

import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import { AuditLogTab } from "../components/AuditLogTab";

export default function AuditPage() {
  const { infrastructure } = useSuperAdminData();

  return <AuditLogTab infrastructure={infrastructure} />;
}
