-- 1. school_groups table
CREATE TABLE IF NOT EXISTS school_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES school_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Add branch_id to existing tables (nullable for backward compat)
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- 4. Add scope/group/branch columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS scope text CHECK (scope IN ('branch','group','super_admin')) DEFAULT 'branch';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES school_groups(id);

-- 5. Enable RLS
ALTER TABLE school_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- RLS: school_groups
CREATE POLICY IF NOT EXISTS "group_users_see_own_group" ON school_groups
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.group_id = school_groups.id
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND up.role = 'super_admin'
      )
    )
  );

-- RLS: branches
CREATE POLICY IF NOT EXISTS "branch_users_see_own_branch" ON branches
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid() AND (
          up.branch_id = branches.id
          OR up.group_id = branches.group_id
          OR up.role = 'super_admin'
        )
      )
    )
  );
