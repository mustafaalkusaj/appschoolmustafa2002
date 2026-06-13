BEGIN;

CREATE TABLE IF NOT EXISTS public.teacher_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'notification','homework','grade_entry','photo','video',
    'file','link','announcement','exam_photo','worksheet','lesson_summary'
  )),

  title TEXT NOT NULL,
  body TEXT,
  subject TEXT,

  target_type TEXT NOT NULL CHECK (target_type IN ('class','section','student','all_students','custom')),
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  target_section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  target_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  target_students JSONB,
  target_count INT DEFAULT 0,
  viewed_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,

  homework_due_date DATE,
  homework_submitted_count INT DEFAULT 0,
  homework_graded BOOLEAN DEFAULT FALSE,

  review_status TEXT DEFAULT 'auto_approved' CHECK (review_status IN (
    'auto_approved','pending','approved','rejected','flagged'
  )),
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  flag_reason TEXT,
  flagged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,

  is_published BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  deleted_reason TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,

  file_type TEXT NOT NULL CHECK (file_type IN ('image','video','pdf','document','audio','archive','other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_extension TEXT NOT NULL DEFAULT '',
  mime_type TEXT,
  width INT,
  height INT,
  thumbnail_path TEXT,
  duration_seconds INT,
  video_thumbnail TEXT,
  external_url TEXT,
  url_title TEXT,
  url_thumbnail TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count INT DEFAULT 1,
  last_viewed_at TIMESTAMPTZ,

  homework_status TEXT DEFAULT 'not_submitted' CHECK (homework_status IN (
    'not_submitted','submitted','late','graded'
  )),
  submitted_at TIMESTAMPTZ,
  grade NUMERIC(5,2),
  device_type TEXT CHECK (device_type IN ('android','ios','web')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.activity_monitoring_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,

  review_mode TEXT DEFAULT 'post_review' CHECK (review_mode IN ('post_review','pre_approval','disabled')),
  require_approval_for_links BOOLEAN DEFAULT TRUE,
  require_approval_for_videos BOOLEAN DEFAULT FALSE,
  require_approval_for_files BOOLEAN DEFAULT FALSE,

  max_image_size_mb INT DEFAULT 10,
  max_video_size_mb INT DEFAULT 100,
  max_file_size_mb INT DEFAULT 20,
  max_attachments_per_activity INT DEFAULT 10,

  max_daily_notifications INT DEFAULT 10,
  max_daily_homework INT DEFAULT 5,

  alert_inactive_days INT DEFAULT 7,
  alert_low_view_percentage INT DEFAULT 50,
  weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  weekly_summary_day TEXT DEFAULT 'thursday' CHECK (weekly_summary_day IN ('saturday','sunday','thursday')),

  total_storage_limit_gb NUMERIC(5,1) DEFAULT 50,
  teacher_storage_limit_mb INT DEFAULT 500,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, branch_id)
);

CREATE TABLE IF NOT EXISTS public.activity_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.teacher_activities(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  report_type TEXT NOT NULL CHECK (report_type IN ('inappropriate','incorrect','spam','copyright','other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','action_taken','dismissed')),
  action_taken TEXT,
  resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_activities_teacher ON public.teacher_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_school_branch ON public.teacher_activities(school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_type ON public.teacher_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_created ON public.teacher_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_review ON public.teacher_activities(review_status);
CREATE INDEX IF NOT EXISTS idx_teacher_activities_teacher_date ON public.teacher_activities(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity ON public.activity_attachments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_views_activity ON public.activity_views(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_views_student ON public.activity_views(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_activity ON public.activity_reports(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_status ON public.activity_reports(status);

-- RLS
ALTER TABLE public.teacher_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service client)
CREATE POLICY "service_full_access_teacher_activities" ON public.teacher_activities
  USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access_activity_attachments" ON public.activity_attachments
  USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access_activity_views" ON public.activity_views
  USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access_activity_monitoring_settings" ON public.activity_monitoring_settings
  USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access_activity_reports" ON public.activity_reports
  USING (true) WITH CHECK (true);

COMMIT;
