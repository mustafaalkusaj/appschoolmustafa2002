-- Mobile App admin surfaces (Phase 4) — ADDITIVE ONLY.
-- Adds two new tables consumed by the super-admin "Mobile App" section and the
-- mobile session endpoint. No existing tables are altered.
--
-- Access model: server APIs use the Supabase service-role client (which bypasses
-- RLS). We still enable RLS and grant the service_role explicit access, while
-- denying anon/authenticated direct access by default (no permissive policy for
-- those roles). This matches the project's "all writes go through server APIs"
-- convention.

-- ---------------------------------------------------------------------------
-- school_app_features: per-school mobile feature flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_app_features (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL,
  feature_key text NOT NULL,
  is_enabled  boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_app_features_school_feature_unique UNIQUE (school_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_school_app_features_school_id
  ON public.school_app_features (school_id);

ALTER TABLE public.school_app_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_app_features_service_role ON public.school_app_features;
CREATE POLICY school_app_features_service_role
  ON public.school_app_features
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- app_config: key/value config (global when school_id is null, else per-school)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid,
  key        text NOT NULL,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per (school_id, key). NULL school_id rows are global; a partial unique
-- index guarantees a single global row per key (NULLs are not deduped by a plain
-- UNIQUE constraint).
CREATE UNIQUE INDEX IF NOT EXISTS app_config_school_key_unique
  ON public.app_config (school_id, key)
  WHERE school_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_config_global_key_unique
  ON public.app_config (key)
  WHERE school_id IS NULL;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_service_role ON public.app_config;
CREATE POLICY app_config_service_role
  ON public.app_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
