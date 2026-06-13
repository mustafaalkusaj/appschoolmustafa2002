"use client";

import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import { TrashTab } from "../components/TrashTab";
import { PaymentArchivesTab } from "../components/PaymentArchivesTab";

export default function TrashPage() {
  const { infrastructure } = useSuperAdminData();

  return (
    <div className="space-y-6">
      <TrashTab infrastructure={infrastructure} />
      <PaymentArchivesTab />
    </div>
  );
}
