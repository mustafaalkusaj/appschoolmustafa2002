BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS moderated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'assignments'
      AND constraint_name = 'assignments_status_check'
  ) THEN
    ALTER TABLE public.assignments DROP CONSTRAINT assignments_status_check;
  END IF;
END
$$;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_status_check
  CHECK (status IN ('active', 'edited_by_admin', 'deleted_by_admin'));

CREATE OR REPLACE FUNCTION public.prepare_assignment_scope_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inferred_student_branch UUID;
  inferred_teacher_branch UUID;
BEGIN
  NEW.updated_at = NOW();

  IF NEW.status IS NULL OR btrim(NEW.status) = '' THEN
    NEW.status = 'active';
  END IF;

  IF NEW.branch_id IS NULL AND NEW.student_id IS NOT NULL THEN
    SELECT s.branch_id
    INTO inferred_student_branch
    FROM public.students AS s
    WHERE s.id = NEW.student_id
    LIMIT 1;
  END IF;

  IF NEW.branch_id IS NULL AND inferred_student_branch IS NULL AND NEW.teacher_id IS NOT NULL THEN
    SELECT t.branch_id
    INTO inferred_teacher_branch
    FROM public.teachers AS t
    WHERE t.id = NEW.teacher_id
    LIMIT 1;
  END IF;

  NEW.branch_id = COALESCE(NEW.branch_id, inferred_student_branch, inferred_teacher_branch);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignments_scope_defaults ON public.assignments;
CREATE TRIGGER trg_assignments_scope_defaults
BEFORE INSERT OR UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.prepare_assignment_scope_defaults();

UPDATE public.assignments AS a
SET branch_id = COALESCE(student_scope.branch_id, teacher_scope.branch_id)
FROM public.students AS student_scope
LEFT JOIN public.teachers AS teacher_scope
  ON teacher_scope.id = a.teacher_id
WHERE a.student_id = student_scope.id
  AND a.branch_id IS NULL;

