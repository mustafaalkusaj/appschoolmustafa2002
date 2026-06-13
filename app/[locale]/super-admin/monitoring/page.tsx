"use client";

import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import { SystemView } from "../components/SystemView";

export default function MonitoringPage() {
  const { infrastructure, schemaCompat, schools } = useSuperAdminData();

  return <SystemView infrastructure={infrastructure} schemaCompat={schemaCompat} schools={schools} />;
}
