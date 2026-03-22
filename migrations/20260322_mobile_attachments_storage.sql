BEGIN;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS content_kind TEXT NOT NULL DEFAULT 'homework';

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_bucket TEXT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_path TEXT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.assignments
        ADD CONSTRAINT assignments_content_kind_check
        CHECK (content_kind IN ('homework', 'exam_material'));
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_assignments_content_kind
  ON public.assignments(content_kind);

CREATE INDEX IF NOT EXISTS idx_assignments_attachment_lookup
  ON public.assignments(attachment_bucket, attachment_path)
  WHERE attachment_path IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE INDEX IF NOT EXISTS idx_notifications_attachment_lookup
      ON public.notifications ((metadata->>'attachment_bucket'), (metadata->>'attachment_path'))
      WHERE COALESCE(metadata->>'attachment_path', '') <> ''
    $sql$;
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('school-media', 'school-media', FALSE, 20971520)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

CREATE OR REPLACE FUNCTION public.can_manage_school_media(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_user_profiles AS mup
    WHERE mup.auth_user_id = auth.uid()
      AND mup.role = 'teacher'
      AND COALESCE(mup.is_active, FALSE)
      AND split_part(COALESCE(object_name, ''), '/', 1) = COALESCE(mup.school_id::text, '')
      AND split_part(COALESCE(object_name, ''), '/', 2) = COALESCE(mup.teacher_id::text, '')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_school_media(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_read BOOLEAN := FALSE;
BEGIN
  IF object_name IS NULL OR btrim(object_name) = '' THEN
    RETURN FALSE;
  END IF;

  IF to_regclass('public.assignments') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.assignments AS a
        WHERE a.attachment_bucket = 'school-media'
          AND a.attachment_path = $1
          AND (
            public.student_can_read_assignment(a.school_id, a.student_id, a.class_name, a.section)
            OR public.teacher_can_read_assignment(a.school_id, a.student_id, a.class_name, a.section)
          )
      )
    $sql$
    INTO can_read
    USING object_name;

    IF COALESCE(can_read, FALSE) THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.notifications AS n
        LEFT JOIN public.managed_user_profiles AS recipient
          ON recipient.auth_user_id = n.user_id
        WHERE COALESCE(n.metadata->>'attachment_bucket', '') = 'school-media'
          AND COALESCE(n.metadata->>'attachment_path', '') = $1
          AND (
            (
              n.user_id = auth.uid()
              AND EXISTS (
                SELECT 1
                FROM public.managed_user_profiles AS current_mup
                WHERE current_mup.auth_user_id = auth.uid()
                  AND current_mup.role = 'student'
                  AND COALESCE(current_mup.is_active, FALSE)
              )
            )
            OR (
              EXISTS (
                SELECT 1
                FROM public.managed_user_profiles AS current_mup
                WHERE current_mup.auth_user_id = auth.uid()
                  AND current_mup.role = 'teacher'
                  AND COALESCE(current_mup.is_active, FALSE)
                  AND current_mup.school_id = n.school_id
                  AND (
                    current_mup.teacher_id::text = COALESCE(n.metadata->>'teacher_id', '')
                    OR (
                      recipient.role = 'student'
                      AND public.teacher_can_access_student(recipient.student_id)
                    )
                  )
              )
            )
          )
      )
    $sql$
    INTO can_read
    USING object_name;

    IF COALESCE(can_read, FALSE) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_school_media(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_school_media(TEXT) TO authenticated;

DROP POLICY IF EXISTS school_media_select_policy ON storage.objects;
CREATE POLICY school_media_select_policy
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'school-media'
  AND public.can_read_school_media(name)
);

DROP POLICY IF EXISTS school_media_insert_policy ON storage.objects;
CREATE POLICY school_media_insert_policy
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-media'
  AND public.can_manage_school_media(name)
);

DROP POLICY IF EXISTS school_media_update_policy ON storage.objects;
CREATE POLICY school_media_update_policy
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-media'
  AND public.can_manage_school_media(name)
)
WITH CHECK (
  bucket_id = 'school-media'
  AND public.can_manage_school_media(name)
);

DROP POLICY IF EXISTS school_media_delete_policy ON storage.objects;
CREATE POLICY school_media_delete_policy
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-media'
  AND public.can_manage_school_media(name)
);

COMMIT;
