"use client";

import { useTranslations } from "next-intl";
import { Search, Upload, Download, Printer, CreditCard, Plus, KeyRound, GraduationCap } from "lucide-react";
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
  resettingPasswords: boolean;
  onPromoteYear: () => void;
  filtered: StudentWithFees[];
  onExportCurrentPage: () => void;
  onExportAll: () => void;
  onPrintFiltered: () => void;
  onPrintAllCards: () => void;
  onBulkResetPasswords: () => void;
  onAddStudent: () => void;
  onBulkImport: () => void;
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
  resettingPasswords,
  onExportCurrentPage,
  onExportAll,
  onPrintFiltered,
  onPrintAllCards,
  onBulkResetPasswords,
  onPromoteYear,
  onAddStudent,
  onBulkImport,
}: StudentsToolbarProps) {
  const t = useTranslations("students.toolbar");

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      {/* Search Input */}
      <div className="relative w-full xl:max-w-xs xl:flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Filter Selects */}
      <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto">
        <Select
          value={filterClass}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setFilterSection("");
          }}
          className="w-full xl:min-w-[160px]"
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
          className="w-full xl:min-w-[160px]"
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
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-wrap xl:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportCurrentPage}
          title={t("exportCurrentTitle")}
          className="w-full justify-center xl:w-auto"
        >
          <Upload className="h-4 w-4" />
          <span>{t("exportCurrent")}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportAll}
          disabled={datasetLoading}
          title={t("exportAllTitle")}
          className="w-full justify-center xl:w-auto"
        >
          <Download className="h-4 w-4" />
          {datasetLoading ? t("preparing") : t("exportAll")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPrintFiltered}
          className="w-full justify-center xl:w-auto"
        >
          <Printer className="h-4 w-4" />
          <span>{t("printFiltered")}</span>
        </Button>

        {canManageStudentAccounts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrintAllCards}
            disabled={printingCards}
            className="w-full justify-center xl:w-auto"
          >
            <CreditCard className="h-4 w-4" />
            {printingCards ? t("preparingCards") : t("printAllCards")}
          </Button>
        )}

        {canManageStudentAccounts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkResetPasswords}
            disabled={resettingPasswords}
            className="w-full justify-center xl:w-auto border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <KeyRound className="h-4 w-4" />
            {resettingPasswords ? "جاري التعيين..." : "إعادة تعيين كلمات المرور"}
          </Button>
        )}

        {activeTab === "active" && !isReadOnlyView && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPromoteYear}
            className="w-full justify-center border-indigo-300 text-indigo-700 hover:bg-indigo-50 xl:w-auto"
            title="ترحيل السنة الدراسية وتحديث الصفوف"
          >
            <GraduationCap className="h-4 w-4" />
            <span>ترحيل السنة</span>
          </Button>
        )}

        {activeTab === "active" && !isReadOnlyView && canManageStudentAccounts && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkImport}
              className="w-full justify-center border-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] xl:w-auto"
            >
              <Upload className="h-4 w-4" />
              <span>استيراد جماعي</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddStudent}
              className="w-full justify-center xl:w-auto"
            >
              <Plus className="h-4 w-4" />
              {t("addStudent")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
