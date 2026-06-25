CREATE TABLE ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'countdown', 'video', 'document')),
  title text NOT NULL,
  body text,
  bg_color text DEFAULT '#4F46E5',
  image_url text,
  target_date timestamptz,
  social_url text,
  social_label text,
  video_url text,
  doc_url text,
  doc_pages int,
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX ads_school_id_idx ON ads(school_id);
CREATE INDEX ads_is_active_idx ON ads(is_active);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_ads" ON ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.school_id = ads.school_id
      AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "users_read_active_ads" ON ads
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.school_id = ads.school_id
    )
  );
