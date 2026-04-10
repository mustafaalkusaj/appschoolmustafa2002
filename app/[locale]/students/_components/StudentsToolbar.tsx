"use client";

import { useTranslations } from "next-intl";
import { Search, Upload, Download, Printer, CreditCard, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { StudentWithFees } from "../_types";

interface StudentsToolbarProps {
  search: string;
  setSearch: (search: string) => void;
  filterClass: string;
  setFilterClass: (filter: string) => void;
  filterSection: string;
  setFilterSection: (filter: string) => void;
  classes: string[];
  sectionsList: string[];
  activeTab: string;
  isReadOnlyView: boolean;
  canManageStudentAccounts: boolean;
  datasetLoading: boolean;
  printingCards: boolean;
  filtered: StudentWithFees[];
  onExportCurrentPage: () => void;
  onExportAll: () => void;
  onPrintFiltered: () => void;
  onPrintAllCards: () => void;
  onAddStudent: () => void;
}

export function StudentsToolbar({
  search,
  setSearch,
  filterClass,
  setFilterClass,
  filterSection,
  setFilterSection,
  classes,
  sectionsList,
  activeTab,
  isReadOnlyView,
  canManageStudentAccounts,
  datasetLoading,
  printingCards,
  onExportCurrentPage,
  onExportAll,
  onPrintFiltered,
  onPrintAllCards,
  onAddStudent,
}: StudentsToolbarProps) {
  const t = useTranslations("students.toolbar");

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Filter Selects */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select
          value={filterClass}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setFilterSection("");
          }}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="">{t("filterClass")}</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="">{t("filterSection")}</option>
          {sectionsList.map((sec) => (
            <option key={sec} value={sec}>
              {t("sectionLabel", { name: sec })}
            </option>
          ))}
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCurrentPage}
          title={t("exportCurrentTitle")}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{t("exportCurrent")}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportAll}
          disabled={datasetLoading}
          title={t("exportAllTitle")}
        >
          <Download className="h-4 w-4" />
          {datasetLoading ? t("preparing") : t("exportAll")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPrintFiltered}
        >
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">{t("printFiltered")}</span>
        </Button>

        {canManageStudentAccounts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrintAllCards}
            disabled={printingCards}
          >
            <CreditCard className="h-4 w-4" />
            {printingCards ? t("preparingCards") : t("printAllCards")}
          </Button>
        )}

        {activeTab === "active" && !isReadOnlyView && canManageStudentAccounts && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAddStudent}
          >
            <Plus className="h-4 w-4" />
            {t("addStudent")}
          </Button>
        )}
      </div>
    </div>
  );
}
