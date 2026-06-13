-- =============================================================================
-- Deep Permissions System Migration
-- Date: 2026-05-13
-- Description: Adds 5-level dynamic permissions: page visibility, CRUD actions,
--              field visibility, data scope, and special actions.
--              All tables use perm_ prefix to avoid conflicts with existing
--              Prisma Role/Permission models.
-- =============================================================================

BEGIN;

-- =============================================================================
-- TABLE: perm_modules — System modules (user_mgmt, finance, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS perm_modules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  name_ar    TEXT NOT NULL,
  icon       TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

-- =============================================================================
-- TABLE: perm_pages — Pages per module
-- =============================================================================
CREATE TABLE IF NOT EXISTS perm_pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id  UUID NOT NULL REFERENCES perm_modules(id) ON DELETE CASCADE,
  key        TEXT UNIQUE NOT NULL,
  name_ar    TEXT NOT NULL,
  route      TEXT NOT NULL,
  icon       TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- =============================================================================
-- TABLE: perm_definitions — All permission definitions
-- =============================================================================
CREATE TABLE IF NOT EXISTS perm_definitions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id        UUID NOT NULL REFERENCES perm_pages(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('action', 'field', 'special', 'data_scope')),
  key            TEXT UNIQUE NOT NULL,
  name_ar        TEXT NOT NULL,
  description_ar TEXT
);

-- =============================================================================
-- TABLE: school_roles — Dynamic roles per school
-- =============================================================================
CREATE TABLE IF NOT EXISTS school_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, key)
);

