
-- ============================================================================
-- 1. AUDIT LOG SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  action_type TEXT NOT NULL, -- create, update, delete, login, logout, settings_change, role_change, etc.
  entity_type TEXT NOT NULL, -- school, user, subscription, setting, etc.
  entity_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS for Audit Logs (Super Admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_super_admin_all ON audit_logs;
CREATE POLICY audit_logs_super_admin_all
ON audit_logs
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

-- ============================================================================
-- 2. SYSTEM / SCHOOL SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE, -- NULL for global system settings
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, key)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_settings_super_admin_all ON system_settings;
CREATE POLICY system_settings_super_admin_all
ON system_settings
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

-- ============================================================================
-- 3. NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Recipient
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- subscription_expiring, system_alert, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_owner_all ON notifications;
CREATE POLICY notifications_owner_all
ON notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 4. ACADEMIC YEARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'planned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_years_super_admin_all ON academic_years;
CREATE POLICY academic_years_super_admin_all
ON academic_years
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

-- ============================================================================
-- 5. FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_super_admin_all ON feature_flags;
CREATE POLICY feature_flags_super_admin_all
ON feature_flags
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

-- ============================================================================
-- 6. SOFT DELETE SUPPORT
-- ============================================================================

-- Function to handle soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_entity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- If we want to intercept DELETE, we would need a different approach (views + INSTEAD OF triggers)
    -- For now, we manually handle it in the application or use a specific column.
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adding columns to existing tables safely
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'schools',
      'user_profiles',
      'students',
      'payments',
      'teachers',
      'salaries',
      'expenses',
      'branches'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL', tbl);
    END IF;
  END LOOP;
END
$$;

-- ============================================================================
-- 7. ROLES EXTENSION (Optional metadata for roles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_role TEXT NOT NULL, -- admin, employee, etc.
  permissions TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_roles_super_admin_all ON custom_roles;
CREATE POLICY custom_roles_super_admin_all
ON custom_roles
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');
