"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Table, Layers, ExternalLink } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

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
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

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

      {canManageClasses ? (
        <Link href={localizeAppPath("/classes", locale)}>
          <Button variant="outline" className="gap-2">
            <ExternalLink size={16} />
            {locale === "en" ? "Classes Page" : "صفحة الصفوف"}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}
