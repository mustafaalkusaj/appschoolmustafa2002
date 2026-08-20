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

export type DriverDocument = {
  id: string;
  slot_number: number;
  label: string;
  photo_url: string;
  created_at: string;
};

export type DriverStudentInfo = {
  id: string;
  full_name: string;
  class_name: string | null;
  phone: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  gender: string | null;
  photo_url: string | null;
  section: string | null;
  address: string | null;
  date_of_birth: string | null;
  registration_number: string | null;
};

export type DriverStudentMember = {
  id: string;
  route_id: string;
  student_id: string;
  subscription_status: string;
  students: DriverStudentInfo | null;
};
