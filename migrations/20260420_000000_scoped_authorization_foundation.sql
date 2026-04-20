ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_level text,
  ADD COLUMN IF NOT EXISTS allowed_module text,
  ADD COLUMN IF NOT EXISTS is_single_page_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hierarchy_level integer,
  ADD COLUMN IF NOT EXISTS permissions_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_scope_level_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_scope_level_check
      CHECK (scope_level IN ('super_admin', 'group_admin', 'branch_user', 'restricted'));
  END IF;
END
$$;

UPDATE public.user_profiles
SET scope_level = CASE
  WHEN lower(role) = 'super_admin' THEN 'super_admin'
  WHEN is_single_page_user = true OR allowed_module IS NOT NULL THEN 'restricted'
  WHEN branch_id IS NOT NULL OR default_branch_id IS NOT NULL THEN 'branch_user'
  ELSE 'group_admin'
END
WHERE scope_level IS NULL;

CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  resource_code text NOT NULL,
  action_code text NOT NULL,
  page_code text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rbac_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  scope_level text NOT NULL CHECK (scope_level IN ('group_admin', 'branch_user', 'restricted')),
  hierarchy_level integer NOT NULL DEFAULT 100,
  is_system_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS public.rbac_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.rbac_permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.rbac_roles(id) ON DELETE CASCADE,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  scope_level text NOT NULL CHECK (scope_level IN ('group_admin', 'branch_user', 'restricted')),
  hierarchy_level integer NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id, school_id, branch_id)
);

CREATE TABLE IF NOT EXISTS public.user_page_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  page_code text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, school_id, branch_id, page_code)
);

CREATE INDEX IF NOT EXISTS idx_rbac_roles_school_scope
  ON public.rbac_roles(school_id, scope_level, hierarchy_level);

CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role
  ON public.rbac_role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_permission
  ON public.rbac_role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user
  ON public.user_role_assignments(user_id, school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_branch
  ON public.user_role_assignments(branch_id);

CREATE INDEX IF NOT EXISTS idx_user_page_access_user
  ON public.user_page_access(user_id, school_id);

CREATE INDEX IF NOT EXISTS idx_user_page_access_branch
  ON public.user_page_access(branch_id);

ALTER TABLE public.rbac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_permissions_authenticated_select ON public.rbac_permissions;
CREATE POLICY rbac_permissions_authenticated_select
ON public.rbac_permissions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS user_page_access_self_select ON public.user_page_access;
CREATE POLICY user_page_access_self_select
ON public.user_page_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_role_assignments_self_select ON public.user_role_assignments;
CREATE POLICY user_role_assignments_self_select
ON public.user_role_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS rbac_roles_school_member_select ON public.rbac_roles;
CREATE POLICY rbac_roles_school_member_select
ON public.rbac_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.school_id = rbac_roles.school_id
      AND up.is_active = true
  )
);

DROP POLICY IF EXISTS rbac_role_permissions_school_member_select ON public.rbac_role_permissions;
CREATE POLICY rbac_role_permissions_school_member_select
ON public.rbac_role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rbac_roles rr
    JOIN public.user_profiles up
      ON up.school_id = rr.school_id
    WHERE rr.id = rbac_role_permissions.role_id
      AND up.id = auth.uid()
      AND up.is_active = true
  )
);

INSERT INTO public.rbac_permissions (code, resource_code, action_code, page_code, description)
VALUES
  ('dashboard.view', 'dashboard', 'view', 'dashboard', 'View the main dashboard'),
  ('students.view', 'students', 'view', 'students', 'View student records'),
  ('students.create', 'students', 'create', 'students', 'Create student records'),
  ('students.update', 'students', 'update', 'students', 'Update student records'),
  ('students.delete', 'students', 'delete', 'students', 'Delete student records'),
  ('attendance.view', 'attendance', 'view', 'attendance', 'View attendance'),
  ('attendance.update', 'attendance', 'update', 'attendance', 'Manage attendance'),
  ('payments.view', 'payments', 'view', 'payments', 'View financial accounts and payments'),
  ('payments.create', 'payments', 'create', 'payments', 'Create payment records'),
  ('payments.export', 'payments', 'export', 'payments', 'Export payment reports'),
  ('expenses.view', 'expenses', 'view', 'expenses', 'View expenses'),
  ('expenses.create', 'expenses', 'create', 'expenses', 'Create expense records'),
  ('salaries.view', 'salaries', 'view', 'salaries', 'View salary records'),
  ('salaries.approve', 'salaries', 'approve', 'salaries', 'Approve salary records'),
  ('reports.view', 'reports', 'view', 'reports', 'View reports'),
  ('reports.export', 'reports', 'export', 'reports', 'Export reports'),
  ('monitoring.view', 'monitoring', 'view', 'monitoring', 'View monitoring pages')
ON CONFLICT (code) DO NOTHING;
