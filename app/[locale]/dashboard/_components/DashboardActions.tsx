"use client";

import { useTranslations } from "next-intl";
import { Plus, Table, Layers } from "@/lib/icons";
import { Button } from "@/components/ui/button";

interface DashboardActionsProps {
  canManageClasses: boolean;
  showFeesTable: boolean;
  onToggleFeesTable: () => void;
  onOpenNewFee: () => void;
  onOpenClassesModal: () => void;
}

export function DashboardActions({
  canManageClasses,
  showFeesTable,
  onToggleFeesTable,
  onOpenNewFee,
  onOpenClassesModal,
}: DashboardActionsProps) {
  const t = useTranslations("dashboard.actions");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canManageClasses ? (
        <Button onClick={onOpenNewFee} className="gap-2">
          <Plus size={18} strokeWidth={3} />
          {t("addFee")}
        </Button>
      ) : null}

      <Button
        variant="secondary"
        onClick={onToggleFeesTable}
        className="gap-2"
      >
        <Table size={16} />
        {showFeesTable ? t("hideTable") : t("showTable")}
      </Button>

      {canManageClasses ? (
        <Button variant="secondary" onClick={onOpenClassesModal} className="gap-2">
          <Layers size={16} />
          {t("manageClasses")}
        </Button>
      ) : null}
    </div>
  );
}
