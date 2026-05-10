// Dashboard type definitions

export interface ClassFee {
  id: string;
  class_name: string;
  total_fee: number;
  installments: number;
  installment_amount: number;
  notes: string;
  created_at: string;
  stats?: {
    count: number;
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    paidPct: number;
  };
}

export interface DashboardNotification {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

export type DashboardTotals = {
  studentsCount: number;
  transferredCount: number;
  totalFees: number;
  totalPaid: number;
  totalDiscount: number;
  totalRemaining: number;
  afterDiscount: number;
  paidPct: number;
  remainingPct: number;
  feeNotificationsCount: number;
  monthlySalaries: number;
  totalIncomes: number;
  transferredTotalFees: number;
  transferredCollected: number;
  transferredRemaining: number;
};

export type DashboardRecentPayment = {
  id: string;
  amount: number;
  created_at: string | null;
  student_id: string | null;
  student_name: string | null;
  class_name: string | null;
};

export type DashboardOverdueStudent = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  remaining_fee: number;
};

export const EMPTY_DASHBOARD_TOTALS: DashboardTotals = {
  studentsCount: 0,
  transferredCount: 0,
  totalFees: 0,
  totalPaid: 0,
  totalDiscount: 0,
  totalRemaining: 0,
  afterDiscount: 0,
  paidPct: 0,
  remainingPct: 0,
  feeNotificationsCount: 0,
  monthlySalaries: 0,
  totalIncomes: 0,
  transferredTotalFees: 0,
  transferredCollected: 0,
  transferredRemaining: 0,
};

export interface FeeFormData {
  class_name: string;
  total_fee: string;
  installments: string;
  notes: string;
}

export interface BrandingFormData {
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  theme_preset: string;
}

export interface ClassForm {
  name: string;
  sections: string[];
}

export interface SectionForm {
  class_id: string;
  name: string;
}

export interface ClassItem {
  id: string;
  name: string;
  legacyClassIds?: string[];
  branch_id?: string | null;
}

export interface SectionItem {
  id: string;
  class_id: string;
  name: string;
}
