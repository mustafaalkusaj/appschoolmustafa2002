export type TeacherRecord = {
  id: string;
  school_id: string;
  branch_id: string | null;
  full_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  subject: string | null;
  job_title: string | null;
  specialization: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  email_work: string | null;
  address: string | null;
  city: string | null;
  gender: "male" | "female" | null;
  date_of_birth: string | null;
  nationality: string | null;
  marital_status: string | null;
  blood_type: string | null;
  photo: string | null;
  national_id: string | null;
  national_id_expiry: string | null;
  employee_id: string | null;
  contract_type: string | null;
  hire_date: string | null;
  contract_end_date: string | null;
  years_experience: number | null;
  max_periods_daily: number | null;
  max_periods_weekly: number | null;
  qualification: string | null;
  university: string | null;
  graduation_year: number | null;
  salary_type: "fixed" | "hourly" | "mixed" | null;
  base_salary: number | null;
  lecture_price: number | null;
  transport_allowance: number | null;
  housing_allowance: number | null;
  other_allowances: number | null;
  bank_name: string | null;
  bank_account: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  app_username: string | null;
  app_password_plain?: string | null;
  app_status: "active" | "inactive" | "suspended" | null;
  app_last_login: string | null;
  status: string;
  status_reason: string | null;
  classes_taught: Array<{ className: string; section: string }> | null;
  performance_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  auth_user_id: string | null;
  // computed
  weeklyPeriods?: number;
  currentMonthSalary?: number | null;
};

export type TeacherFormData = {
  full_name: string;
  first_name_ar: string;
  second_name_ar: string;
  third_name_ar: string;
  last_name_ar: string;
  first_name_en: string;
  last_name_en: string;
  subject: string;
  job_title: string;
  specialization: string;
  phone: string;
  phone_secondary: string;
  email: string;
  email_work: string;
  address: string;
  city: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  marital_status: string;
  blood_type: string;
  national_id: string;
  national_id_expiry: string;
  employee_id: string;
  contract_type: string;
  hire_date: string;
  contract_end_date: string;
  years_experience: number;
  max_periods_daily: number;
  max_periods_weekly: number;
  qualification: string;
  university: string;
  graduation_year: number | null;
  salary_type: "fixed" | "hourly" | "mixed";
  base_salary: number;
  lecture_price: number;
  transport_allowance: number;
  housing_allowance: number;
  other_allowances: number;
  bank_name: string;
  bank_account: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
  status: string;
  classes_taught: Array<{ className: string; section: string }>;
};

export const EMPTY_TEACHER_FORM: TeacherFormData = {
  full_name: "",
  first_name_ar: "",
  second_name_ar: "",
  third_name_ar: "",
  last_name_ar: "",
  first_name_en: "",
  last_name_en: "",
  subject: "",
  job_title: "",
  specialization: "",
  phone: "",
  phone_secondary: "",
  email: "",
  email_work: "",
  address: "",
  city: "",
  gender: "",
  date_of_birth: "",
  nationality: "عراقي",
  marital_status: "",
  blood_type: "",
  national_id: "",
  national_id_expiry: "",
  employee_id: "",
  contract_type: "full_time",
  hire_date: "",
  contract_end_date: "",
  years_experience: 0,
  max_periods_daily: 6,
  max_periods_weekly: 24,
  qualification: "",
  university: "",
  graduation_year: null,
  salary_type: "fixed",
  base_salary: 0,
  lecture_price: 0,
  transport_allowance: 0,
  housing_allowance: 0,
  other_allowances: 0,
  bank_name: "",
  bank_account: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  notes: "",
  status: "active",
  classes_taught: [],
};
