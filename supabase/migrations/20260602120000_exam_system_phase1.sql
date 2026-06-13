-- Exam System Phase 1 — ADDITIVE ONLY.
-- New tables + additive ALTER TABLE columns on exams, exam_attempts, questions.
-- All tables use RLS with service_role-only policy (server APIs bypass RLS).

-- =========================================================================
-- ALTER existing tables (additive columns only)
-- =========================================================================

-- exams: add section, status, description, is_randomized
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_randomized boolean DEFAULT false;

-- exam_attempts: add school_id, started_at, time_spent_seconds, status, integrity_score, answers_json, graded_by, graded_at
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS school_id uuid;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS time_spent_seconds int;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS status text DEFAULT 'in_progress';
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS integrity_score int;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS answers_json jsonb;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS graded_by uuid;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS graded_at timestamptz;

-- questions: add explanation, tags, times_used, avg_score, section
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS times_used int DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS avg_score decimal;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS section text;

-- =========================================================================
-- exam_questions: link exams <-> questions
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      uuid NOT NULL,
  question_id  uuid NOT NULL,
  sort_order   int DEFAULT 0,
  marks        decimal DEFAULT 1,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON public.exam_questions (question_id);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_questions_service_role ON public.exam_questions;
CREATE POLICY exam_questions_service_role
  ON public.exam_questions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- exam_settings: per-exam configuration
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_settings (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id                   uuid NOT NULL UNIQUE,
  duration_minutes          int,
  shuffle_questions         boolean DEFAULT false,
  shuffle_options           boolean DEFAULT false,
  auto_submit               boolean DEFAULT true,
  show_results_immediately  boolean DEFAULT false,
  allow_review              boolean DEFAULT true,
  lock_browser              boolean DEFAULT false,
  max_attempts              int DEFAULT 1,
  passing_marks             decimal,
  instructions              text,
  created_at                timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_settings_exam_id ON public.exam_settings (exam_id);

ALTER TABLE public.exam_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_settings_service_role ON public.exam_settings;
CREATE POLICY exam_settings_service_role
  ON public.exam_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- student_answers: per-question answers in an attempt
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.student_answers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id         uuid NOT NULL,
  question_id        uuid NOT NULL,
  student_answer     jsonb,
  is_correct         boolean,
  marks_awarded      decimal DEFAULT 0,
  time_spent_seconds int,
  flagged            boolean DEFAULT false,
  created_at         timestamptz DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_answers_attempt_id ON public.student_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON public.student_answers (question_id);

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_answers_service_role ON public.student_answers;
CREATE POLICY student_answers_service_role
  ON public.student_answers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- exam_integrity_logs: anti-cheat tracking
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_integrity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  uuid NOT NULL,
  event_type  text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_integrity_logs_attempt_id ON public.exam_integrity_logs (attempt_id);

ALTER TABLE public.exam_integrity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_integrity_logs_service_role ON public.exam_integrity_logs;
CREATE POLICY exam_integrity_logs_service_role
  ON public.exam_integrity_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- exam_rubrics: grading criteria for essay questions
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_rubrics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  criteria    text NOT NULL,
  max_marks   decimal NOT NULL,
  sort_order  int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_exam_rubrics_question_id ON public.exam_rubrics (question_id);

ALTER TABLE public.exam_rubrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_rubrics_service_role ON public.exam_rubrics;
CREATE POLICY exam_rubrics_service_role
  ON public.exam_rubrics FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- exam_templates: reusable exam structures
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL,
  name        text NOT NULL,
  type        text,
  structure   jsonb NOT NULL,
  created_by  uuid,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_templates_school_id ON public.exam_templates (school_id);

ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_templates_service_role ON public.exam_templates;
CREATE POLICY exam_templates_service_role
  ON public.exam_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================================
-- exam_schedule_notifications: track sent notifications
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.exam_schedule_notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      uuid NOT NULL,
  target_type  text,
  sent_at      timestamptz DEFAULT now(),
  channel      text
);

CREATE INDEX IF NOT EXISTS idx_exam_schedule_notifications_exam_id ON public.exam_schedule_notifications (exam_id);

ALTER TABLE public.exam_schedule_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_schedule_notifications_service_role ON public.exam_schedule_notifications;
CREATE POLICY exam_schedule_notifications_service_role
  ON public.exam_schedule_notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);
