BEGIN;

-- ─── audit_logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id TEXT NULL,
  actor_name TEXT NULL,
  actor_email TEXT NULL,
  actor_role TEXT NULL,
  actor_source TEXT NOT NULL DEFAULT 'app', -- app, telegram_ops_bot, api
  action_type TEXT NOT NULL, -- create, update, delete, login, logout, permission_change, error_status_change, etc.
  entity_type TEXT NULL, -- school, user, student, teacher, class, payment, subscription, ops_error, etc.
  entity_id TEXT NULL,
  summary TEXT NULL,
  school_id TEXT NULL,
  branch_id TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ─── ops_pending_actions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ops_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  type TEXT NOT NULL, -- add_user, etc.
  requested_by_chat_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ─── app_notifications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_user_id TEXT NULL,
  recipient_role TEXT NULL,
  school_id TEXT NULL,
  branch_id TEXT NULL,
  type TEXT NOT NULL, -- subscription_expired, error_critical, save_failed, new_user, finance_alert, admin_announcement
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ─── support_tickets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  school_id TEXT NULL,
  branch_id TEXT NULL,
  user_id TEXT NULL,
  page_url TEXT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON public.audit_logs(school_id);

CREATE INDEX IF NOT EXISTS idx_ops_pending_actions_created_at ON public.ops_pending_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_pending_actions_status ON public.ops_pending_actions(status);

CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON public.app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_recipient_user_id ON public.app_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_status ON public.app_notifications(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- audit_logs: service_role ALL + authenticated SELECT (AuditLogTab reads directly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_service_role_all'
  ) THEN
    CREATE POLICY audit_logs_service_role_all
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_authenticated_select'
  ) THEN
    CREATE POLICY audit_logs_authenticated_select
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (TRUE);
  END IF;
END $$;

-- ops_pending_actions: service_role ALL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ops_pending_actions' AND policyname = 'ops_pending_actions_service_role_all'
  ) THEN
    CREATE POLICY ops_pending_actions_service_role_all
    ON public.ops_pending_actions
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
  END IF;
END $$;

-- app_notifications: service_role ALL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_notifications' AND policyname = 'app_notifications_service_role_all'
  ) THEN
    CREATE POLICY app_notifications_service_role_all
    ON public.app_notifications
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
  END IF;
END $$;

-- support_tickets: service_role ALL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'support_tickets_service_role_all'
  ) THEN
    CREATE POLICY support_tickets_service_role_all
    ON public.support_tickets
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
  END IF;
END $$;

COMMIT;