UPDATE public.assignments AS a
SET branch_id = teacher_scope.branch_id
FROM public.teachers AS teacher_scope
WHERE a.teacher_id = teacher_scope.id
  AND a.student_id IS NULL
  AND a.branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_school_branch_status_created_at
  ON public.assignments(school_id, branch_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_monitoring
  ON public.assignments(teacher_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at
  ON public.assignments(deleted_at);

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS sender_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS message_group_id UUID NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system';

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS moderated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS deleted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS note TEXT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND constraint_name = 'notifications_source_check'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_source_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND constraint_name = 'notifications_status_check'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_status_check;
  END IF;
END
$$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_source_check
  CHECK (source IN ('system', 'teacher', 'fee_installment'));

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('active', 'edited_by_admin', 'deleted_by_admin'));

CREATE OR REPLACE FUNCTION public.generate_notification_group_uuid(seed TEXT)
RETURNS UUID
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-' ||
    substr(md5(seed), 13, 4) || '-' ||
    substr(md5(seed), 17, 4) || '-' ||
    substr(md5(seed), 21, 12)
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION public.prepare_notification_scope_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  inferred_teacher_id UUID;
  inferred_teacher_branch UUID;
  inferred_recipient_branch UUID;
  inferred_sender UUID;
  group_seed TEXT;
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = NOW();
  END IF;

  NEW.updated_at = NOW();
  inferred_sender := COALESCE(NEW.sender_user_id, auth.uid());

  IF NEW.sender_user_id IS NULL AND inferred_sender IS NOT NULL THEN
    NEW.sender_user_id = inferred_sender;
  END IF;

  IF NEW.teacher_id IS NULL AND inferred_sender IS NOT NULL THEN
    SELECT mup.teacher_id
    INTO inferred_teacher_id
    FROM public.managed_user_profiles AS mup
    WHERE mup.auth_user_id = inferred_sender
      AND mup.role = 'teacher'
    LIMIT 1;

    IF inferred_teacher_id IS NOT NULL THEN
      NEW.teacher_id = inferred_teacher_id;
    END IF;
  END IF;

  IF NEW.teacher_id IS NOT NULL THEN
    SELECT t.branch_id
    INTO inferred_teacher_branch
    FROM public.teachers AS t
    WHERE t.id = NEW.teacher_id
    LIMIT 1;
  END IF;

  IF NEW.branch_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT student_scope.branch_id
    INTO inferred_recipient_branch
    FROM public.managed_user_profiles AS recipient_scope
    LEFT JOIN public.students AS student_scope
      ON student_scope.id = recipient_scope.student_id
    WHERE recipient_scope.auth_user_id = NEW.user_id
      AND recipient_scope.role = 'student'
    LIMIT 1;
  END IF;

  NEW.branch_id = COALESCE(NEW.branch_id, inferred_recipient_branch, inferred_teacher_branch);

  IF NEW.status IS NULL OR btrim(NEW.status) = '' THEN
    NEW.status = 'active';
  END IF;

  IF NEW.source IS NULL OR btrim(NEW.source) = '' OR NEW.source = 'system' THEN
    IF NEW.type = 'fee_installment' THEN
      NEW.source = 'fee_installment';
    ELSIF NEW.teacher_id IS NOT NULL THEN
      NEW.source = 'teacher';
    ELSIF NEW.type = 'teacher_broadcast'
      AND EXISTS (
        SELECT 1
        FROM public.managed_user_profiles AS recipient_scope
        WHERE recipient_scope.auth_user_id = NEW.user_id
          AND recipient_scope.role = 'student'
      ) THEN
      NEW.source = 'teacher';
    ELSE
      NEW.source = 'system';
    END IF;
  END IF;

  IF NEW.message_group_id IS NULL THEN
    group_seed := concat_ws(
      '|',
      COALESCE(NEW.sender_user_id::text, inferred_sender::text, ''),
      COALESCE(NEW.type, ''),
      COALESCE(NEW.title, ''),
      COALESCE(NEW.message, ''),
      to_char(date_trunc('minute', COALESCE(NEW.created_at, NOW())), 'YYYYMMDDHH24MI')
    );
    NEW.message_group_id = public.generate_notification_group_uuid(group_seed);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_scope_defaults ON public.notifications;
CREATE TRIGGER trg_notifications_scope_defaults
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.prepare_notification_scope_defaults();

UPDATE public.notifications AS n
SET source = CASE
  WHEN n.type = 'fee_installment' THEN 'fee_installment'
  WHEN n.type = 'teacher_broadcast'
    AND EXISTS (
      SELECT 1
      FROM public.managed_user_profiles AS recipient_scope
      WHERE recipient_scope.auth_user_id = n.user_id
        AND recipient_scope.role = 'student'
    ) THEN 'teacher'
  ELSE COALESCE(n.source, 'system')
END
WHERE n.source IS NULL OR btrim(n.source) = '' OR n.source = 'system';

UPDATE public.notifications
SET status = 'active'
WHERE status IS NULL OR btrim(status) = '';

UPDATE public.notifications
SET updated_at = COALESCE(updated_at, created_at, NOW());

UPDATE public.notifications
SET message_group_id = id
WHERE message_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_message_group_id
  ON public.notifications(message_group_id);

CREATE INDEX IF NOT EXISTS idx_notifications_teacher_monitoring
  ON public.notifications(school_id, branch_id, source, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_teacher_sender
  ON public.notifications(teacher_id, sender_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at
  ON public.notifications(deleted_at);

CREATE TABLE IF NOT EXISTS public.admin_branch_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_branch_scopes_user_school
  ON public.admin_branch_scopes(user_id, school_id);

CREATE INDEX IF NOT EXISTS idx_admin_branch_scopes_branch
  ON public.admin_branch_scopes(branch_id);

CREATE TABLE IF NOT EXISTS public.fee_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  note TEXT NULL,
  due_at TIMESTAMPTZ NULL,
  deep_link TEXT NULL,
  target_mode TEXT NOT NULL,
  target_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fee_notifications_target_mode_check
    CHECK (target_mode IN ('all_students', 'school', 'branch', 'class_section', 'specific_students'))
);

DROP TRIGGER IF EXISTS trg_fee_notifications_updated_at ON public.fee_notifications;
CREATE TRIGGER trg_fee_notifications_updated_at
BEFORE UPDATE ON public.fee_notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_fee_notifications_school_created_at
  ON public.fee_notifications(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_notifications_branch_created_at
  ON public.fee_notifications(branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fee_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_notification_id UUID NOT NULL REFERENCES public.fee_notifications(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  student_id UUID NULL REFERENCES public.students(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent',
  failure_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fee_notification_recipients_delivery_status_check
    CHECK (delivery_status IN ('sent', 'failed')),
  UNIQUE(fee_notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_notification_recipients_fee_notification
  ON public.fee_notification_recipients(fee_notification_id, delivery_status);

CREATE INDEX IF NOT EXISTS idx_fee_notification_recipients_student
  ON public.fee_notification_recipients(student_id, created_at DESC);

CREATE OR REPLACE VIEW public.dashboard_teacher_message_groups AS
SELECT
  n.message_group_id AS group_id,
  MIN(n.id) AS representative_id,
  n.school_id,
  MIN(s.name) AS school_name,
  n.branch_id,
  MIN(b.name) AS branch_name,
  n.teacher_id,
  MIN(t.full_name) AS teacher_name,
  MIN(n.type) AS type,
  MIN(n.title) AS title,
  MIN(n.message) AS message,
  MIN(n.link) AS link,
  CASE
    WHEN COUNT(*) FILTER (WHERE n.deleted_at IS NOT NULL OR n.status = 'deleted_by_admin') = COUNT(*) THEN 'deleted_by_admin'
    WHEN COUNT(*) FILTER (WHERE n.status = 'edited_by_admin') > 0 THEN 'edited_by_admin'
    ELSE 'active'
  END AS status,
  COUNT(*) AS target_count,
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'user_id', n.user_id,
      'student_id', recipient_student.id,
      'student_name', recipient_student.full_name,
      'class_name', recipient_student.class_name,
      'section', recipient_student.section
    )
  ) FILTER (WHERE n.user_id IS NOT NULL) AS targets,
  MIN(n.created_at) AS created_at,
  MAX(n.updated_at) AS updated_at,
  MAX(n.moderated_at) AS moderated_at,
  MIN(n.moderation_reason) AS moderation_reason
FROM public.notifications AS n
LEFT JOIN public.schools AS s
  ON s.id = n.school_id
LEFT JOIN public.branches AS b
  ON b.id = n.branch_id
LEFT JOIN public.teachers AS t
  ON t.id = n.teacher_id
LEFT JOIN public.managed_user_profiles AS recipient_profile
  ON recipient_profile.auth_user_id = n.user_id
LEFT JOIN public.students AS recipient_student
  ON recipient_student.id = recipient_profile.student_id
WHERE n.source = 'teacher'
GROUP BY n.message_group_id, n.school_id, n.branch_id, n.teacher_id;

CREATE OR REPLACE VIEW public.dashboard_homework_monitoring AS
SELECT
  a.id,
  a.school_id,
  s.name AS school_name,
  a.branch_id,
  b.name AS branch_name,
  a.teacher_id,
  t.full_name AS teacher_name,
  a.student_id,
  st.full_name AS student_name,
  COALESCE(a.class_name, st.class_name) AS class_name,
  COALESCE(a.section, st.section) AS section,
  a.subject,
  a.title,
  a.description,
  a.due_at,
  a.content_kind,
  a.attachment_bucket,
  a.attachment_path,
  a.attachment_name,
  a.attachment_mime_type,
  a.attachment_size_bytes,
  a.metadata,
  a.status,
  a.moderation_reason,
  a.created_at,
  a.updated_at,
  a.moderated_at,
  a.deleted_at
FROM public.assignments AS a
LEFT JOIN public.schools AS s
  ON s.id = a.school_id
LEFT JOIN public.branches AS b
  ON b.id = a.branch_id
LEFT JOIN public.teachers AS t
  ON t.id = a.teacher_id
LEFT JOIN public.students AS st
  ON st.id = a.student_id;

COMMIT;
