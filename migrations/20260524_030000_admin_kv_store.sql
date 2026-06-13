-- admin_kv_store: generic key-value store for super-admin platform settings
-- Used by AnalyticsTab to persist school pricing / collected data / exchange rate

CREATE TABLE IF NOT EXISTS public.admin_kv_store (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_kv_store ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read/write
DROP POLICY IF EXISTS "admin_kv_super_admin_only" ON public.admin_kv_store;
CREATE POLICY "admin_kv_super_admin_only"
  ON public.admin_kv_store
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );

-- Seed default exchange rate row so GET never returns empty
INSERT INTO public.admin_kv_store (key, value)
VALUES ('exchange_rate_per_100', '131000')
ON CONFLICT (key) DO NOTHING;