-- =============================================================================
-- TABLE: role_perm_assignments — Many-to-many: role <-> permission
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_perm_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES school_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES perm_definitions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- =============================================================================
-- TABLE: user_perm_overrides — Per-user grant/revoke overrides
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_perm_overrides (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES perm_definitions(id) ON DELETE CASCADE,
  is_granted    BOOLEAN NOT NULL,
  granted_by    UUID REFERENCES user_profiles(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- =============================================================================
-- ALTER user_profiles — Link user to a dynamic school role
-- =============================================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS school_role_id UUID REFERENCES school_roles(id);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_perm_pages_module_id      ON perm_pages(module_id);
CREATE INDEX IF NOT EXISTS idx_perm_defs_page_id         ON perm_definitions(page_id);
CREATE INDEX IF NOT EXISTS idx_perm_defs_type            ON perm_definitions(type);
CREATE INDEX IF NOT EXISTS idx_school_roles_school_id    ON school_roles(school_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_role_id         ON role_perm_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_permission_id   ON role_perm_assignments(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user  ON user_perm_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_role ON user_profiles(school_role_id);

-- =============================================================================
-- SEED: perm_modules
-- =============================================================================
INSERT INTO perm_modules (key, name_ar, icon, sort_order) VALUES
  ('user_mgmt',     'إدارة المستخدمين',   'Users',         1),
  ('student_mgmt',  'شؤون الطلاب',        'GraduationCap', 2),
  ('guardian_mgmt', 'أولياء الأمور',       'UserCheck',     3),
  ('hr',            'شؤون المعلمين',       'Briefcase',     4),
  ('finance',       'المالية',            'DollarSign',    5),
  ('academic',      'الشؤون الأكاديمية',  'BookOpen',      6),
  ('system',        'إعدادات النظام',      'Settings',      7)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SEED: perm_pages
-- =============================================================================
WITH modules AS (SELECT id, key FROM perm_modules)
INSERT INTO perm_pages (module_id, key, name_ar, route, icon, sort_order) VALUES
  ((SELECT id FROM modules WHERE key = 'user_mgmt'),     'users',         'المستخدمين',       '/dashboard/users',        'UserCog',       1),
  ((SELECT id FROM modules WHERE key = 'student_mgmt'),  'students',      'الطلاب',            '/dashboard/students',      'Users',         1),
  ((SELECT id FROM modules WHERE key = 'student_mgmt'),  'registrations', 'التسجيل',           '/dashboard/registrations', 'UserPlus',      2),
  ((SELECT id FROM modules WHERE key = 'guardian_mgmt'), 'guardians',     'أولياء الأمور',     '/dashboard/guardians',     'UserCheck',     1),
  ((SELECT id FROM modules WHERE key = 'hr'),            'teachers',      'المعلمين',          '/dashboard/teachers',      'Briefcase',     1),
  ((SELECT id FROM modules WHERE key = 'finance'),       'payments',      'المدفوعات',         '/dashboard/payments',      'CreditCard',    1),
  ((SELECT id FROM modules WHERE key = 'finance'),       'invoices',      'الفواتير',          '/dashboard/invoices',      'FileText',      2),
  ((SELECT id FROM modules WHERE key = 'finance'),       'salaries',      'الرواتب',           '/dashboard/salaries',      'Wallet',        3),
  ((SELECT id FROM modules WHERE key = 'academic'),      'grades',        'الدرجات',           '/dashboard/grades',        'Award',         1),
  ((SELECT id FROM modules WHERE key = 'academic'),      'attendance',    'الحضور والغياب',    '/dashboard/attendance',    'CalendarCheck', 2),
  ((SELECT id FROM modules WHERE key = 'academic'),      'classes',       'الفصول',            '/dashboard/classes',       'School',        3),
  ((SELECT id FROM modules WHERE key = 'academic'),      'schedules',     'الجداول',           '/dashboard/schedules',     'Calendar',      4),
  ((SELECT id FROM modules WHERE key = 'academic'),      'subjects',      'المواد',            '/dashboard/subjects',      'BookOpen',      5),
  ((SELECT id FROM modules WHERE key = 'system'),        'settings',      'الإعدادات',         '/dashboard/settings',      'Settings',      1),
  ((SELECT id FROM modules WHERE key = 'system'),        'reports',       'التقارير',          '/dashboard/reports',       'BarChart2',     2),
  ((SELECT id FROM modules WHERE key = 'system'),        'notifications', 'الإشعارات',         '/dashboard/notifications',  'Bell',         3),
  ((SELECT id FROM modules WHERE key = 'system'),        'audit_log',     'سجل العمليات',      '/dashboard/audit-log',     'Shield',        4)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SEED: perm_definitions (~150 permissions)
-- =============================================================================
WITH pages AS (SELECT id, key FROM perm_pages)
INSERT INTO perm_definitions (page_id, type, key, name_ar) VALUES

  -- USERS
  ((SELECT id FROM pages WHERE key='users'),'action',    'users.create',           'إضافة مستخدم'),
  ((SELECT id FROM pages WHERE key='users'),'action',    'users.read',             'عرض المستخدمين'),
  ((SELECT id FROM pages WHERE key='users'),'action',    'users.update',           'تعديل مستخدم'),
  ((SELECT id FROM pages WHERE key='users'),'action',    'users.delete',           'حذف مستخدم'),
  ((SELECT id FROM pages WHERE key='users'),'field',     'users.view_phone',       'رؤية رقم الهاتف'),
  ((SELECT id FROM pages WHERE key='users'),'field',     'users.view_email',       'رؤية البريد الإلكتروني'),
  ((SELECT id FROM pages WHERE key='users'),'field',     'users.view_national_id', 'رؤية رقم الهوية'),
  ((SELECT id FROM pages WHERE key='users'),'field',     'users.view_address',     'رؤية العنوان'),
  ((SELECT id FROM pages WHERE key='users'),'special',   'users.export',           'تصدير البيانات'),
  ((SELECT id FROM pages WHERE key='users'),'special',   'users.print',            'طباعة'),
  ((SELECT id FROM pages WHERE key='users'),'special',   'users.reset_password',   'إعادة تعيين كلمة المرور'),
  ((SELECT id FROM pages WHERE key='users'),'special',   'users.change_role',      'تغيير دور المستخدم'),

  -- STUDENTS
  ((SELECT id FROM pages WHERE key='students'),'action',    'students.create',              'إضافة طالب'),
  ((SELECT id FROM pages WHERE key='students'),'action',    'students.read',                'عرض الطلاب'),
  ((SELECT id FROM pages WHERE key='students'),'action',    'students.update',              'تعديل طالب'),
  ((SELECT id FROM pages WHERE key='students'),'action',    'students.delete',              'حذف طالب'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_phone',          'رؤية هاتف الطالب'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_guardian_phone', 'رؤية هاتف ولي الأمر'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_national_id',    'رؤية رقم هوية الطالب'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_medical',        'رؤية المعلومات الصحية'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_address',        'رؤية العنوان'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_prev_school',    'رؤية المدرسة السابقة'),
  ((SELECT id FROM pages WHERE key='students'),'field',     'students.view_fees',           'رؤية الرسوم'),
  ((SELECT id FROM pages WHERE key='students'),'special',   'students.export',              'تصدير'),
  ((SELECT id FROM pages WHERE key='students'),'special',   'students.print_card',          'طباعة بطاقة طالب'),
  ((SELECT id FROM pages WHERE key='students'),'special',   'students.transfer',            'نقل لفصل آخر'),
  ((SELECT id FROM pages WHERE key='students'),'special',   'students.withdraw',            'انسحاب / فصل'),
  ((SELECT id FROM pages WHERE key='students'),'special',   'students.send_notification',   'إرسال إشعار لولي الأمر'),
  ((SELECT id FROM pages WHERE key='students'),'data_scope','students.scope_own_class',     'فقط طلاب فصله'),
  ((SELECT id FROM pages WHERE key='students'),'data_scope','students.scope_own_grade',     'فقط طلاب مرحلته'),
  ((SELECT id FROM pages WHERE key='students'),'data_scope','students.scope_all',           'كل الطلاب بالفرع'),

  -- REGISTRATIONS
  ((SELECT id FROM pages WHERE key='registrations'),'action',  'registrations.create',  'تسجيل طالب جديد'),
  ((SELECT id FROM pages WHERE key='registrations'),'action',  'registrations.read',    'عرض طلبات التسجيل'),
  ((SELECT id FROM pages WHERE key='registrations'),'action',  'registrations.update',  'تعديل طلب'),
  ((SELECT id FROM pages WHERE key='registrations'),'action',  'registrations.delete',  'حذف طلب'),
  ((SELECT id FROM pages WHERE key='registrations'),'special', 'registrations.approve', 'قبول طلب تسجيل'),
  ((SELECT id FROM pages WHERE key='registrations'),'special', 'registrations.reject',  'رفض طلب تسجيل'),
  ((SELECT id FROM pages WHERE key='registrations'),'special', 'registrations.export',  'تصدير'),
  ((SELECT id FROM pages WHERE key='registrations'),'special', 'registrations.print',   'طباعة طلب التسجيل'),

  -- GUARDIANS
  ((SELECT id FROM pages WHERE key='guardians'),'action',  'guardians.create',           'إضافة ولي أمر'),
  ((SELECT id FROM pages WHERE key='guardians'),'action',  'guardians.read',             'عرض أولياء الأمور'),
  ((SELECT id FROM pages WHERE key='guardians'),'action',  'guardians.update',           'تعديل ولي أمر'),
  ((SELECT id FROM pages WHERE key='guardians'),'action',  'guardians.delete',           'حذف ولي أمر'),
  ((SELECT id FROM pages WHERE key='guardians'),'field',   'guardians.view_phone',       'رؤية رقم الهاتف'),
  ((SELECT id FROM pages WHERE key='guardians'),'field',   'guardians.view_national_id', 'رؤية رقم الهوية'),
  ((SELECT id FROM pages WHERE key='guardians'),'field',   'guardians.view_address',     'رؤية العنوان'),
  ((SELECT id FROM pages WHERE key='guardians'),'field',   'guardians.view_occupation',  'رؤية جهة العمل'),
  ((SELECT id FROM pages WHERE key='guardians'),'special', 'guardians.export',           'تصدير'),
  ((SELECT id FROM pages WHERE key='guardians'),'special', 'guardians.send_message',     'إرسال رسالة'),

  -- TEACHERS
  ((SELECT id FROM pages WHERE key='teachers'),'action',  'teachers.create',              'إضافة معلم'),
  ((SELECT id FROM pages WHERE key='teachers'),'action',  'teachers.read',                'عرض المعلمين'),
  ((SELECT id FROM pages WHERE key='teachers'),'action',  'teachers.update',              'تعديل معلم'),
  ((SELECT id FROM pages WHERE key='teachers'),'action',  'teachers.delete',              'حذف معلم'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_phone',          'رؤية رقم الهاتف'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_salary',         'رؤية الراتب'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_national_id',    'رؤية رقم الهوية'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_bank_account',   'رؤية الحساب البنكي'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_contract',       'رؤية تفاصيل العقد'),
  ((SELECT id FROM pages WHERE key='teachers'),'field',   'teachers.view_qualifications', 'رؤية المؤهلات'),
  ((SELECT id FROM pages WHERE key='teachers'),'special', 'teachers.export',              'تصدير'),
  ((SELECT id FROM pages WHERE key='teachers'),'special', 'teachers.print',               'طباعة'),
  ((SELECT id FROM pages WHERE key='teachers'),'special', 'teachers.assign_schedule',     'تعيين جدول حصص'),

  -- PAYMENTS
  ((SELECT id FROM pages WHERE key='payments'),'action',  'payments.create',              'تسجيل دفعة'),
  ((SELECT id FROM pages WHERE key='payments'),'action',  'payments.read',                'عرض المدفوعات'),
  ((SELECT id FROM pages WHERE key='payments'),'action',  'payments.update',              'تعديل دفعة'),
  ((SELECT id FROM pages WHERE key='payments'),'action',  'payments.delete',              'حذف دفعة'),
  ((SELECT id FROM pages WHERE key='payments'),'field',   'payments.view_amount',         'رؤية المبالغ'),
  ((SELECT id FROM pages WHERE key='payments'),'field',   'payments.view_discount',       'رؤية الخصومات'),
  ((SELECT id FROM pages WHERE key='payments'),'field',   'payments.view_balance',        'رؤية الرصيد المتبقي'),
  ((SELECT id FROM pages WHERE key='payments'),'field',   'payments.view_payment_method', 'رؤية طريقة الدفع'),
  ((SELECT id FROM pages WHERE key='payments'),'special', 'payments.approve',             'اعتماد دفعة'),
  ((SELECT id FROM pages WHERE key='payments'),'special', 'payments.refund',              'استرجاع مبلغ'),
  ((SELECT id FROM pages WHERE key='payments'),'special', 'payments.print_receipt',       'طباعة إيصال'),
  ((SELECT id FROM pages WHERE key='payments'),'special', 'payments.export',              'تصدير'),
  ((SELECT id FROM pages WHERE key='payments'),'special', 'payments.send_reminder',       'إرسال تذكير دفع'),

  -- INVOICES
  ((SELECT id FROM pages WHERE key='invoices'),'action',  'invoices.create',           'إنشاء فاتورة'),
  ((SELECT id FROM pages WHERE key='invoices'),'action',  'invoices.read',             'عرض الفواتير'),
  ((SELECT id FROM pages WHERE key='invoices'),'action',  'invoices.update',           'تعديل فاتورة'),
  ((SELECT id FROM pages WHERE key='invoices'),'action',  'invoices.delete',           'حذف فاتورة'),
  ((SELECT id FROM pages WHERE key='invoices'),'field',   'invoices.view_amounts',     'رؤية المبالغ'),
  ((SELECT id FROM pages WHERE key='invoices'),'special', 'invoices.approve',          'اعتماد فاتورة'),
  ((SELECT id FROM pages WHERE key='invoices'),'special', 'invoices.print',            'طباعة فاتورة'),
  ((SELECT id FROM pages WHERE key='invoices'),'special', 'invoices.export',           'تصدير'),
  ((SELECT id FROM pages WHERE key='invoices'),'special', 'invoices.send_to_guardian', 'إرسال للولي'),

  -- SALARIES
  ((SELECT id FROM pages WHERE key='salaries'),'action',  'salaries.create',            'إنشاء مسيّر رواتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'action',  'salaries.read',              'عرض الرواتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'action',  'salaries.update',            'تعديل راتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'action',  'salaries.delete',            'حذف سجل راتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'field',   'salaries.view_basic',        'رؤية الراتب الأساسي'),
  ((SELECT id FROM pages WHERE key='salaries'),'field',   'salaries.view_allowances',   'رؤية البدلات'),
  ((SELECT id FROM pages WHERE key='salaries'),'field',   'salaries.view_deductions',   'رؤية الخصومات'),
  ((SELECT id FROM pages WHERE key='salaries'),'field',   'salaries.view_net',          'رؤية صافي الراتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'field',   'salaries.view_bank_account', 'رؤية الحساب البنكي'),
  ((SELECT id FROM pages WHERE key='salaries'),'special', 'salaries.approve',           'اعتماد مسيّر الرواتب'),
  ((SELECT id FROM pages WHERE key='salaries'),'special', 'salaries.export',            'تصدير'),
  ((SELECT id FROM pages WHERE key='salaries'),'special', 'salaries.print_slip',        'طباعة قسيمة راتب'),

  -- GRADES
  ((SELECT id FROM pages WHERE key='grades'),'action',     'grades.create',            'إدخال درجات'),
  ((SELECT id FROM pages WHERE key='grades'),'action',     'grades.read',              'عرض الدرجات'),
  ((SELECT id FROM pages WHERE key='grades'),'action',     'grades.update',            'تعديل درجات'),
  ((SELECT id FROM pages WHERE key='grades'),'action',     'grades.delete',            'حذف درجات'),
  ((SELECT id FROM pages WHERE key='grades'),'special',    'grades.approve',           'اعتماد الدرجات'),
  ((SELECT id FROM pages WHERE key='grades'),'special',    'grades.export',            'تصدير'),
  ((SELECT id FROM pages WHERE key='grades'),'special',    'grades.print_report',      'طباعة كشف درجات'),
  ((SELECT id FROM pages WHERE key='grades'),'special',    'grades.print_certificate', 'طباعة شهادة'),
  ((SELECT id FROM pages WHERE key='grades'),'data_scope', 'grades.scope_own_subject', 'فقط مادته'),
  ((SELECT id FROM pages WHERE key='grades'),'data_scope', 'grades.scope_own_class',   'فقط فصله'),
  ((SELECT id FROM pages WHERE key='grades'),'data_scope', 'grades.scope_all',         'كل الدرجات'),

  -- ATTENDANCE
  ((SELECT id FROM pages WHERE key='attendance'),'action',     'attendance.create',           'تسجيل حضور'),
  ((SELECT id FROM pages WHERE key='attendance'),'action',     'attendance.read',             'عرض الحضور'),
  ((SELECT id FROM pages WHERE key='attendance'),'action',     'attendance.update',           'تعديل حضور'),
  ((SELECT id FROM pages WHERE key='attendance'),'action',     'attendance.delete',           'حذف سجل'),
  ((SELECT id FROM pages WHERE key='attendance'),'special',    'attendance.export',           'تصدير'),
  ((SELECT id FROM pages WHERE key='attendance'),'special',    'attendance.notify_guardian',  'إشعار ولي الأمر بالغياب'),
  ((SELECT id FROM pages WHERE key='attendance'),'special',    'attendance.print_report',     'طباعة تقرير حضور'),
  ((SELECT id FROM pages WHERE key='attendance'),'data_scope', 'attendance.scope_own_class',  'فقط فصله'),
  ((SELECT id FROM pages WHERE key='attendance'),'data_scope', 'attendance.scope_own_grade',  'فقط مرحلته'),
  ((SELECT id FROM pages WHERE key='attendance'),'data_scope', 'attendance.scope_all',        'الكل'),

  -- CLASSES
  ((SELECT id FROM pages WHERE key='classes'),'action',  'classes.create',          'إنشاء فصل'),
  ((SELECT id FROM pages WHERE key='classes'),'action',  'classes.read',            'عرض الفصول'),
  ((SELECT id FROM pages WHERE key='classes'),'action',  'classes.update',          'تعديل فصل'),
  ((SELECT id FROM pages WHERE key='classes'),'action',  'classes.delete',          'حذف فصل'),
  ((SELECT id FROM pages WHERE key='classes'),'special', 'classes.assign_students', 'توزيع الطلاب'),
  ((SELECT id FROM pages WHERE key='classes'),'special', 'classes.assign_teacher',  'تعيين معلم للفصل'),
  ((SELECT id FROM pages WHERE key='classes'),'special', 'classes.export',          'تصدير'),

  -- SCHEDULES
  ((SELECT id FROM pages WHERE key='schedules'),'action',  'schedules.create', 'إنشاء جدول'),
  ((SELECT id FROM pages WHERE key='schedules'),'action',  'schedules.read',   'عرض الجداول'),
  ((SELECT id FROM pages WHERE key='schedules'),'action',  'schedules.update', 'تعديل جدول'),
  ((SELECT id FROM pages WHERE key='schedules'),'action',  'schedules.delete', 'حذف جدول'),
  ((SELECT id FROM pages WHERE key='schedules'),'special', 'schedules.print',  'طباعة الجدول'),
  ((SELECT id FROM pages WHERE key='schedules'),'special', 'schedules.export', 'تصدير'),

  -- SUBJECTS
  ((SELECT id FROM pages WHERE key='subjects'),'action', 'subjects.create', 'إضافة مادة'),
  ((SELECT id FROM pages WHERE key='subjects'),'action', 'subjects.read',   'عرض المواد'),
  ((SELECT id FROM pages WHERE key='subjects'),'action', 'subjects.update', 'تعديل مادة'),
  ((SELECT id FROM pages WHERE key='subjects'),'action', 'subjects.delete', 'حذف مادة'),

  -- SETTINGS
  ((SELECT id FROM pages WHERE key='settings'),'action',  'settings.read',                 'عرض الإعدادات'),
  ((SELECT id FROM pages WHERE key='settings'),'action',  'settings.update',               'تعديل الإعدادات'),
  ((SELECT id FROM pages WHERE key='settings'),'special', 'settings.manage_roles',         'إدارة الأدوار والصلاحيات'),
  ((SELECT id FROM pages WHERE key='settings'),'special', 'settings.manage_academic_year', 'إدارة السنة الدراسية'),

  -- REPORTS
  ((SELECT id FROM pages WHERE key='reports'),'action',  'reports.read',       'عرض التقارير'),
  ((SELECT id FROM pages WHERE key='reports'),'special', 'reports.export',     'تصدير التقارير'),
  ((SELECT id FROM pages WHERE key='reports'),'special', 'reports.print',      'طباعة التقارير'),
  ((SELECT id FROM pages WHERE key='reports'),'special', 'reports.financial',  'التقارير المالية'),
  ((SELECT id FROM pages WHERE key='reports'),'special', 'reports.academic',   'التقارير الأكاديمية'),
  ((SELECT id FROM pages WHERE key='reports'),'special', 'reports.attendance', 'تقارير الحضور'),

  -- NOTIFICATIONS
  ((SELECT id FROM pages WHERE key='notifications'),'action',  'notifications.create',    'إنشاء إشعار'),
  ((SELECT id FROM pages WHERE key='notifications'),'action',  'notifications.read',      'عرض الإشعارات'),
  ((SELECT id FROM pages WHERE key='notifications'),'action',  'notifications.delete',    'حذف إشعار'),
  ((SELECT id FROM pages WHERE key='notifications'),'special', 'notifications.send_bulk', 'إرسال جماعي'),
  ((SELECT id FROM pages WHERE key='notifications'),'special', 'notifications.send_sms',  'إرسال SMS'),

  -- AUDIT_LOG
  ((SELECT id FROM pages WHERE key='audit_log'),'action',  'audit_log.read',         'عرض سجل العمليات'),
  ((SELECT id FROM pages WHERE key='audit_log'),'special', 'audit_log.export',       'تصدير السجل'),
  ((SELECT id FROM pages WHERE key='audit_log'),'field',   'audit_log.view_ip',      'رؤية عنوان IP'),
  ((SELECT id FROM pages WHERE key='audit_log'),'field',   'audit_log.view_details', 'رؤية تفاصيل التغيير')

ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- FUNCTION: seed_default_roles_for_school(school_id UUID)
-- Call when a new school is created to give it default roles with permissions.
-- =============================================================================
CREATE OR REPLACE FUNCTION seed_default_roles_for_school(p_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch_admin_id UUID;
  v_accountant_id   UUID;
  v_teacher_id      UUID;
  v_data_entry_id   UUID;
  v_viewer_id       UUID;
BEGIN
  INSERT INTO school_roles (school_id, key, name_ar, is_system) VALUES
    (p_school_id, 'branch_admin', 'مدير الفرع',  true),
    (p_school_id, 'accountant',   'محاسب',        false),
    (p_school_id, 'teacher',      'معلم',          false),
    (p_school_id, 'data_entry',   'مدخل بيانات',  false),
    (p_school_id, 'viewer',       'مشاهد فقط',     false)
  ON CONFLICT (school_id, key) DO NOTHING;

  SELECT id INTO v_branch_admin_id FROM school_roles WHERE school_id = p_school_id AND key = 'branch_admin';
  SELECT id INTO v_accountant_id   FROM school_roles WHERE school_id = p_school_id AND key = 'accountant';
  SELECT id INTO v_teacher_id      FROM school_roles WHERE school_id = p_school_id AND key = 'teacher';
  SELECT id INTO v_data_entry_id   FROM school_roles WHERE school_id = p_school_id AND key = 'data_entry';
  SELECT id INTO v_viewer_id       FROM school_roles WHERE school_id = p_school_id AND key = 'viewer';

  -- branch_admin: broad access
  INSERT INTO role_perm_assignments (role_id, permission_id)
    SELECT v_branch_admin_id, id FROM perm_definitions WHERE key IN (
      'users.create','users.read','users.update','users.view_phone','users.view_email',
      'users.export','users.reset_password',
      'students.create','students.read','students.update','students.delete',
      'students.view_phone','students.view_guardian_phone','students.view_address','students.view_fees',
      'students.export','students.print_card','students.transfer','students.send_notification','students.scope_all',
      'registrations.create','registrations.read','registrations.update','registrations.approve','registrations.reject',
      'guardians.create','guardians.read','guardians.update','guardians.view_phone',
      'teachers.create','teachers.read','teachers.update','teachers.view_qualifications','teachers.assign_schedule',
      'payments.create','payments.read','payments.update','payments.view_amount','payments.view_balance',
      'payments.view_payment_method','payments.print_receipt','payments.export','payments.send_reminder',
      'attendance.create','attendance.read','attendance.update','attendance.export',
      'attendance.notify_guardian','attendance.scope_all',
      'classes.create','classes.read','classes.update','classes.assign_students','classes.assign_teacher','classes.export',
      'schedules.create','schedules.read','schedules.update','schedules.print',
      'subjects.create','subjects.read','subjects.update',
      'settings.read','settings.manage_roles','settings.manage_academic_year',
      'reports.read','reports.export','reports.financial','reports.academic','reports.attendance',
      'notifications.create','notifications.read','notifications.send_bulk',
      'audit_log.read'
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- accountant: finance only
  INSERT INTO role_perm_assignments (role_id, permission_id)
    SELECT v_accountant_id, id FROM perm_definitions WHERE key IN (
      'students.read','students.view_fees','students.scope_all',
      'payments.create','payments.read','payments.update','payments.view_amount',
      'payments.view_discount','payments.view_balance','payments.view_payment_method',
      'payments.print_receipt','payments.export',
      'invoices.create','invoices.read','invoices.update','invoices.view_amounts','invoices.print','invoices.export',
      'salaries.create','salaries.read','salaries.update',
      'salaries.view_basic','salaries.view_allowances','salaries.view_deductions','salaries.view_net',
      'salaries.print_slip','salaries.export',
      'reports.read','reports.financial'
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- teacher: own class only
  INSERT INTO role_perm_assignments (role_id, permission_id)
    SELECT v_teacher_id, id FROM perm_definitions WHERE key IN (
      'students.read','students.view_phone','students.view_guardian_phone','students.view_fees',
      'students.scope_own_class',
      'attendance.create','attendance.read','attendance.update',
      'attendance.notify_guardian','attendance.scope_own_class',
      'grades.create','grades.read','grades.update','grades.scope_own_subject',
      'schedules.read','subjects.read','classes.read'
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- data_entry: student intake
  INSERT INTO role_perm_assignments (role_id, permission_id)
    SELECT v_data_entry_id, id FROM perm_definitions WHERE key IN (
      'students.create','students.read','students.update',
      'students.view_phone','students.view_address','students.scope_all',
      'registrations.create','registrations.read','registrations.update',
      'guardians.create','guardians.read','guardians.update','guardians.view_phone',
      'classes.read','schedules.read','subjects.read'
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- viewer: read-only
  INSERT INTO role_perm_assignments (role_id, permission_id)
    SELECT v_viewer_id, id FROM perm_definitions WHERE key IN (
      'students.read','students.scope_all',
      'guardians.read','teachers.read',
      'payments.read','payments.view_amount','payments.view_balance',
      'attendance.read','attendance.scope_all',
      'grades.read','grades.scope_all',
      'classes.read','schedules.read','subjects.read',
      'reports.read'
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

END;
$$;

COMMIT;
