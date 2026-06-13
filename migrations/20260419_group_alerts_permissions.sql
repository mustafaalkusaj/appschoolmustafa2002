-- group_alerts table
CREATE TABLE IF NOT EXISTS group_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES school_groups(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('no_payment','high_expenses','collection_drop')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE group_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_users_see_alerts" ON group_alerts;
CREATE POLICY "group_users_see_alerts" ON group_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND (up.group_id = group_alerts.group_id OR up.role = 'super_admin'))
);

-- user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('students','payments','expenses','attendance','reports','group','all')),
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_permissions" ON user_permissions;
CREATE POLICY "users_see_own_permissions" ON user_permissions FOR SELECT USING (user_id = auth.uid());
