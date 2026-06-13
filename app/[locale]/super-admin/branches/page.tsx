"use client";

import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import { BranchesTab } from "../components/BranchesTab";

export default function BranchesPage() {
  const { infrastructure, schemaCompat } = useSuperAdminData();

  return (
    <BranchesTab infrastructure={infrastructure} schemaCompat={schemaCompat} />
  );
}
