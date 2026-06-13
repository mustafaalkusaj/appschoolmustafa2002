-- ============================================================
-- Schema Baseline Migration
-- Generated: 2026-05-28
-- Tables: 122
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;


-- ------------------------------------------------------------
-- Table: public.schools
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "name" text NOT NULL,
  "logo_url" text,
  "phone" text,
  "address" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "is_active" boolean DEFAULT true,
  "subscription_status" text DEFAULT 'active'::text,
  "plan" text DEFAULT 'basic'::text,
  "owner_email" text,
  "city" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "group_id" uuid,
  "primary_color" text,
  "secondary_color" text,
  "theme_preset" text,
  "receipt_footer_text" text,
  "receipt_address" text,
  "receipt_tax_number" text,
  "academic_year_label" text,
  "semester1_start" date,
  "semester1_end" date,
  "semester2_start" date,
  "semester2_end" date,
  "late_payment_grace_days" integer,
  "late_payment_penalty_pct" numeric,
  "max_penalty_pct" numeric,
  "discount_early_pct" numeric,
  "app_name" text,
  "currency" text DEFAULT 'IQD'::text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.branches
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "group_id" uuid,
  "phone" text,
  "primary_color" text,
  "secondary_color" text,
  "sidebar_color" text,
  "accent_color" text,
  "text_color" text,
  "logo_url" text,
  "font_family" text,
  "topbar_color" text,
  "receipt_footer_text" text,
  "card_bg_url" text,
  "short_name" text,
  "receipt_bg_url" text,
  "is_main" boolean NOT NULL DEFAULT false,
  "currency" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "full_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "role" text NOT NULL CHECK (role = ANY (ARRAY['super_admin'::text, 'branch_manager'::text, 'accountant'::text, 'tuition_officer'::text, 'attendance_officer'::text, 'staff'::text])),
  "permissions" jsonb DEFAULT '{}'::jsonb,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.students
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "created_by" uuid,
  "full_name" text NOT NULL,
  "class_name" text NOT NULL,
  "phone" text,
  "guardian_name" text,
  "guardian_phone" text,
  "total_fee" integer NOT NULL DEFAULT 0,
  "paid_fee" integer NOT NULL DEFAULT 0,
  "discount_value" integer NOT NULL DEFAULT 0,
  "remaining_fee" integer GENERATED ALWAYS AS (((total_fee - paid_fee) - discount_value)) STORED,
  "status" text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'transferred'::text, 'graduated'::text, 'withdrawn'::text, 'archived'::text, 'suspended'::text, 'deleted'::text])),
  "created_at" timestamp with time zone DEFAULT now(),
  "address" text,
  "section" text,
  "auth_user_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now(),
  "gender" text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  "photo_url" text,
  "registration_number" text,
  "date_of_birth" text,
  "parent_name" text,
  "parent_phone" text,
  "phone2" text,
  "previous_school" text,
  "prev_school" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.payments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "created_by" uuid,
  "amount" integer NOT NULL CHECK (amount > 0),
  "receipt_number" text DEFAULT ('REC-'::text || (nextval('receipt_number_seq'::regclass))::text) UNIQUE,
  "payment_method" text DEFAULT 'cash'::text CHECK (payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text, 'check'::text])),
  "installment_id" uuid,
  "notes" text,
  "qr_code" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "manual_receipt_number" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.discounts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discounts (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "approved_by" uuid,
  "discount_type" text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  "discount_value" integer NOT NULL CHECK (discount_value > 0),
  "reason" text NOT NULL,
  "is_approved" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.installments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.installments (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "amount" integer NOT NULL CHECK (amount > 0),
  "due_date" date NOT NULL,
  "is_paid" boolean DEFAULT false,
  "is_overdue" boolean DEFAULT false,
  "paid_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teachers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teachers (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "subject" text,
  "phone" text,
  "base_salary" integer NOT NULL DEFAULT 0,
  "status" text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'on_leave'::text, 'suspended'::text, 'resigned'::text, 'terminated'::text, 'deleted'::text])),
  "performance_score" numeric DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "email" text,
  "hire_date" date,
  "department" text,
  "address" text,
  "national_id" text,
  "job_title" text,
  "salary_type" text DEFAULT 'fixed'::text,
  "weekly_hours" integer DEFAULT 0,
  "classes" jsonb DEFAULT '[]'::jsonb,
  "classes_taught" jsonb DEFAULT '[]'::jsonb,
  "auth_user_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "specialization" text,
  "notes" text,
  "first_name_ar" text,
  "second_name_ar" text,
  "third_name_ar" text,
  "last_name_ar" text,
  "first_name_en" text,
  "last_name_en" text,
  "gender" text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  "date_of_birth" date,
  "nationality" text DEFAULT 'عراقي'::text,
  "marital_status" text,
  "blood_type" text,
  "photo" text,
  "phone_secondary" text,
  "email_personal" text,
  "email_work" text,
  "city" text,
  "national_id_expiry" date,
  "employee_id" text,
  "contract_type" text DEFAULT 'full_time'::text,
  "contract_end_date" date,
  "years_experience" integer DEFAULT 0,
  "max_periods_daily" integer DEFAULT 6,
  "max_periods_weekly" integer DEFAULT 24,
  "qualification" text,
  "university" text,
  "graduation_year" integer,
  "transport_allowance" numeric DEFAULT 0,
  "housing_allowance" numeric DEFAULT 0,
  "other_allowances" numeric DEFAULT 0,
  "bank_name" text,
  "bank_account" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "emergency_contact_relation" text,
  "app_username" text UNIQUE,
  "app_password_hash" text,
  "app_password_plain" text,
  "app_status" text DEFAULT 'inactive'::text CHECK (app_status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])),
  "app_last_login" timestamp with time zone,
  "status_reason" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  "lecture_price" numeric DEFAULT 0,
  "messaging_paused" boolean NOT NULL DEFAULT false,
  "notifications_require_approval" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.salaries
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salaries (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "paid_by" uuid,
  "gross_salary" integer NOT NULL,
  "deductions" integer NOT NULL DEFAULT 0,
  "net_salary" integer GENERATED ALWAYS AS ((gross_salary - deductions)) STORED,
  "month" text NOT NULL,
  "is_paid" boolean DEFAULT false,
  "paid_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "student_id" uuid,
  "teacher_id" uuid,
  "recorded_by" uuid,
  "date" date NOT NULL,
  "status" text NOT NULL CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.financial_summary
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_summary (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "total_income" integer NOT NULL DEFAULT 0,
  "total_expenses" integer NOT NULL DEFAULT 0,
  "current_balance" integer GENERATED ALWAYS AS ((total_income - total_expenses)) STORED,
  "total_discounts" integer NOT NULL DEFAULT 0,
  "total_salaries" integer NOT NULL DEFAULT 0,
  "month" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.activity_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "created_by" uuid,
  "action_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "old_values" jsonb,
  "new_values" jsonb,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.subjects
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "is_active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.job_titles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_titles (
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "school_id" uuid,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.classes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "branch_id" uuid,
  "grade" text NOT NULL,
  "section" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "name" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.lecture_prices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lecture_prices (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "grade" text NOT NULL,
  "price_per_lecture" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.weekly_schedule
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_schedule (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "grade" text NOT NULL,
  "section" text NOT NULL,
  "day" text NOT NULL,
  "period" integer NOT NULL,
  "session_type" text DEFAULT 'morning'::text,
  "teacher_id" uuid,
  "subject" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.lesson_times
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lesson_times (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "period" integer NOT NULL,
  "session_type" text DEFAULT 'morning'::text,
  "start_time" text,
  "end_time" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.daily_lectures
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_lectures (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "teacher_id" uuid,
  "grade" text,
  "section" text,
  "period" integer,
  "session_type" text DEFAULT 'morning'::text,
  "lecture_date" date NOT NULL,
  "price" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.deductions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deductions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "teacher_id" uuid,
  "amount" integer DEFAULT 0,
  "notes" text,
  "deduction_date" date DEFAULT CURRENT_DATE,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.salary_archives
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.salary_archives (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "month" text NOT NULL,
  "archive_date" timestamp with time zone DEFAULT now(),
  "total_teachers" integer DEFAULT 0,
  "total_amount" integer DEFAULT 0,
  "data" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.expense_types
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_types (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "name" text NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now(),
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.expenses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "branch_id" uuid,
  "expense_type_id" uuid,
  "amount" integer NOT NULL DEFAULT 0,
  "expense_date" date DEFAULT CURRENT_DATE,
  "recipient" text,
  "receipt_number" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now(),
  "updated_by" uuid,
  "receipt_image_url" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.subscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "plan" text DEFAULT 'basic'::text,
  "status" text DEFAULT 'active'::text,
  "start_date" date DEFAULT CURRENT_DATE,
  "end_date" date,
  "max_students" integer DEFAULT 500,
  "max_teachers" integer DEFAULT 50,
  "price" integer DEFAULT 0,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  "id" uuid NOT NULL,
  "full_name" text,
  "email" text,
  "role" text DEFAULT 'employee'::text,
  "school_id" uuid,
  "is_active" boolean DEFAULT true,
  "avatar_url" text,
  "phone" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "custom_permissions" text[] DEFAULT ARRAY[]::text[],
  "scope" text DEFAULT 'branch'::text CHECK (scope = ANY (ARRAY['branch'::text, 'group'::text, 'super_admin'::text])),
  "branch_id" uuid,
  "group_id" uuid,
  "scope_level" text DEFAULT 'branch_user'::text CHECK (scope_level = ANY (ARRAY['super_admin'::text, 'group_admin'::text, 'branch_user'::text, 'restricted'::text])),
  "allowed_module" text CHECK (allowed_module = ANY (ARRAY['students'::text, 'payments'::text, 'expenses'::text, 'attendance'::text, 'salaries'::text, 'reports'::text])),
  "default_branch_id" uuid,
  "is_single_page_user" boolean NOT NULL DEFAULT false,
  "hierarchy_level" integer,
  "permissions_version" integer NOT NULL DEFAULT 1,
  "job_title" text,
  "permissions" jsonb,
  "school_role_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.class_fees
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_fees (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "class_name" text NOT NULL,
  "total_fee" numeric NOT NULL,
  "installments" integer NOT NULL DEFAULT 4,
  "installment_amount" numeric NOT NULL,
  "notes" text DEFAULT ''::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid,
  "branch_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.sections
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sections (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "class_id" uuid,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "school_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance_records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid,
  "branch_id" uuid,
  "attendance_date" date NOT NULL DEFAULT CURRENT_DATE,
  "status" text NOT NULL CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])),
  "note" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "updated_by" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "actor_id" uuid,
  "actor_name" text,
  "actor_email" text,
  "action_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "summary" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "actor_user_id" text,
  "actor_role" text,
  "actor_source" text DEFAULT 'app'::text,
  "action" text DEFAULT 'unknown'::text,
  "school_id" text,
  "branch_id" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "school_id" uuid,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "link" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.feature_flags
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "is_enabled" boolean NOT NULL DEFAULT false,
  "description" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.custom_roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_roles (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "name" text NOT NULL,
  "base_role" text NOT NULL,
  "permissions" text[] DEFAULT '{}'::text[],
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "subject_id" uuid,
  "class_id" uuid,
  "section_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid,
  "student_id" uuid,
  "subject_id" uuid,
  "class_id" uuid,
  "section_id" uuid,
  "class_name" text,
  "section" text,
  "subject" text,
  "title" text NOT NULL,
  "description" text,
  "due_at" timestamp with time zone,
  "content_kind" text NOT NULL DEFAULT 'homework'::text CHECK (content_kind = ANY (ARRAY['homework'::text, 'exam_material'::text])),
  "attachment_bucket" text,
  "attachment_path" text,
  "attachment_name" text,
  "attachment_mime_type" text,
  "attachment_size_bytes" bigint,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "branch_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.grades
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grades (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid,
  "student_id" uuid NOT NULL,
  "assignment_id" uuid,
  "subject_id" uuid,
  "class_id" uuid,
  "section_id" uuid,
  "subject" text,
  "exam_type" text,
  "score" numeric,
  "max_score" numeric,
  "note" text,
  "graded_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "branch_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.account_archives
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_archives (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "archive_year" integer NOT NULL,
  "total_students" integer NOT NULL DEFAULT 0,
  "total_payments" integer NOT NULL DEFAULT 0,
  "total_amount" numeric NOT NULL DEFAULT 0,
  "data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "archive_date" timestamp with time zone NOT NULL DEFAULT now(),
  "branch_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.platform_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  "id" text NOT NULL,
  "name_ar" text NOT NULL,
  "name_en" text NOT NULL,
  "subtitle_ar" text NOT NULL,
  "subtitle_en" text NOT NULL,
  "logo_url" text,
  "preset_id" text NOT NULL,
  "primary_color" text NOT NULL,
  "secondary_color" text NOT NULL,
  "accent_color" text NOT NULL,
  "sidebar_color" text NOT NULL,
  "emphasis_text_color" text NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_branding_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_branding_settings (
  "school_id" uuid NOT NULL,
  "preset_id" text NOT NULL,
  "logo_url" text,
  "primary_color" text NOT NULL,
  "secondary_color" text NOT NULL,
  "accent_color" text NOT NULL,
  "sidebar_color" text NOT NULL,
  "emphasis_text_color" text NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("school_id")
);

-- ------------------------------------------------------------
-- Table: public.class_schedules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_schedules (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "section" text,
  "day_of_week" text NOT NULL CHECK (day_of_week = ANY (ARRAY['sunday'::text, 'monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text, 'friday'::text, 'saturday'::text])),
  "period_number" integer NOT NULL CHECK (period_number >= 1 AND period_number <= 12),
  "subject" text NOT NULL,
  "teacher_name" text,
  "start_time" text,
  "end_time" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "time_slot_id" uuid,
  "is_locked" boolean DEFAULT false,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_groups
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_groups (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "logo_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.group_alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_alerts (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "group_id" uuid,
  "branch_id" uuid,
  "type" text NOT NULL CHECK (type = ANY (ARRAY['no_payment'::text, 'high_expenses'::text, 'collection_drop'::text])),
  "message" text NOT NULL,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_permissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permissions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "module" text NOT NULL CHECK (module = ANY (ARRAY['students'::text, 'payments'::text, 'expenses'::text, 'attendance'::text, 'reports'::text, 'group'::text, 'all'::text])),
  "branch_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.rbac_permissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "resource_code" text NOT NULL,
  "action_code" text NOT NULL,
  "page_code" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.rbac_roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rbac_roles (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "scope_level" text NOT NULL CHECK (scope_level = ANY (ARRAY['group_admin'::text, 'branch_user'::text, 'restricted'::text])),
  "hierarchy_level" integer NOT NULL DEFAULT 100,
  "is_system_template" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.rbac_role_permissions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_role_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "branch_id" uuid,
  "scope_level" text NOT NULL CHECK (scope_level = ANY (ARRAY['group_admin'::text, 'branch_user'::text, 'restricted'::text])),
  "hierarchy_level" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_page_access
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_page_access (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "page_code" text NOT NULL,
  "can_view" boolean NOT NULL DEFAULT true,
  "can_create" boolean NOT NULL DEFAULT false,
  "can_update" boolean NOT NULL DEFAULT false,
  "can_delete" boolean NOT NULL DEFAULT false,
  "can_approve" boolean NOT NULL DEFAULT false,
  "can_export" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_data_archives
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_data_archives (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "school_name" text NOT NULL,
  "archive_source" text NOT NULL CHECK (archive_source = ANY (ARRAY['manual_export'::text, 'soft_delete'::text, 'hard_delete'::text])),
  "payload" jsonb NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.admin_branch_scopes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_branch_scopes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.fee_notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_notifications (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "created_by" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "note" text,
  "due_at" timestamp with time zone,
  "deep_link" text,
  "target_mode" text NOT NULL DEFAULT 'all'::text,
  "target_filters" jsonb,
  "metadata" jsonb,
  "sent_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.fee_notification_recipients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_notification_recipients (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "fee_notification_id" uuid NOT NULL,
  "student_id" uuid,
  "user_id" uuid,
  "delivery_status" text NOT NULL DEFAULT 'pending'::text,
  "failure_reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.ops_health_reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_health_reports (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "status" text NOT NULL CHECK (status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text])),
  "score" integer,
  "domain_status" jsonb,
  "vercel_status" jsonb,
  "supabase_status" jsonb,
  "auth_status" jsonb,
  "database_status" jsonb,
  "storage_status" jsonb,
  "upstash_status" jsonb,
  "subscriptions_status" jsonb,
  "e2e_status" jsonb,
  "summary" text,
  "errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.ops_alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_alerts (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "type" text NOT NULL,
  "severity" text NOT NULL CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "sent_to" text,
  "sent_via" text,
  "sent_status" text NOT NULL CHECK (sent_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped'::text])),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.ops_subscription_snapshots
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_subscription_snapshots (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "active_count" integer,
  "expired_count" integer,
  "expiring_7_days_count" integer,
  "expiring_30_days_count" integer,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.ops_errors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_errors (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "environment" text NOT NULL DEFAULT 'production'::text,
  "severity" text NOT NULL CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])),
  "status" text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'fixed'::text, 'ignored'::text])),
  "source" text NOT NULL CHECK (source = ANY (ARRAY['api'::text, 'frontend'::text, 'storage'::text, 'supabase'::text, 'rbac'::text, 'ops'::text])),
  "route" text,
  "method" text,
  "page_url" text,
  "action" text,
  "user_role" text,
  "school_id" text,
  "branch_id" text,
  "auth_user_id" text,
  "status_code" integer,
  "error_code" text,
  "error_message" text NOT NULL,
  "safe_stack" text,
  "request_id" text,
  "deployment_id" text,
  "user_agent" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "fix_prompt" text,
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "occurrence_count" integer NOT NULL DEFAULT 1,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.support_tickets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "status" text DEFAULT 'open'::text,
  "school_id" text,
  "branch_id" text,
  "user_id" text,
  "page_url" text,
  "message" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.ops_pending_actions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ops_pending_actions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone,
  "status" text DEFAULT 'pending'::text,
  "type" text,
  "requested_by_chat_id" text,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "result" jsonb DEFAULT '{}'::jsonb,
  "school_id" text,
  "branch_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.app_notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_notifications (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "recipient_user_id" text,
  "recipient_role" text,
  "school_id" text,
  "branch_id" text,
  "type" text,
  "title" text,
  "message" text,
  "status" text DEFAULT 'unread'::text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.budgets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "fiscal_year" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text])),
  "notes" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.budget_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_items (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "budget_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "category" text NOT NULL,
  "item_type" text NOT NULL CHECK (item_type = ANY (ARRAY['income'::text, 'expense'::text])),
  "description" text,
  "planned_amount" numeric NOT NULL DEFAULT 0 CHECK (planned_amount >= 0::numeric),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  "id" bigint NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "user_id" uuid,
  "action" varchar NOT NULL CHECK (action::text = ANY (ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying]::text[])),
  "resource_type" varchar NOT NULL,
  "resource_id" uuid,
  "old_value" jsonb,
  "new_value" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "status" varchar DEFAULT 'success'::character varying,
  "error_message" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.deleted_data_archive
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deleted_data_archive (
  "id" bigint NOT NULL DEFAULT nextval('deleted_data_archive_id_seq'::regclass),
  "deletion_timestamp" timestamp with time zone DEFAULT now(),
  "deleted_by" uuid,
  "reason" text,
  "table_name" varchar NOT NULL,
  "record_id" uuid NOT NULL,
  "record_data" jsonb NOT NULL,
  "deletion_request_id" uuid,
  "compliance_verified" boolean DEFAULT false,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.key_rotation_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.key_rotation_log (
  "id" bigint NOT NULL DEFAULT nextval('key_rotation_log_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "old_key_hash" varchar NOT NULL,
  "new_key_hash" varchar NOT NULL,
  "status" varchar DEFAULT 'pending'::character varying,
  "records_affected" integer,
  "error_message" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.backup_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backup_logs (
  "id" bigint NOT NULL DEFAULT nextval('backup_logs_id_seq'::regclass),
  "backup_id" varchar NOT NULL UNIQUE,
  "timestamp" timestamp with time zone DEFAULT now(),
  "size_bytes" bigint,
  "status" varchar DEFAULT 'in_progress'::character varying,
  "integrity_verified" boolean DEFAULT false,
  "error_message" text,
  "restored_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.connection_pool_metrics
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connection_pool_metrics (
  "id" bigint NOT NULL DEFAULT nextval('connection_pool_metrics_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "active_connections" integer,
  "usage_percent" numeric,
  "max_connections" integer DEFAULT 100,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.sessions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token" varchar NOT NULL UNIQUE,
  "last_activity" timestamp with time zone DEFAULT now(),
  "auth_time" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone,
  "ip_address" inet,
  "user_agent" text,
  "is_active" boolean DEFAULT true,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.encryption_keys
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  "id" bigint NOT NULL DEFAULT nextval('encryption_keys_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now(),
  "is_active" boolean DEFAULT true,
  "key_hash" varchar NOT NULL UNIQUE,
  "rotation_schedule" varchar DEFAULT 'monthly'::character varying,
  "last_rotated" timestamp with time zone,
  "archived_at" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.dependency_audits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dependency_audits (
  "id" bigint NOT NULL DEFAULT nextval('dependency_audits_id_seq'::regclass),
  "audit_date" timestamp with time zone DEFAULT now(),
  "package_name" varchar NOT NULL,
  "current_version" varchar,
  "latest_version" varchar,
  "vulnerability_count" integer DEFAULT 0,
  "severity" varchar,
  "status" varchar DEFAULT 'pending'::character varying,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.query_cache
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.query_cache (
  "id" bigint NOT NULL DEFAULT nextval('query_cache_id_seq'::regclass),
  "cache_key" varchar NOT NULL UNIQUE,
  "cache_value" jsonb NOT NULL,
  "ttl_seconds" integer DEFAULT 300,
  "created_at" timestamp with time zone DEFAULT now(),
  "expires_at" timestamp with time zone DEFAULT (now() + '00:05:00'::interval),
  "hit_count" integer DEFAULT 0,
  "last_accessed" timestamp with time zone,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.performance_metrics
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  "id" bigint NOT NULL DEFAULT nextval('performance_metrics_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "endpoint_path" varchar,
  "response_time_ms" integer,
  "cache_hit" boolean DEFAULT false,
  "database_query_time_ms" integer,
  "status_code" integer,
  "user_id" uuid,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.slow_query_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slow_query_log (
  "id" bigint NOT NULL DEFAULT nextval('slow_query_log_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "query_text" text NOT NULL,
  "duration_ms" integer,
  "rows_affected" integer,
  "user_id" uuid,
  "severity" varchar DEFAULT 'warning'::character varying,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.cache_stats
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cache_stats (
  "id" bigint NOT NULL DEFAULT nextval('cache_stats_id_seq'::regclass),
  "timestamp" timestamp with time zone DEFAULT now(),
  "cache_hits" integer DEFAULT 0,
  "cache_misses" integer DEFAULT 0,
  "hit_ratio" numeric,
  "total_cached_items" integer,
  "cache_size_bytes" bigint,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.expenses_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses_audit_log (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "expense_id" uuid NOT NULL,
  "action" text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  "old_data" jsonb,
  "new_data" jsonb,
  "changed_by" uuid,
  "changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance_records_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records_audit_log (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "attendance_record_id" uuid NOT NULL,
  "action" text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  "old_data" jsonb,
  "new_data" jsonb,
  "changed_by" uuid,
  "changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_receipt_config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_receipt_config (
  "school_id" uuid NOT NULL,
  "decoration_top_left" text,
  "decoration_top_right" text,
  "decoration_bottom_left" text,
  "decoration_bottom_right" text,
  "background_pattern_url" text,
  "emblem_url" text,
  "thank_you_text" text,
  "footer_note" text,
  "primary_color" text,
  "accent_color" text,
  "page_size" text NOT NULL DEFAULT 'A5'::text CHECK (page_size = ANY (ARRAY['A5'::text, 'A4'::text])),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid,
  PRIMARY KEY ("school_id")
);

-- ------------------------------------------------------------
-- Table: public.branch_receipt_config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_receipt_config (
  "branch_id" uuid NOT NULL,
  "decoration_top_left" text,
  "decoration_top_right" text,
  "decoration_bottom_left" text,
  "decoration_bottom_right" text,
  "background_pattern_url" text,
  "emblem_url" text,
  "thank_you_text" text,
  "footer_note" text,
  "primary_color" text,
  "accent_color" text,
  "page_size" text NOT NULL DEFAULT 'A5'::text CHECK (page_size = ANY (ARRAY['A5'::text, 'A4'::text])),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid,
  PRIMARY KEY ("branch_id")
);

-- ------------------------------------------------------------
-- Table: public.managed_user_credentials
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managed_user_credentials (
  "auth_user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "login_identifier" text NOT NULL,
  "temporary_password_hash" text NOT NULL DEFAULT ''::text,
  "has_pending_setup" boolean NOT NULL DEFAULT true,
  "password_last_reset_at" timestamp with time zone NOT NULL DEFAULT now(),
  "card_last_printed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "temporary_password_plain" text,
  PRIMARY KEY ("auth_user_id")
);

-- ------------------------------------------------------------
-- Table: public.managed_user_profiles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managed_user_profiles (
  "auth_user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "role" text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'admin'::text, 'super_admin'::text])),
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "student_id" uuid,
  "teacher_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "branch_id" uuid,
  PRIMARY KEY ("auth_user_id")
);

-- ------------------------------------------------------------
-- Table: public.schedule_time_slots
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedule_time_slots (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "slot_order" integer NOT NULL,
  "slot_type" text NOT NULL CHECK (slot_type = ANY (ARRAY['period'::text, 'break'::text])),
  "name_ar" text NOT NULL,
  "name_en" text,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "duration_minutes" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.schedule_working_days
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedule_working_days (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "day_key" text NOT NULL CHECK (day_key = ANY (ARRAY['saturday'::text, 'sunday'::text, 'monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text])),
  "name_ar" text NOT NULL,
  "name_en" text NOT NULL,
  "day_order" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.perm_modules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perm_modules (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "name_ar" text NOT NULL,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.perm_pages
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perm_pages (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "module_id" uuid NOT NULL,
  "key" text NOT NULL UNIQUE,
  "name_ar" text NOT NULL,
  "route" text NOT NULL,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.perm_definitions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perm_definitions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "page_id" uuid NOT NULL,
  "type" text NOT NULL CHECK (type = ANY (ARRAY['action'::text, 'field'::text, 'special'::text, 'data_scope'::text])),
  "key" text NOT NULL UNIQUE,
  "name_ar" text NOT NULL,
  "description_ar" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_roles (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "key" text NOT NULL,
  "name_ar" text NOT NULL,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "color" text,
  "dashboard_sections" jsonb NOT NULL DEFAULT '{"stats": true, "activity": true, "financial": true, "fees_table": true, "notifications": true, "payments_list": true, "overdue_students": true}'::jsonb,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.role_perm_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_perm_assignments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_perm_overrides
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_perm_overrides (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "is_granted" boolean NOT NULL,
  "granted_by" uuid,
  "reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_qualifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_qualifications (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "institution" text,
  "date_obtained" date,
  "expiry_date" date,
  "grade" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_documents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_documents (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "document_type" text NOT NULL,
  "title" text NOT NULL,
  "file_path" text NOT NULL,
  "expiry_date" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "image_url" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_leaves
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_leaves (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "teacher_id" uuid NOT NULL,
  "leave_type" text NOT NULL CHECK (leave_type = ANY (ARRAY['annual'::text, 'sick'::text, 'emergency'::text, 'unpaid'::text, 'maternity'::text, 'other'::text])),
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "days_count" integer NOT NULL,
  "reason" text,
  "status" text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])),
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "substitute_teacher_id" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_evaluations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_evaluations (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "teacher_id" uuid NOT NULL,
  "evaluator_id" uuid,
  "evaluation_date" date NOT NULL,
  "academic_year" text,
  "overall_score" numeric,
  "overall_grade" text CHECK (overall_grade = ANY (ARRAY['excellent'::text, 'very_good'::text, 'good'::text, 'acceptable'::text, 'poor'::text])),
  "discipline_score" numeric,
  "curriculum_score" numeric,
  "student_results_score" numeric,
  "cooperation_score" numeric,
  "technology_score" numeric,
  "classroom_mgmt_score" numeric,
  "creativity_score" numeric,
  "notes" text,
  "recommendations" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_notifications (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "type" text NOT NULL DEFAULT 'insite'::text CHECK (type = ANY (ARRAY['insite'::text, 'push'::text, 'email'::text])),
  "title" text NOT NULL,
  "body" text NOT NULL,
  "target_type" text NOT NULL DEFAULT 'all'::text CHECK (target_type = ANY (ARRAY['all'::text, 'students'::text, 'teachers'::text, 'class'::text, 'section'::text, 'person'::text])),
  "target_class" text,
  "target_section" text,
  "target_user_id" uuid,
  "priority" text NOT NULL DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['normal'::text, 'important'::text, 'urgent'::text])),
  "category" text NOT NULL DEFAULT 'general'::text CHECK (category = ANY (ARRAY['general'::text, 'exams'::text, 'homework'::text, 'holiday'::text, 'financial'::text, 'activity'::text])),
  "sent_by_user_id" uuid,
  "status" text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'failed'::text])),
  "recipient_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "sent_at" timestamp with time zone,
  "media_url" text,
  "media_type" text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'link'::text])),
  "template" text NOT NULL DEFAULT 'default'::text CHECK (template = ANY (ARRAY['default'::text, 'alert'::text, 'celebration'::text, 'info'::text, 'reminder'::text])),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.notification_recipients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "notification_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.school_announcements
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_announcements (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "media_url" text,
  "media_type" text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'link'::text])),
  "is_pinned" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.user_push_subscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "subscription_json" jsonb NOT NULL,
  "platform" text NOT NULL DEFAULT 'web'::text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "work_start_time" time without time zone NOT NULL DEFAULT '08:00:00'::time without time zone,
  "work_end_time" time without time zone NOT NULL DEFAULT '14:00:00'::time without time zone,
  "late_threshold_minutes" integer NOT NULL DEFAULT 15,
  "absent_deduction_type" text NOT NULL DEFAULT 'none'::text CHECK (absent_deduction_type = ANY (ARRAY['none'::text, 'fixed'::text, 'daily_rate'::text])),
  "absent_deduction_amount" numeric,
  "late_deduction_type" text NOT NULL DEFAULT 'none'::text CHECK (late_deduction_type = ANY (ARRAY['none'::text, 'fixed'::text, 'per_minute'::text])),
  "late_deduction_amount" numeric,
  "max_late_days_before_absent" integer NOT NULL DEFAULT 3,
  "work_days" text[] NOT NULL DEFAULT ARRAY['sunday'::text, 'monday'::text, 'tuesday'::text, 'wednesday'::text, 'thursday'::text],
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_attendance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "teacher_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'present'::text CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text, 'holiday'::text])),
  "check_in_time" time without time zone,
  "check_out_time" time without time zone,
  "late_minutes" integer GENERATED ALWAYS AS (
CASE
    WHEN ((status = 'late'::text) AND (check_in_time IS NOT NULL)) THEN (GREATEST((0)::numeric, (EXTRACT(epoch FROM (check_in_time - '08:00:00'::time without time zone)) / (60)::numeric)))::integer
    ELSE 0
END) STORED,
  "notes" text,
  "recorded_by" uuid,
  "qr_code_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance_qr_codes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_qr_codes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid,
  "code" text NOT NULL DEFAULT (gen_random_uuid())::text UNIQUE,
  "label" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "expires_at" timestamp with time zone,
  "scan_count" integer NOT NULL DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.attendance_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_audit_log (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_attendance_id" uuid,
  "action" text NOT NULL CHECK (action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])),
  "old_data" jsonb,
  "new_data" jsonb,
  "performed_by" uuid,
  "performed_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.teacher_activities
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_activities (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "activity_type" text NOT NULL CHECK (activity_type = ANY (ARRAY['notification'::text, 'homework'::text, 'grade_entry'::text, 'photo'::text, 'video'::text, 'file'::text, 'link'::text, 'announcement'::text, 'exam_photo'::text, 'worksheet'::text, 'lesson_summary'::text])),
  "title" text NOT NULL,
  "body" text,
  "subject" text,
  "target_type" text NOT NULL CHECK (target_type = ANY (ARRAY['class'::text, 'section'::text, 'student'::text, 'all_students'::text, 'custom'::text])),
  "target_class_id" uuid,
  "target_section_id" uuid,
  "target_student_id" uuid,
  "target_students" jsonb,
  "target_count" integer DEFAULT 0,
  "viewed_count" integer DEFAULT 0,
  "delivered_count" integer DEFAULT 0,
  "homework_due_date" date,
  "homework_submitted_count" integer DEFAULT 0,
  "homework_graded" boolean DEFAULT false,
  "review_status" text DEFAULT 'auto_approved'::text CHECK (review_status = ANY (ARRAY['auto_approved'::text, 'pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text])),
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "rejection_reason" text,
  "flag_reason" text,
  "flagged_by" uuid,
  "is_published" boolean DEFAULT true,
  "is_deleted" boolean DEFAULT false,
  "deleted_by" uuid,
  "deleted_reason" text,
  "published_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.activity_attachments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_attachments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "file_type" text NOT NULL CHECK (file_type = ANY (ARRAY['image'::text, 'video'::text, 'pdf'::text, 'document'::text, 'audio'::text, 'archive'::text, 'other'::text])),
  "file_name" text NOT NULL,
  "file_path" text NOT NULL,
  "file_size" bigint NOT NULL DEFAULT 0,
  "file_extension" text NOT NULL DEFAULT ''::text,
  "mime_type" text,
  "width" integer,
  "height" integer,
  "thumbnail_path" text,
  "duration_seconds" integer,
  "video_thumbnail" text,
  "external_url" text,
  "url_title" text,
  "url_thumbnail" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.activity_views
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_views (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "viewed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "view_count" integer DEFAULT 1,
  "last_viewed_at" timestamp with time zone,
  "homework_status" text DEFAULT 'not_submitted'::text CHECK (homework_status = ANY (ARRAY['not_submitted'::text, 'submitted'::text, 'late'::text, 'graded'::text])),
  "submitted_at" timestamp with time zone,
  "grade" numeric,
  "device_type" text CHECK (device_type = ANY (ARRAY['android'::text, 'ios'::text, 'web'::text])),
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.activity_monitoring_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_monitoring_settings (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "review_mode" text DEFAULT 'post_review'::text CHECK (review_mode = ANY (ARRAY['post_review'::text, 'pre_approval'::text, 'disabled'::text])),
  "require_approval_for_links" boolean DEFAULT true,
  "require_approval_for_videos" boolean DEFAULT false,
  "require_approval_for_files" boolean DEFAULT false,
  "max_image_size_mb" integer DEFAULT 10,
  "max_video_size_mb" integer DEFAULT 100,
  "max_file_size_mb" integer DEFAULT 20,
  "max_attachments_per_activity" integer DEFAULT 10,
  "max_daily_notifications" integer DEFAULT 10,
  "max_daily_homework" integer DEFAULT 5,
  "alert_inactive_days" integer DEFAULT 7,
  "alert_low_view_percentage" integer DEFAULT 50,
  "weekly_summary_enabled" boolean DEFAULT true,
  "weekly_summary_day" text DEFAULT 'thursday'::text CHECK (weekly_summary_day = ANY (ARRAY['saturday'::text, 'sunday'::text, 'thursday'::text])),
  "total_storage_limit_gb" numeric DEFAULT 50,
  "teacher_storage_limit_mb" integer DEFAULT 500,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.activity_reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_reports (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "activity_id" uuid NOT NULL,
  "reported_by" uuid NOT NULL,
  "report_type" text NOT NULL CHECK (report_type = ANY (ARRAY['inappropriate'::text, 'incorrect'::text, 'spam'::text, 'copyright'::text, 'other'::text])),
  "description" text,
  "status" text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'action_taken'::text, 'dismissed'::text])),
  "action_taken" text,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.calendar_events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "branch_id" uuid,
  "title" text NOT NULL,
  "title_en" text,
  "date" date NOT NULL,
  "end_date" date,
  "type" text NOT NULL CHECK (type = ANY (ARRAY['holiday'::text, 'religious'::text, 'national'::text, 'school'::text, 'exam'::text, 'vacation'::text, 'custom'::text])),
  "hijri_date" text,
  "description" text,
  "color" text,
  "is_recurring" boolean NOT NULL DEFAULT false,
  "is_global" boolean NOT NULL DEFAULT false,
  "created_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.grade_schemes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_schemes (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "class_level" text NOT NULL CHECK (class_level = ANY (ARRAY['primary'::text, 'intermediate'::text, 'secondary'::text])),
  "oral_max" numeric NOT NULL DEFAULT 10,
  "homework_max" numeric NOT NULL DEFAULT 10,
  "monthly_max" numeric NOT NULL DEFAULT 20,
  "midterm_max" numeric NOT NULL DEFAULT 20,
  "final_max" numeric NOT NULL DEFAULT 40,
  "total_max" numeric NOT NULL DEFAULT 100,
  "pass_score" numeric NOT NULL DEFAULT 50,
  "final_is_ministerial" boolean NOT NULL DEFAULT false,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.grade_entries
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_entries (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "class_id" uuid,
  "section_id" uuid,
  "teacher_id" uuid,
  "grade_scheme_id" uuid,
  "academic_year" text NOT NULL,
  "semester" smallint NOT NULL DEFAULT 1 CHECK (semester = ANY (ARRAY[1, 2])),
  "oral_score" numeric,
  "homework_score" numeric,
  "monthly_score" numeric,
  "midterm_score" numeric,
  "final_score" numeric,
  "total_score" numeric,
  "grade_label" text,
  "status" text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'locked'::text])),
  "locked_by" uuid,
  "locked_at" timestamp with time zone,
  "lock_reason" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "note" text,
  "certificate_url" text,
  "grade_type_id" uuid,
  "grade_type_name" text,
  "score" numeric,
  "max_score" numeric DEFAULT 100,
  "percentage" numeric,
  "teacher_name" text,
  "notification_sent" boolean DEFAULT false,
  "notification_sent_at" timestamp with time zone,
  "exam_photos" text[] DEFAULT '{}'::text[],
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.grade_audit_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_audit_log (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "grade_entry_id" uuid NOT NULL,
  "changed_by" uuid,
  "changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "field_name" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "reason" text,
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.student_badges
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_badges (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_id" uuid,
  "badge_type" text NOT NULL CHECK (badge_type = ANY (ARRAY['diamond'::text, 'gold'::text, 'silver'::text, 'bronze'::text, 'top_student'::text, 'most_improved'::text, 'perfect_score'::text, 'streak'::text, 'on_time'::text])),
  "earned_at" timestamp with time zone NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.student_goals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_goals (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_id" uuid,
  "target_score" numeric NOT NULL,
  "deadline" date,
  "status" text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'achieved'::text, 'missed'::text])),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.bot_access_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_access_logs (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "chat_id" text NOT NULL,
  "username" text,
  "command" text,
  "is_authorized" boolean NOT NULL DEFAULT false,
  "ip" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.bot_settings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_settings (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "value" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.health_checks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_checks (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "service" text NOT NULL,
  "status" text NOT NULL CHECK (status = ANY (ARRAY['up'::text, 'down'::text, 'slow'::text])),
  "response_ms" integer,
  "error_message" text,
  "checked_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.hourly_stats
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hourly_stats (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "hour" timestamp with time zone NOT NULL UNIQUE,
  "active_users_web" integer NOT NULL DEFAULT 0,
  "active_users_mobile" integer NOT NULL DEFAULT 0,
  "api_requests" integer NOT NULL DEFAULT 0,
  "errors_count" integer NOT NULL DEFAULT 0,
  "avg_response_ms" integer,
  "grades_entered" integer NOT NULL DEFAULT 0,
  "attendance_recorded" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.daily_reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_reports (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "date" date NOT NULL UNIQUE,
  "total_users" integer NOT NULL DEFAULT 0,
  "active_users" integer NOT NULL DEFAULT 0,
  "new_users" integer NOT NULL DEFAULT 0,
  "total_grades" integer NOT NULL DEFAULT 0,
  "total_attendance" integer NOT NULL DEFAULT 0,
  "total_notifications" integer NOT NULL DEFAULT 0,
  "error_count" integer NOT NULL DEFAULT 0,
  "avg_response_ms" integer,
  "revenue" numeric NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.error_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_logs (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "route" text,
  "method" text,
  "status_code" integer,
  "error_message" text,
  "stack_trace" text,
  "user_id" uuid,
  "school_id" uuid,
  "request_body" jsonb,
  "ip" text,
  "user_agent" text,
  "is_resolved" boolean NOT NULL DEFAULT false,
  "resolved_at" timestamp with time zone,
  "resolved_by" text,
  "occurrence_count" integer NOT NULL DEFAULT 1,
  "first_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_seen_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.crm_leads
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_leads (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_name" text NOT NULL,
  "contact_name" text,
  "phone" text,
  "notes" text,
  "status" text NOT NULL DEFAULT 'cold'::text CHECK (status = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text, 'converted'::text, 'lost'::text])),
  "last_contact_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "invoice_number" text NOT NULL UNIQUE,
  "school_id" uuid,
  "school_name" text NOT NULL,
  "amount" numeric NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])),
  "due_date" date,
  "paid_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.changelog_entries
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.changelog_entries (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "version" text NOT NULL,
  "description" text NOT NULL,
  "sent_to" text DEFAULT 'all'::text,
  "notification_sent" boolean NOT NULL DEFAULT false,
  "released_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.trial_activations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_activations (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_name" text NOT NULL,
  "school_id" uuid,
  "days" integer NOT NULL DEFAULT 30,
  "starts_at" date NOT NULL DEFAULT CURRENT_DATE,
  "ends_at" date NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "notes" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.survey_results
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.survey_results (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "school_id" uuid,
  "role" text,
  "score" integer CHECK (score >= 1 AND score <= 5),
  "feedback" text,
  "survey_sent_at" timestamp with time zone,
  "responded_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.grade_types
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grade_types (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "max_score" numeric NOT NULL DEFAULT 100,
  "pass_score" numeric NOT NULL DEFAULT 50,
  "weight" numeric DEFAULT 1,
  "sort_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

-- ------------------------------------------------------------
-- Table: public.admin_kv_store
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_kv_store (
  "key" text NOT NULL,
  "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("key")
);


-- ============================================================
-- Foreign Key Constraints
-- ============================================================

ALTER TABLE public.schools
  ADD CONSTRAINT schools_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.schools
  ADD CONSTRAINT schools_group_id_fkey
  FOREIGN KEY ("group_id") REFERENCES public.school_groups ("id");

ALTER TABLE public.branches
  ADD CONSTRAINT branches_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.branches
  ADD CONSTRAINT branches_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.branches
  ADD CONSTRAINT branches_group_id_fkey
  FOREIGN KEY ("group_id") REFERENCES public.school_groups ("id");

ALTER TABLE public.users
  ADD CONSTRAINT users_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.users
  ADD CONSTRAINT users_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.students
  ADD CONSTRAINT students_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.students
  ADD CONSTRAINT students_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.students
  ADD CONSTRAINT students_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES public.users ("id");

ALTER TABLE public.students
  ADD CONSTRAINT students_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.payments
  ADD CONSTRAINT payments_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.payments
  ADD CONSTRAINT payments_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES public.users ("id");

ALTER TABLE public.payments
  ADD CONSTRAINT payments_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.payments
  ADD CONSTRAINT payments_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.payments
  ADD CONSTRAINT payments_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_approved_by_fkey
  FOREIGN KEY ("approved_by") REFERENCES public.users ("id");

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.discounts
  ADD CONSTRAINT discounts_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.installments
  ADD CONSTRAINT installments_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.installments
  ADD CONSTRAINT installments_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.salaries
  ADD CONSTRAINT salaries_paid_by_fkey
  FOREIGN KEY ("paid_by") REFERENCES public.users ("id");

ALTER TABLE public.salaries
  ADD CONSTRAINT salaries_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.salaries
  ADD CONSTRAINT salaries_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.salaries
  ADD CONSTRAINT salaries_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_recorded_by_fkey
  FOREIGN KEY ("recorded_by") REFERENCES public.users ("id");

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.financial_summary
  ADD CONSTRAINT financial_summary_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.financial_summary
  ADD CONSTRAINT financial_summary_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES public.users ("id");

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.classes
  ADD CONSTRAINT classes_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.classes
  ADD CONSTRAINT classes_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.lecture_prices
  ADD CONSTRAINT lecture_prices_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.weekly_schedule
  ADD CONSTRAINT weekly_schedule_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.weekly_schedule
  ADD CONSTRAINT weekly_schedule_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.lesson_times
  ADD CONSTRAINT lesson_times_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.daily_lectures
  ADD CONSTRAINT daily_lectures_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.daily_lectures
  ADD CONSTRAINT daily_lectures_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.deductions
  ADD CONSTRAINT deductions_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.deductions
  ADD CONSTRAINT deductions_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.deductions
  ADD CONSTRAINT deductions_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.salary_archives
  ADD CONSTRAINT salary_archives_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.expense_types
  ADD CONSTRAINT expense_types_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.expense_types
  ADD CONSTRAINT expense_types_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.expense_types
  ADD CONSTRAINT expense_types_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_expense_type_id_fkey
  FOREIGN KEY ("expense_type_id") REFERENCES public.expense_types ("id");

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_school_role_id_fkey
  FOREIGN KEY ("school_role_id") REFERENCES public.school_roles ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_default_branch_id_fkey
  FOREIGN KEY ("default_branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_group_id_fkey
  FOREIGN KEY ("group_id") REFERENCES public.school_groups ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_id_fkey
  FOREIGN KEY ("id") REFERENCES auth.users ("id");

ALTER TABLE public.class_fees
  ADD CONSTRAINT class_fees_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.class_fees
  ADD CONSTRAINT class_fees_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.sections
  ADD CONSTRAINT sections_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.sections
  ADD CONSTRAINT sections_class_id_fkey
  FOREIGN KEY ("class_id") REFERENCES public.classes ("id");

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY ("actor_id") REFERENCES auth.users ("id");

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.custom_roles
  ADD CONSTRAINT custom_roles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_class_id_fkey
  FOREIGN KEY ("class_id") REFERENCES public.classes ("id");

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_section_id_fkey
  FOREIGN KEY ("section_id") REFERENCES public.sections ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_section_id_fkey
  FOREIGN KEY ("section_id") REFERENCES public.sections ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_class_id_fkey
  FOREIGN KEY ("class_id") REFERENCES public.classes ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_section_id_fkey
  FOREIGN KEY ("section_id") REFERENCES public.sections ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_class_id_fkey
  FOREIGN KEY ("class_id") REFERENCES public.classes ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_assignment_id_fkey
  FOREIGN KEY ("assignment_id") REFERENCES public.assignments ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.grades
  ADD CONSTRAINT grades_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.account_archives
  ADD CONSTRAINT account_archives_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.account_archives
  ADD CONSTRAINT account_archives_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.school_branding_settings
  ADD CONSTRAINT school_branding_settings_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.school_branding_settings
  ADD CONSTRAINT school_branding_settings_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.class_schedules
  ADD CONSTRAINT class_schedules_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.class_schedules
  ADD CONSTRAINT class_schedules_time_slot_id_fkey
  FOREIGN KEY ("time_slot_id") REFERENCES public.schedule_time_slots ("id");

ALTER TABLE public.group_alerts
  ADD CONSTRAINT group_alerts_group_id_fkey
  FOREIGN KEY ("group_id") REFERENCES public.school_groups ("id");

ALTER TABLE public.group_alerts
  ADD CONSTRAINT group_alerts_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.rbac_roles
  ADD CONSTRAINT rbac_roles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.rbac_role_permissions
  ADD CONSTRAINT rbac_role_permissions_role_id_fkey
  FOREIGN KEY ("role_id") REFERENCES public.rbac_roles ("id");

ALTER TABLE public.rbac_role_permissions
  ADD CONSTRAINT rbac_role_permissions_permission_id_fkey
  FOREIGN KEY ("permission_id") REFERENCES public.rbac_permissions ("id");

ALTER TABLE public.user_role_assignments
  ADD CONSTRAINT user_role_assignments_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.user_role_assignments
  ADD CONSTRAINT user_role_assignments_role_id_fkey
  FOREIGN KEY ("role_id") REFERENCES public.rbac_roles ("id");

ALTER TABLE public.user_role_assignments
  ADD CONSTRAINT user_role_assignments_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_role_assignments
  ADD CONSTRAINT user_role_assignments_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.user_page_access
  ADD CONSTRAINT user_page_access_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.user_page_access
  ADD CONSTRAINT user_page_access_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_page_access
  ADD CONSTRAINT user_page_access_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.school_data_archives
  ADD CONSTRAINT school_data_archives_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

ALTER TABLE public.school_data_archives
  ADD CONSTRAINT school_data_archives_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.admin_branch_scopes
  ADD CONSTRAINT admin_branch_scopes_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.admin_branch_scopes
  ADD CONSTRAINT admin_branch_scopes_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES public.user_profiles ("id");

ALTER TABLE public.admin_branch_scopes
  ADD CONSTRAINT admin_branch_scopes_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.fee_notifications
  ADD CONSTRAINT fee_notifications_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.fee_notifications
  ADD CONSTRAINT fee_notifications_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.fee_notifications
  ADD CONSTRAINT fee_notifications_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.fee_notification_recipients
  ADD CONSTRAINT fee_notification_recipients_fee_notification_id_fkey
  FOREIGN KEY ("fee_notification_id") REFERENCES public.fee_notifications ("id");

ALTER TABLE public.fee_notification_recipients
  ADD CONSTRAINT fee_notification_recipients_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.budget_items
  ADD CONSTRAINT budget_items_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.budget_items
  ADD CONSTRAINT budget_items_budget_id_fkey
  FOREIGN KEY ("budget_id") REFERENCES public.budgets ("id");

ALTER TABLE public.budget_items
  ADD CONSTRAINT budget_items_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.deleted_data_archive
  ADD CONSTRAINT deleted_data_archive_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES auth.users ("id");

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.expenses_audit_log
  ADD CONSTRAINT expenses_audit_log_changed_by_fkey
  FOREIGN KEY ("changed_by") REFERENCES auth.users ("id");

ALTER TABLE public.expenses_audit_log
  ADD CONSTRAINT expenses_audit_log_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.attendance_records_audit_log
  ADD CONSTRAINT attendance_records_audit_log_changed_by_fkey
  FOREIGN KEY ("changed_by") REFERENCES auth.users ("id");

ALTER TABLE public.attendance_records_audit_log
  ADD CONSTRAINT attendance_records_audit_log_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.school_receipt_config
  ADD CONSTRAINT school_receipt_config_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.school_receipt_config
  ADD CONSTRAINT school_receipt_config_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.branch_receipt_config
  ADD CONSTRAINT branch_receipt_config_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.branch_receipt_config
  ADD CONSTRAINT branch_receipt_config_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.managed_user_credentials
  ADD CONSTRAINT managed_user_credentials_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.managed_user_credentials
  ADD CONSTRAINT managed_user_credentials_auth_user_id_fkey
  FOREIGN KEY ("auth_user_id") REFERENCES auth.users ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_auth_user_id_fkey
  FOREIGN KEY ("auth_user_id") REFERENCES auth.users ("id");

ALTER TABLE public.managed_user_profiles
  ADD CONSTRAINT managed_user_profiles_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.schedule_time_slots
  ADD CONSTRAINT schedule_time_slots_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.schedule_time_slots
  ADD CONSTRAINT schedule_time_slots_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.schedule_working_days
  ADD CONSTRAINT schedule_working_days_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.schedule_working_days
  ADD CONSTRAINT schedule_working_days_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.perm_pages
  ADD CONSTRAINT perm_pages_module_id_fkey
  FOREIGN KEY ("module_id") REFERENCES public.perm_modules ("id");

ALTER TABLE public.perm_definitions
  ADD CONSTRAINT perm_definitions_page_id_fkey
  FOREIGN KEY ("page_id") REFERENCES public.perm_pages ("id");

ALTER TABLE public.school_roles
  ADD CONSTRAINT school_roles_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.role_perm_assignments
  ADD CONSTRAINT role_perm_assignments_permission_id_fkey
  FOREIGN KEY ("permission_id") REFERENCES public.perm_definitions ("id");

ALTER TABLE public.role_perm_assignments
  ADD CONSTRAINT role_perm_assignments_role_id_fkey
  FOREIGN KEY ("role_id") REFERENCES public.school_roles ("id");

ALTER TABLE public.user_perm_overrides
  ADD CONSTRAINT user_perm_overrides_permission_id_fkey
  FOREIGN KEY ("permission_id") REFERENCES public.perm_definitions ("id");

ALTER TABLE public.user_perm_overrides
  ADD CONSTRAINT user_perm_overrides_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES public.user_profiles ("id");

ALTER TABLE public.user_perm_overrides
  ADD CONSTRAINT user_perm_overrides_granted_by_fkey
  FOREIGN KEY ("granted_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.teacher_qualifications
  ADD CONSTRAINT teacher_qualifications_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_documents
  ADD CONSTRAINT teacher_documents_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_leaves
  ADD CONSTRAINT teacher_leaves_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_evaluations
  ADD CONSTRAINT teacher_evaluations_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.school_notifications
  ADD CONSTRAINT school_notifications_target_user_id_fkey
  FOREIGN KEY ("target_user_id") REFERENCES auth.users ("id");

ALTER TABLE public.school_notifications
  ADD CONSTRAINT school_notifications_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.school_notifications
  ADD CONSTRAINT school_notifications_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.school_notifications
  ADD CONSTRAINT school_notifications_sent_by_user_id_fkey
  FOREIGN KEY ("sent_by_user_id") REFERENCES auth.users ("id");

ALTER TABLE public.notification_recipients
  ADD CONSTRAINT notification_recipients_notification_id_fkey
  FOREIGN KEY ("notification_id") REFERENCES public.school_notifications ("id");

ALTER TABLE public.notification_recipients
  ADD CONSTRAINT notification_recipients_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.school_announcements
  ADD CONSTRAINT school_announcements_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

ALTER TABLE public.school_announcements
  ADD CONSTRAINT school_announcements_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.school_announcements
  ADD CONSTRAINT school_announcements_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_push_subscriptions
  ADD CONSTRAINT user_push_subscriptions_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.user_push_subscriptions
  ADD CONSTRAINT user_push_subscriptions_user_id_fkey
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id");

ALTER TABLE public.attendance_settings
  ADD CONSTRAINT attendance_settings_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.attendance_settings
  ADD CONSTRAINT attendance_settings_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teacher_attendance
  ADD CONSTRAINT teacher_attendance_recorded_by_fkey
  FOREIGN KEY ("recorded_by") REFERENCES public.users ("id");

ALTER TABLE public.attendance_qr_codes
  ADD CONSTRAINT attendance_qr_codes_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES public.users ("id");

ALTER TABLE public.attendance_qr_codes
  ADD CONSTRAINT attendance_qr_codes_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.attendance_qr_codes
  ADD CONSTRAINT attendance_qr_codes_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.attendance_audit_log
  ADD CONSTRAINT attendance_audit_log_teacher_attendance_id_fkey
  FOREIGN KEY ("teacher_attendance_id") REFERENCES public.teacher_attendance ("id");

ALTER TABLE public.attendance_audit_log
  ADD CONSTRAINT attendance_audit_log_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.attendance_audit_log
  ADD CONSTRAINT attendance_audit_log_performed_by_fkey
  FOREIGN KEY ("performed_by") REFERENCES public.users ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_target_class_id_fkey
  FOREIGN KEY ("target_class_id") REFERENCES public.classes ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_target_section_id_fkey
  FOREIGN KEY ("target_section_id") REFERENCES public.sections ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_deleted_by_fkey
  FOREIGN KEY ("deleted_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_flagged_by_fkey
  FOREIGN KEY ("flagged_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_target_student_id_fkey
  FOREIGN KEY ("target_student_id") REFERENCES public.students ("id");

ALTER TABLE public.teacher_activities
  ADD CONSTRAINT teacher_activities_reviewed_by_fkey
  FOREIGN KEY ("reviewed_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.activity_attachments
  ADD CONSTRAINT activity_attachments_activity_id_fkey
  FOREIGN KEY ("activity_id") REFERENCES public.teacher_activities ("id");

ALTER TABLE public.activity_attachments
  ADD CONSTRAINT activity_attachments_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.activity_views
  ADD CONSTRAINT activity_views_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.activity_views
  ADD CONSTRAINT activity_views_activity_id_fkey
  FOREIGN KEY ("activity_id") REFERENCES public.teacher_activities ("id");

ALTER TABLE public.activity_monitoring_settings
  ADD CONSTRAINT activity_monitoring_settings_branch_id_fkey
  FOREIGN KEY ("branch_id") REFERENCES public.branches ("id");

ALTER TABLE public.activity_monitoring_settings
  ADD CONSTRAINT activity_monitoring_settings_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.activity_reports
  ADD CONSTRAINT activity_reports_activity_id_fkey
  FOREIGN KEY ("activity_id") REFERENCES public.teacher_activities ("id");

ALTER TABLE public.activity_reports
  ADD CONSTRAINT activity_reports_resolved_by_fkey
  FOREIGN KEY ("resolved_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.activity_reports
  ADD CONSTRAINT activity_reports_reported_by_fkey
  FOREIGN KEY ("reported_by") REFERENCES public.user_profiles ("id");

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grade_schemes
  ADD CONSTRAINT grade_schemes_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_grade_scheme_id_fkey
  FOREIGN KEY ("grade_scheme_id") REFERENCES public.grade_schemes ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_created_by_fkey
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_updated_by_fkey
  FOREIGN KEY ("updated_by") REFERENCES auth.users ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_class_id_fkey
  FOREIGN KEY ("class_id") REFERENCES public.classes ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_section_id_fkey
  FOREIGN KEY ("section_id") REFERENCES public.sections ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_teacher_id_fkey
  FOREIGN KEY ("teacher_id") REFERENCES public.teachers ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_locked_by_fkey
  FOREIGN KEY ("locked_by") REFERENCES auth.users ("id");

ALTER TABLE public.grade_entries
  ADD CONSTRAINT grade_entries_grade_type_id_fkey
  FOREIGN KEY ("grade_type_id") REFERENCES public.grade_types ("id");

ALTER TABLE public.grade_audit_log
  ADD CONSTRAINT grade_audit_log_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grade_audit_log
  ADD CONSTRAINT grade_audit_log_changed_by_fkey
  FOREIGN KEY ("changed_by") REFERENCES auth.users ("id");

ALTER TABLE public.grade_audit_log
  ADD CONSTRAINT grade_audit_log_grade_entry_id_fkey
  FOREIGN KEY ("grade_entry_id") REFERENCES public.grade_entries ("id");

ALTER TABLE public.student_badges
  ADD CONSTRAINT student_badges_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.student_badges
  ADD CONSTRAINT student_badges_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.student_badges
  ADD CONSTRAINT student_badges_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.student_goals
  ADD CONSTRAINT student_goals_student_id_fkey
  FOREIGN KEY ("student_id") REFERENCES public.students ("id");

ALTER TABLE public.student_goals
  ADD CONSTRAINT student_goals_subject_id_fkey
  FOREIGN KEY ("subject_id") REFERENCES public.subjects ("id");

ALTER TABLE public.student_goals
  ADD CONSTRAINT student_goals_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.trial_activations
  ADD CONSTRAINT trial_activations_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");

ALTER TABLE public.grade_types
  ADD CONSTRAINT grade_types_school_id_fkey
  FOREIGN KEY ("school_id") REFERENCES public.schools ("id");


-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_branches_school_id ON public.branches ("school_id");
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users ("school_id");
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON public.users ("branch_id");
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students ("school_id");
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON public.students ("branch_id");
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students ("status");
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON public.payments ("school_id");
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON public.payments ("branch_id");
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments ("student_id");
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments ("created_at");
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers ("school_id");
CREATE INDEX IF NOT EXISTS idx_teachers_branch_id ON public.teachers ("branch_id");
CREATE INDEX IF NOT EXISTS idx_salaries_teacher_id ON public.salaries ("teacher_id");
CREATE INDEX IF NOT EXISTS idx_salaries_school_id ON public.salaries ("school_id");
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON public.attendance ("school_id");
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance ("student_id");
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON public.attendance ("teacher_id");
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_id ON public.attendance_records ("school_id");
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records ("student_id");
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON public.expenses ("school_id");
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses ("branch_id");
CREATE INDEX IF NOT EXISTS idx_discounts_student_id ON public.discounts ("student_id");
CREATE INDEX IF NOT EXISTS idx_installments_student_id ON public.installments ("student_id");
CREATE INDEX IF NOT EXISTS idx_grade_entries_student_id ON public.grade_entries ("student_id");
CREATE INDEX IF NOT EXISTS idx_grade_entries_school_id ON public.grade_entries ("school_id");
CREATE INDEX IF NOT EXISTS idx_teacher_activities_teacher_id ON public.teacher_activities ("teacher_id");
CREATE INDEX IF NOT EXISTS idx_teacher_activities_school_id ON public.teacher_activities ("school_id");
CREATE INDEX IF NOT EXISTS idx_activity_logs_school_id ON public.activity_logs ("school_id");
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.notifications ("school_id");
CREATE INDEX IF NOT EXISTS idx_school_notifications_school_id ON public.school_notifications ("school_id");
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON public.user_profiles ("school_id");
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_school_id ON public.user_role_assignments ("school_id");
CREATE INDEX IF NOT EXISTS idx_rbac_roles_school_id ON public.rbac_roles ("school_id");
CREATE INDEX IF NOT EXISTS idx_fee_notifications_school_id ON public.fee_notifications ("school_id");
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs ("school_id");
CREATE INDEX IF NOT EXISTS idx_schools_deleted_at ON public.schools ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON public.branches ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON public.payments ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_expense_types_deleted_at ON public.expense_types ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON public.user_profiles ("deleted_at");
CREATE INDEX IF NOT EXISTS idx_attendance_records_deleted_at ON public.attendance_records ("deleted_at");

-- End of migration