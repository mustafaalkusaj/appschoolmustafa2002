export const EMPTY_SUMMARY = {
  totalStudents: 0,
  totalFee: 0,
  totalPaid: 0,
  totalRemaining: 0,
  collectedCount: 0,
} as const;

export type PaymentsSummary = typeof EMPTY_SUMMARY;

export type PaymentsMetaState = {
  summary: PaymentsSummary;
  classOptions: string[];
  paymentYears: number[];
  totalPaymentCount: number;
  archives: PaymentArchive[];
  archiveNotice: string;
};

export type PaymentsPageState = {
  students: Student[];
  paymentCountsByStudent: Record<string, number>;
  totalCount: number;
};

export type Student = {
  id: string;
  full_name: string;
  class_name: string;
  phone?: string;
  address?: string;
  total_fee: number;
  paid_fee: number;
  discount_value?: number;
  remaining_fee: number;
  status?: string;
  school_id?: string;
};

export type Payment = {
  id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  notes?: string;
  receipt_date?: string;
  receipt_number?: string;
  manual_receipt_number?: string;
  created_at: string;
};

export type PaymentArchive = {
  id: string;
  archive_year: number;
  archive_date: string;
  total_students?: number;
  total_payments?: number;
  total_amount?: number;
  data?: {
    students?: Student[];
    payments?: Payment[];
  };
};

export type PayFormState = {
  amount: string;
  payment_method: string;
  notes: string;
  receipt_date: string;
  manual_receipt_number: string;
};

export type QuickFilterOption = {
  id: string;
  label: string;
};

export const QUICK_FILTERS: QuickFilterOption[] = [
  { id: "all", label: "الكل" },
  { id: "no_invoice", label: "بدون دفعات" },
  { id: "collected", label: "المبالغ المستوفاة" },
  { id: "discounted", label: "الطلاب المخفضون" },
  { id: "transferred", label: "الفواتير المنقولة" },
  { id: "graduated", label: "فواتير المتخرجين" },
  { id: "suspended", label: "فواتير الموقوفين" },
  { id: "deleted", label: "الفواتير المحذوفة" },
];

export const SEARCH_DEBOUNCE_MS = 180;
export const PAGE_SIZE = 25;
