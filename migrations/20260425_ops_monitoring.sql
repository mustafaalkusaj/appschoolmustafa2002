BEGIN;

CREATE TABLE IF NOT EXISTS public.ops_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  score INTEGER,
  domain_status JSONB,
  vercel_status JSONB,
  supabase_status JSONB,
  auth_status JSONB,
  database_status JSONB,
  storage_status JSONB,
  upstash_status JSONB,
  subscriptions_status JSONB,
  e2e_status JSONB NULL,
  summary TEXT,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.ops_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_to TEXT NULL,
  sent_via TEXT NULL,
  sent_status TEXT NOT NULL CHECK (sent_status IN ('pending', 'sent', 'failed', 'skipped')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.ops_subscription_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_count INTEGER,
  expired_count INTEGER,
  expiring_7_days_count INTEGER,
  expiring_30_days_count INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ops_health_reports_created_at ON public.ops_health_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_alerts_created_at ON public.ops_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_subscription_snapshots_created_at ON public.ops_subscription_snapshots(created_at DESC);

ALTER TABLE public.ops_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_subscription_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ops_health_reports' AND policyname = 'ops_health_reports_service_role_all'
  ) THEN
    CREATE POLICY ops_health_reports_service_role_all
    ON public.ops_health_reports
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
    WHERE schemaname = 'public' AND tablename = 'ops_alerts' AND policyname = 'ops_alerts_service_role_all'
  ) THEN
    CREATE POLICY ops_alerts_service_role_all
    ON public.ops_alerts
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
    WHERE schemaname = 'public' AND tablename = 'ops_subscription_snapshots' AND policyname = 'ops_subscription_snapshots_service_role_all'
  ) THEN
    CREATE POLICY ops_subscription_snapshots_service_role_all
    ON public.ops_subscription_snapshots
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
  END IF;
END $$;

COMMIT;
