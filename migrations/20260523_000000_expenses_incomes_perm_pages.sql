-- =============================================================================
-- Add expenses and incomes to deep permissions system
-- Date: 2026-05-23
-- =============================================================================

BEGIN;

-- Add perm_pages for expenses and incomes under the finance module
WITH modules AS (SELECT id, key FROM perm_modules)
INSERT INTO perm_pages (module_id, key, name_ar, route, icon, sort_order) VALUES
  ((SELECT id FROM modules WHERE key = 'finance'), 'expenses', 'المصروفات', '/expenses', 'TrendingDown', 4),
  ((SELECT id FROM modules WHERE key = 'finance'), 'incomes',  'الإيرادات',  '/incomes',  'TrendingUp',   5)
ON CONFLICT (key) DO NOTHING;

-- Add perm_definitions for expenses
WITH pages AS (SELECT id, key FROM perm_pages)
INSERT INTO perm_definitions (page_id, type, key, name_ar) VALUES
  ((SELECT id FROM pages WHERE key = 'expenses'), 'action',  'expenses.read',   'عرض المصروفات'),
  ((SELECT id FROM pages WHERE key = 'expenses'), 'action',  'expenses.create', 'إضافة مصروف'),
  ((SELECT id FROM pages WHERE key = 'expenses'), 'action',  'expenses.update', 'تعديل مصروف'),
  ((SELECT id FROM pages WHERE key = 'expenses'), 'action',  'expenses.delete', 'حذف مصروف'),
  ((SELECT id FROM pages WHERE key = 'expenses'), 'special', 'expenses.export', 'تصدير المصروفات'),

-- Add perm_definitions for incomes
  ((SELECT id FROM pages WHERE key = 'incomes'), 'action',  'incomes.read',   'عرض الإيرادات'),
  ((SELECT id FROM pages WHERE key = 'incomes'), 'action',  'incomes.create', 'إضافة إيراد'),
  ((SELECT id FROM pages WHERE key = 'incomes'), 'action',  'incomes.update', 'تعديل إيراد'),
  ((SELECT id FROM pages WHERE key = 'incomes'), 'action',  'incomes.delete', 'حذف إيراد'),
  ((SELECT id FROM pages WHERE key = 'incomes'), 'special', 'incomes.export', 'تصدير الإيرادات')
ON CONFLICT (key) DO NOTHING;

COMMIT;
