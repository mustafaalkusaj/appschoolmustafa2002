export type StudentStatus = 
  | 'active'
  | 'transferred' 
  | 'suspended'
  | 'deleted'
  | 'graduated'
  | 'withdrawn'
  | 'archived';

export interface Student {
  id: string;
  school_id: string;
  branch_id?: string | null;
  full_name: string;
  class_name: string;
  section: string | null;
  phone: string | null;
  address: string | null;
  total_fee: number;
  paid_fee: number;
  discount_value: number;
  status: StudentStatus;
  auth_user_id?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface StudentWithFees extends Student {
  remaining_fee: number;
}

export type StudentFormData = Pick<Student, 'full_name' | 'class_name' | 'section' | 'phone' | 'address' | 'total_fee' | 'paid_fee' | 'discount_value' | 'status'>;
