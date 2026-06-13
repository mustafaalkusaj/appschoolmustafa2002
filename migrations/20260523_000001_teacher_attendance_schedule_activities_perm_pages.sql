-- =============================================================================
-- Add teacher_attendance, schedule, teacher_activities perm pages
-- Date: 2026-05-23
-- =============================================================================

BEGIN;

WITH modules AS (SELECT id, key FROM perm_modules)
INSERT INTO perm_pages (module_id, key, name_ar, route, icon, sort_order) VALUES
  ((SELECT id FROM modules WHERE key = 'hr'),       'teacher_attendance',  'حضور الأساتذة',         '/teacher-attendance',  'CalendarCheck2', 2),
  ((SELECT id FROM modules WHERE key = 'hr'),       'teacher_activities',  'متابعة نشاط الأساتذة',  '/teacher-activities',  'Activity',       3),
  ((SELECT id FROM modules WHERE key = 'academic'), 'schedule',            'جدول الحصص',            '/schedule',            'Calendar',       6)
ON CONFLICT (key) DO NOTHING;

WITH pages AS (SELECT id, key FROM perm_pages)
INSERT INTO perm_definitions (page_id, type, key, name_ar) VALUES
  ((SELECT id FROM pages WHERE key = 'teacher_attendance'), 'action',  'teacher_attendance.read',   'عرض حضور الأساتذة'),
  ((SELECT id FROM pages WHERE key = 'teacher_attendance'), 'action',  'teacher_attendance.create', 'تسجيل حضور الأستاذ'),
  ((SELECT id FROM pages WHERE key = 'teacher_attendance'), 'action',  'teacher_attendance.update', 'تعديل حضور الأستاذ'),
  ((SELECT id FROM pages WHERE key = 'teacher_attendance'), 'action',  'teacher_attendance.delete', 'حذف سجل حضور الأستاذ'),
  ((SELECT id FROM pages WHERE key = 'teacher_attendance'), 'special', 'teacher_attendance.export', 'تصدير حضور الأساتذة'),
  ((SELECT id FROM pages WHERE key = 'teacher_activities'), 'action',  'teacher_activities.read',     'عرض نشاط الأساتذة'),
  ((SELECT id FROM pages WHERE key = 'teacher_activities'), 'special', 'teacher_activities.moderate', 'تعديل وحذف محتوى الأساتذة'),
  ((SELECT id FROM pages WHERE key = 'schedule'), 'action',  'schedule.read',   'عرض الجدول'),
  ((SELECT id FROM pages WHERE key = 'schedule'), 'action',  'schedule.create', 'إنشاء جدول'),
  ((SELECT id FROM pages WHERE key = 'schedule'), 'action',  'schedule.update', 'تعديل الجدول'),
  ((SELECT id FROM pages WHERE key = 'schedule'), 'action',  'schedule.delete', 'حذف من الجدول'),
  ((SELECT id FROM pages WHERE key = 'schedule'), 'special', 'schedule.export', 'تصدير الجدول')
ON CONFLICT (key) DO NOTHING;

COMMIT;
