-- Add gender and photo_url columns to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create student-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policy: allow school members to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'school_members_upload_student_photos'
  ) THEN
    CREATE POLICY "school_members_upload_student_photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'student-photos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'student_photos_public_read'
  ) THEN
    CREATE POLICY "student_photos_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'student-photos');
  END IF;
END $$;
