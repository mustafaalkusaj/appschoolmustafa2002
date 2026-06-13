BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('school-logos', 'school-logos', TRUE, 2097152),
  ('branch-logos', 'branch-logos', TRUE, 2097152)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

CREATE OR REPLACE FUNCTION public.can_manage_logo_bucket_object(bucket_name TEXT, object_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND public.current_app_role() IN ('admin', 'super_admin')
    AND bucket_name IN ('school-logos', 'branch-logos')
    AND split_part(COALESCE(object_name, ''), '/', 1) <> ''
    AND (
      public.current_app_role() = 'super_admin'
      OR split_part(COALESCE(object_name, ''), '/', 1) = COALESCE(public.current_school_id()::text, '')
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_logo_bucket_object(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS school_logos_public_read ON storage.objects;
CREATE POLICY school_logos_public_read
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'school-logos');

DROP POLICY IF EXISTS school_logos_admin_insert ON storage.objects;
CREATE POLICY school_logos_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

DROP POLICY IF EXISTS school_logos_admin_update ON storage.objects;
CREATE POLICY school_logos_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
)
WITH CHECK (
  bucket_id = 'school-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

DROP POLICY IF EXISTS school_logos_admin_delete ON storage.objects;
CREATE POLICY school_logos_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

DROP POLICY IF EXISTS branch_logos_public_read ON storage.objects;
CREATE POLICY branch_logos_public_read
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branch-logos');

DROP POLICY IF EXISTS branch_logos_admin_insert ON storage.objects;
CREATE POLICY branch_logos_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branch-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

DROP POLICY IF EXISTS branch_logos_admin_update ON storage.objects;
CREATE POLICY branch_logos_admin_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branch-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
)
WITH CHECK (
  bucket_id = 'branch-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

DROP POLICY IF EXISTS branch_logos_admin_delete ON storage.objects;
CREATE POLICY branch_logos_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'branch-logos'
  AND public.can_manage_logo_bucket_object(bucket_id, name)
);

COMMIT;
