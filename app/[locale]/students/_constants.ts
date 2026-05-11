import type { StudentStatus } from "@/types/student";
import type { StudentsMetaPayload } from "./_types";

export const TABS = [
  { id: "active", label: "جميع الطلاب", icon: "👥" },
  { id: "transferred", label: "الطلاب المنقولون", icon: "📦" },
  { id: "suspended", label: "الطلاب الموقوفون", icon: "⏸️" },
  { id: "deleted", label: "المحذوفون", icon: "🗑️" },
] as const;

export const STATUS_MAP: Record<StudentStatus, { label: string; color: string; bg: string }> = {
  active: { label: "نشط", color: "#065F46", bg: "#D1FAE5" },
  transferred: { label: "منقول", color: "#92400E", bg: "#FEF3C7" },
  graduated: { label: "متخرج", color: "#1E40AF", bg: "#DBEAFE" },
  withdrawn: { label: "منسحب", color: "#991B1B", bg: "#FEE2E2" },
  archived: { label: "مؤرشف", color: "#374151", bg: "#F3F4F6" },
  suspended: { label: "موقوف", color: "#7C2D12", bg: "#FEF3C7" },
  deleted: { label: "محذوف", color: "#6B7280", bg: "#F3F4F6" },
};

export const STUDENT_IMPORT_ALLOWED_EXTENSIONS = [".xlsx"] as const;
export const STUDENT_IMPORT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export const EMPTY_STUDENT_META: StudentsMetaPayload = {
  summary: {
    totalStudents: 0,
    activeStudents: 0,
    transferredCount: 0,
    totalFee: 0,
    totalRemaining: 0,
    totalPaid: 0,
    transferredPaid: 0,
    totalFeesWithTransferred: 0,
  },
  tabCounts: {
    active: 0,
    transferred: 0,
    suspended: 0,
    deleted: 0,
  },
  sectionOptions: [],
};

export const DEFAULT_STUDENT_FORM = {
  full_name: "",
  class_name: "",
  section: "",
  phone: "",
  address: "",
  total_fee: "",
  paid_fee: "",
  discount_value: "",
  status: "active" as const,
  branch_id: "",
};
