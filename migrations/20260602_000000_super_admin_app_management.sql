-- ============================================================
-- Super Admin App Management Tables
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- 1. School Apps Registry
CREATE TABLE IF NOT EXISTS school_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL,
  bundle_id_ios TEXT,
  package_name_android TEXT,
  ios_status TEXT NOT NULL DEFAULT 'draft' CHECK (ios_status IN ('draft', 'in_review', 'published', 'rejected', 'suspended')),
  android_status TEXT NOT NULL DEFAULT 'draft' CHECK (android_status IN ('draft', 'in_review', 'published', 'rejected', 'suspended')),
  app_store_url TEXT,
  play_store_url TEXT,
  current_version TEXT NOT NULL DEFAULT '1.0.0',
  min_version TEXT NOT NULL DEFAULT '1.0.0',
  force_update BOOLEAN NOT NULL DEFAULT false,
  app_icon_url TEXT,
  splash_image_url TEXT,
  custom_login_background TEXT,
  login_style TEXT NOT NULL DEFAULT 'default' CHECK (login_style IN ('default', 'minimal', 'branded', 'fullscreen')),
  push_certificate_ios TEXT,
  fcm_key_android TEXT,
  download_count_ios INTEGER NOT NULL DEFAULT 0,
  download_count_android INTEGER NOT NULL DEFAULT 0,
  last_published_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id)
);

-- 2. School Feature Flags (per-school)
CREATE TABLE IF NOT EXISTS school_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, feature_key)
);

-- 3. App Version History
CREATE TABLE IF NOT EXISTS school_app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'both')),
  changelog TEXT,
  build_number TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Global Settings
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'security', 'notifications', 'appearance', 'billing', 'maintenance')),
  description TEXT,
  value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_apps_school_id ON school_apps(school_id);
CREATE INDEX IF NOT EXISTS idx_school_feature_flags_school_id ON school_feature_flags(school_id);
CREATE INDEX IF NOT EXISTS idx_school_feature_flags_key ON school_feature_flags(feature_key);
CREATE INDEX IF NOT EXISTS idx_school_app_versions_school_id ON school_app_versions(school_id);
CREATE INDEX IF NOT EXISTS idx_global_settings_category ON global_settings(category);

-- RLS
ALTER TABLE school_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_school_apps" ON school_apps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_school_feature_flags" ON school_feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_school_app_versions" ON school_app_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "super_admin_global_settings" ON global_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Seed default global settings
INSERT INTO global_settings (key, value, category, description, value_type) VALUES
  ('default_currency', 'IQD', 'general', 'العملة الافتراضية', 'string'),
  ('default_timezone', 'Asia/Baghdad', 'general', 'المنطقة الزمنية الافتراضية', 'string'),
  ('supported_languages', '["ar","en"]', 'general', 'اللغات المدعومة', 'json'),
  ('session_timeout_minutes', '60', 'security', 'مدة الجلسة بالدقائق', 'number'),
  ('password_min_length', '8', 'security', 'الحد الأدنى لطول كلمة المرور', 'number'),
  ('require_2fa', 'false', 'security', 'تفعيل التحقق الثنائي', 'boolean'),
  ('maintenance_mode', 'false', 'maintenance', 'وضع الصيانة', 'boolean'),
  ('maintenance_message', '', 'maintenance', 'رسالة الصيانة', 'string'),
  ('backup_enabled', 'true', 'maintenance', 'تفعيل النسخ الاحتياطي', 'boolean'),
  ('backup_frequency_hours', '24', 'maintenance', 'تكرار النسخ الاحتياطي بالساعات', 'number'),
  ('push_notifications_enabled', 'true', 'notifications', 'تفعيل إشعارات Push', 'boolean'),
  ('sms_enabled', 'false', 'notifications', 'تفعيل رسائل SMS', 'boolean'),
  ('email_notifications_enabled', 'true', 'notifications', 'تفعيل إشعارات البريد', 'boolean'),
  ('global_theme_preset', 'blue-academic', 'appearance', 'ثيم النظام الافتراضي', 'string'),
  ('allow_school_custom_themes', 'true', 'appearance', 'السماح للمدارس بتخصيص الثيم', 'boolean'),
  ('max_upload_size_mb', '10', 'general', 'الحد الأقصى لحجم الملفات MB', 'number'),
  ('default_plan', 'basic', 'billing', 'الخطة الافتراضية للمدارس الجديدة', 'string'),
  ('trial_days', '14', 'billing', 'أيام الفترة التجريبية', 'number')
ON CONFLICT (key) DO NOTHING;
