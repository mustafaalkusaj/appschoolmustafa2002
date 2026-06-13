-- ============================================================
-- نظام الإشعارات والإعلانات
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. school_notifications — سجل الإشعارات المُرسَلة
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  type             TEXT NOT NULL DEFAULT 'insite'
                     CHECK (type IN ('insite', 'push', 'email')),
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  target_type      TEXT NOT NULL DEFAULT 'all'
                     CHECK (target_type IN ('all','students','teachers','class','section','person')),
  target_class     TEXT,
  target_section   TEXT,
  target_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority         TEXT NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('normal','important','urgent')),
  category         TEXT NOT NULL DEFAULT 'general'
                     CHECK (category IN ('general','exams','homework','holiday','financial','activity')),
  sent_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','failed')),
  recipient_count  INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_notifications_school_id
  ON public.school_notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_school_notifications_status
  ON public.school_notifications(status);
CREATE INDEX IF NOT EXISTS idx_school_notifications_created_at
  ON public.school_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_notifications_school_status
  ON public.school_notifications(school_id, status, created_at DESC);

ALTER TABLE public.school_notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 2. notification_recipients — مستلمو كل إشعار
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id  UUID NOT NULL REFERENCES public.school_notifications(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_recipients_user_id
  ON public.notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipients_notification_id
  ON public.notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipients_unread
  ON public.notification_recipients(user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification receipts"
  ON public.notification_recipients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications read"
  ON public.notification_recipients FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- 3. school_announcements — الإعلانات مع الوسائط
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id    UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  media_url    TEXT,
  media_type   TEXT CHECK (media_type IN ('image','video','pdf','link')),
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at   TIMESTAMPTZ,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_school_id
  ON public.school_announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned
  ON public.school_announcements(school_id, is_pinned, created_at DESC);

ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 4. user_push_subscriptions — اشتراكات Web Push
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_json JSONB NOT NULL,
  platform          TEXT NOT NULL DEFAULT 'web',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, school_id, platform)
);

ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.user_push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
