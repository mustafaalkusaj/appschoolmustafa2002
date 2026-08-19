export type DriverRow = {
  id: string;
  full_name: string;
  phone: string | null;
  national_id: string | null;
  license_number: string | null;
  license_expiry: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  status: string;
  notes: string | null;
  user_profile_id: string | null;
  branch_id: string | null;
};

export type RouteRow = {
  id: string;
  name: string;
  monthly_fee: number;
  is_active: boolean;
  driver_id: string | null;
  backup_driver_id: string | null;
  student_count: number;
  drivers: { full_name: string | null } | null;
};

export type Tab = "overview" | "drivers" | "routes";

export type Credentials = {
  username: string;
  email: string;
  password: string;
};

export type RouteMember = {
  id: string;
  student_id: string;
  stop_order: number;
  subscription_status: string | null;
  students: { full_name: string; class_name: string | null } | null;
};

export type StudentCandidate = {
  id: string;
  full_name: string;
  class_name: string | null;
};
