-- ============================================================
-- نظام التقويم المدرسي العراقي الذكي
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. calendar_events — أحداث التقويم المدرسي
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id    UUID,
  title        TEXT NOT NULL,
  title_en     TEXT,
  date         DATE NOT NULL,
  end_date     DATE,
  type         TEXT NOT NULL CHECK (type IN ('holiday','religious','national','school','exam','vacation','custom')),
  hijri_date   TEXT,
  description  TEXT,
  color        TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  is_global    BOOLEAN NOT NULL DEFAULT false,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_calendar_events_school_id ON public.calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_global ON public.calendar_events(is_global);

-- ----------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Global events (is_global=true) visible to all authenticated users
CREATE POLICY "Global events visible to all" ON public.calendar_events
  FOR SELECT USING (is_global = true);

-- School-specific events visible to school members
CREATE POLICY "School events visible to school members" ON public.calendar_events
  FOR SELECT USING (
    is_global = false AND
    school_id IN (
      SELECT school_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only admins can insert/update/delete school events
CREATE POLICY "Admins can manage school events" ON public.calendar_events
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM public.users WHERE id = auth.uid() AND role IN ('super_admin','admin')
    )
  );

-- Service role can always insert (for seeding)
CREATE POLICY "Service role full access" ON public.calendar_events
  FOR ALL USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------
-- 4. Seed: العطل الوطنية العراقية الثابتة لعام 2026
-- ----------------------------------------------------------------

-- أيام وطنية وعطل رسمية
INSERT INTO public.calendar_events (title, title_en, date, end_date, type, is_global, is_recurring, description) VALUES
('رأس السنة الميلادية', 'New Year''s Day', '2026-01-01', NULL, 'national', true, true, 'بداية العام الميلادي الجديد'),
('يوم الجيش العراقي', 'Iraqi Army Day', '2026-01-06', NULL, 'national', true, true, 'تأسيس الجيش العراقي عام 1921'),
('ذكرى حلبجة', 'Halabja Remembrance Day', '2026-03-16', NULL, 'national', true, true, 'ذكرى ضحايا القصف الكيميائي على مدينة حلبجة'),
('نوروز - رأس السنة الكردية', 'Nowruz - Kurdish New Year', '2026-03-21', NULL, 'national', true, true, 'رأس السنة الكردية وبداية فصل الربيع'),
('عيد العمال', 'International Labour Day', '2026-05-01', NULL, 'national', true, true, 'اليوم العالمي للعمال'),
('ثورة 14 تموز', 'July 14 Revolution Anniversary', '2026-07-14', NULL, 'national', true, true, 'ذكرى ثورة 14 تموز 1958'),
('اليوم الوطني العراقي', 'Iraqi National Day', '2026-10-03', NULL, 'national', true, true, 'تأسيس الدولة العراقية الحديثة'),
('يوم النصر', 'Victory Day', '2026-12-10', NULL, 'national', true, true, 'ذكرى النصر'),
('عيد الميلاد المجيد', 'Christmas Day', '2026-12-25', NULL, 'national', true, true, 'عيد ميلاد السيد المسيح'),

-- مناسبات دينية إسلامية (تواريخ تقريبية لعام 2026)
('عيد الفطر المبارك', 'Eid Al-Fitr', '2026-03-20', '2026-03-22', 'religious', true, true, 'عيد الفطر المبارك 1-3 شوال 1447هـ'),
('عيد الأضحى المبارك', 'Eid Al-Adha', '2026-05-27', '2026-05-30', 'religious', true, true, 'عيد الأضحى المبارك 10-13 ذو الحجة 1447هـ'),
('عيد الغدير الأغر', 'Eid Al-Ghadeer', '2026-06-03', NULL, 'religious', true, true, '18 ذو الحجة - عيد الغدير الأغر'),
('رأس السنة الهجرية', 'Islamic New Year', '2026-06-17', NULL, 'religious', true, true, '1 محرم 1448هـ - بداية العام الهجري الجديد'),
('عاشوراء', 'Ashura', '2026-06-26', NULL, 'religious', true, true, '10 محرم - إحياء ذكرى استشهاد الإمام الحسين عليه السلام'),
('المولد النبوي الشريف', 'Prophet Muhammad''s Birthday', '2026-09-15', NULL, 'religious', true, true, '12 ربيع الأول - المولد النبوي الشريف')
ON CONFLICT DO NOTHING;

COMMIT;
