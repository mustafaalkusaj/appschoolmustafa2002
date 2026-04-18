CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  section TEXT,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('sunday','monday','tuesday','wednesday','thursday','friday','saturday')),
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  subject TEXT NOT NULL,
  teacher_name TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, class_name, section, day_of_week, period_number)
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_school ON public.class_schedules(school_id);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_schedules_select" ON public.class_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.school_id = class_schedules.school_id
    )
  );

CREATE POLICY "school_schedules_modify" ON public.class_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.school_id = class_schedules.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );
