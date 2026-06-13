-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Telegram Bot & OPS Support Tables
-- Created: 2026-05-19
-- Tables: health_checks, error_logs, hourly_stats, daily_reports,
--         bot_access_logs, bot_settings, feature_flags,
--         crm_leads, invoices, changelog_entries
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. health_checks ────────────────────────────────────────────────────────
-- Written by /api/ops/health-check cron every 5 minutes
CREATE TABLE IF NOT EXISTS public.health_checks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service        text        NOT NULL,                        -- 'web', 'supabase', 'r2', etc.
  status         text        NOT NULL CHECK (status IN ('up', 'down', 'degraded')),
  response_ms    int,                                         -- null means timeout / no measurement
  error_message  text,
  checked_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_checks_checked_at_idx ON public.health_checks (checked_at DESC);
CREATE INDEX IF NOT EXISTS health_checks_service_idx    ON public.health_checks (service);

-- Auto-delete rows older than 30 days (keep table small)
-- (run manually or via pg_cron if available)

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.health_checks
  USING (auth.role() = 'service_role');


-- ─── 2. error_logs ───────────────────────────────────────────────────────────
-- Written by error-capture middleware; read by bot /errors command
CREATE TABLE IF NOT EXISTS public.error_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route            text,                                      -- e.g. '/api/payments'
  status_code      int,
  error_message    text,
  stack_trace      text,
  occurrence_count int         NOT NULL DEFAULT 1,
  is_resolved      boolean     NOT NULL DEFAULT false,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_logs_created_at_idx       ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_is_resolved_idx      ON public.error_logs (is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS error_logs_occurrence_count_idx ON public.error_logs (occurrence_count DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.error_logs
  USING (auth.role() = 'service_role');


-- ─── 3. hourly_stats ─────────────────────────────────────────────────────────
-- Upserted every hour by /api/ops/hourly-stats cron
CREATE TABLE IF NOT EXISTS public.hourly_stats (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hour                 timestamptz NOT NULL UNIQUE,           -- rounded to hour start
  grades_entered       int         NOT NULL DEFAULT 0,
  attendance_recorded  int         NOT NULL DEFAULT 0,
  errors_count         int         NOT NULL DEFAULT 0,
  active_users_web     int         NOT NULL DEFAULT 0,
  active_users_mobile  int         NOT NULL DEFAULT 0,
  api_requests         int         NOT NULL DEFAULT 0,
  avg_response_ms      numeric(8,2),
  recorded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hourly_stats_hour_idx ON public.hourly_stats (hour DESC);

ALTER TABLE public.hourly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.hourly_stats
  USING (auth.role() = 'service_role');


-- ─── 4. daily_reports ────────────────────────────────────────────────────────
-- Aggregated once/day; read by /api/ops/weekly-report cron
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date                  date        NOT NULL UNIQUE,
  total_users           int,
  active_users          int,
  new_users             int,
  total_grades          int,
  total_attendance      int,
  total_notifications   int,
  error_count           int,
  avg_response_ms       numeric(8,2),
  revenue               numeric(12,2),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_reports_date_idx ON public.daily_reports (date DESC);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.daily_reports
  USING (auth.role() = 'service_role');


-- ─── 5. bot_access_logs ──────────────────────────────────────────────────────
-- Written by telegram-bot-guards.ts on every authorized/unauthorized access
CREATE TABLE IF NOT EXISTS public.bot_access_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       bigint      NOT NULL,
  username      text,
  command       text        NOT NULL,
  is_authorized boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_access_logs_chat_id_idx   ON public.bot_access_logs (chat_id);
CREATE INDEX IF NOT EXISTS bot_access_logs_created_at_idx ON public.bot_access_logs (created_at DESC);

ALTER TABLE public.bot_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.bot_access_logs
  USING (auth.role() = 'service_role');


-- ─── 6. bot_settings ─────────────────────────────────────────────────────────
-- Key-value store for bot configuration (maintenance_mode, backup_*, etc.)
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL UNIQUE,
  value      text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO public.bot_settings (key, value) VALUES
  ('maintenance_mode',    'false'),
  ('maintenance_message', 'النظام تحت الصيانة حالياً، يرجى المحاولة لاحقاً.'),
  ('backup_last_run',     ''),
  ('backup_status',       'unknown')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.bot_settings
  USING (auth.role() = 'service_role');


-- ─── 7. feature_flags ────────────────────────────────────────────────────────
-- Used by lib/flags.ts to toggle features per environment
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL UNIQUE,
  is_enabled boolean     NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed some sensible defaults
INSERT INTO public.feature_flags (key, is_enabled, description) VALUES
  ('ai_reports',        false, 'تفعيل تقارير الذكاء الاصطناعي'),
  ('telegram_alerts',   true,  'إرسال تنبيهات Telegram عند الأخطاء'),
  ('weekly_report',     true,  'إرسال التقرير الأسبوعي تلقائياً'),
  ('maintenance_mode',  false, 'وضع الصيانة العام')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.feature_flags
  USING (auth.role() = 'service_role');


-- ─── 8. crm_leads ────────────────────────────────────────────────────────────
-- Sales pipeline — schools being pursued as customers
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name     text        NOT NULL,
  contact_name    text,
  phone           text,
  notes           text,
  status          text        NOT NULL DEFAULT 'warm'
                              CHECK (status IN ('cold', 'warm', 'hot', 'converted', 'lost')),
  last_contact_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_leads_status_idx          ON public.crm_leads (status);
CREATE INDEX IF NOT EXISTS crm_leads_last_contact_at_idx ON public.crm_leads (last_contact_at DESC);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.crm_leads
  USING (auth.role() = 'service_role');


-- ─── 9. invoices ─────────────────────────────────────────────────────────────
-- SaaS billing invoices per school
CREATE TABLE IF NOT EXISTS public.invoices (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text        NOT NULL UNIQUE,               -- e.g. 'INV-202605-0001'
  school_name    text        NOT NULL,
  amount         numeric(12,2) NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date       date,
  paid_at        timestamptz,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_status_idx     ON public.invoices (status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON public.invoices (created_at DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.invoices
  USING (auth.role() = 'service_role');


-- ─── 10. changelog_entries ───────────────────────────────────────────────────
-- Product changelog; bot can read and create entries
-- (Note: bot code references "changelog_entries", not "changelog")
CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version            text        NOT NULL,                   -- e.g. '1.4.2'
  description        text        NOT NULL,
  notification_sent  boolean     NOT NULL DEFAULT false,
  released_at        timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS changelog_entries_released_at_idx ON public.changelog_entries (released_at DESC);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.changelog_entries
  USING (auth.role() = 'service_role');


-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  -- bot_settings
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_bot_settings') THEN
    CREATE TRIGGER set_updated_at_bot_settings
      BEFORE UPDATE ON public.bot_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- feature_flags
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_feature_flags') THEN
    CREATE TRIGGER set_updated_at_feature_flags
      BEFORE UPDATE ON public.feature_flags
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- crm_leads
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_crm_leads') THEN
    CREATE TRIGGER set_updated_at_crm_leads
      BEFORE UPDATE ON public.crm_leads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- invoices
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_invoices') THEN
    CREATE TRIGGER set_updated_at_invoices
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  -- error_logs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_error_logs') THEN
    CREATE TRIGGER set_updated_at_error_logs
      BEFORE UPDATE ON public.error_logs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
