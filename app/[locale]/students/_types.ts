import type { Student, StudentWithFees, StudentStatus } from "@/types/student";
import type { ManagedUserAccountCard } from "@/lib/managed-users";
import type { StudentListRow, StudentsMetaPayload } from "@/lib/students/overview";

export type { Student, StudentWithFees, StudentStatus, ManagedUserAccountCard, StudentListRow, StudentsMetaPayload };

export type StudentCredentialTarget = Pick<StudentWithFees, "id" | "auth_user_id" | "full_name" | "class_name" | "section">;

export type StudentDatasetRow = {
  id: string;
  full_name: string;
  class_name?: string | null;
  section?: string | null;
  phone?: string | null;
  address?: string | null;
  total_fee?: number | null;
  paid_fee?: number | null;
  remaining_fee?: number | null;
  discount_value?: number | null;
  status?: StudentStatus | null;
  auth_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StudentAction = {
  icon: string;
  label: string;
  fn: () => void;
  danger?: boolean;
  sep?: never;
};

export type StudentActionSeparator = {
  sep: true;
  icon?: never;
  label?: never;
  fn?: never;
  danger?: never;
};

export type StudentActionItem = StudentAction | StudentActionSeparator;

export type StudentFormData = {
  full_name: string;
  class_name: string;
  section: string;
  phone: string;
  phone2: string;
  address: string;
  total_fee: string;
  paid_fee: string;
  discount_value: string;
  status: StudentStatus;
  branch_id: string; // Required when user has multi-branch access and no branch is pre-selected from context
  registration_number: string;
  date_of_birth: string;
  parent_name: string;
  gender: string;
  photo_url: string;
  previous_school: string;
};

export type ClassFee = {
  id: string;
  class_name: string;
  total_fee?: number;
  installment_amount?: number;
  installments?: number;
  branch_id?: string | null;
};

export type PrintCardOptions = {
  locale: "ar" | "en";
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};
