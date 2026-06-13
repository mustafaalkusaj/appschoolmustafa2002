// ─── Grade Type (flexible categories like Quiz, Homework, Exam, etc.) ───
export interface GradeType {
  id: string
  school_id: string
  name: string        // e.g. "اختبار شهري", "واجب", "اختبار نهائي"
  name_ar?: string
  name_en?: string
  category?: GradeCategory
  /** DB column — the actual max score for this grade type */
  max_score: number
  /** Alias for UI compat — same as max_score */
  default_max_score: number
  pass_score?: number
  weight?: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type GradeCategory =
  | 'quiz'        // اختبار قصير
  | 'homework'    // واجب
  | 'monthly'     // اختبار شهري
  | 'midterm'     // نصف السنة
  | 'final'       // نهائي
  | 'oral'        // شفهي
  | 'project'     // مشروع
  | 'participation' // مشاركة
  | 'other'       // أخرى

export type GradeStatus = 'draft' | 'confirmed' | 'locked'

export type BadgeType =
  | 'diamond'
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'top_student'
  | 'most_improved'
  | 'perfect_score'
  | 'streak'
  | 'on_time'

export type GoalStatus = 'active' | 'achieved' | 'missed'

// ─── Grade Entry (individual score record) ───
export interface GradeEntry {
  id: string
  school_id: string
  student_id: string
  subject_id: string
  class_id: string | null
  section_id: string | null
  teacher_id: string | null
  grade_type_id: string | null   // links to GradeType
  grade_type_name: string | null // denormalized for display convenience
  academic_year: string
  semester: 1 | 2
  score: number                  // الدرجة المحصلة
  max_score: number              // الدرجة الكاملة
  percentage: number             // (score / max_score) * 100
  grade_label: string | null     // computed from percentage
  status: GradeStatus
  note: string | null
  notification_sent: boolean     // whether student was notified
  notification_sent_at: string | null
  locked_by: string | null
  locked_at: string | null
  lock_reason: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  // enriched fields (populated at query time)
  student_name?: string | null
  subject_name?: string | null
  teacher_name?: string | null
  class_name?: string | null
  section_name?: string | null
}

// ─── Input for creating / upserting a grade entry ───
export interface GradeEntryInput {
  student_id: string
  subject_id: string
  class_id?: string | null
  section_id?: string | null
  teacher_id?: string | null
  grade_type_id?: string | null
  grade_type_name?: string | null
  academic_year: string
  semester: 1 | 2
  score: number
  max_score: number
  note?: string | null
  send_notification?: boolean  // flag to trigger push to student app
  status?: GradeStatus
  exam_photos?: string[]
}

// ─── Input for updating an existing grade entry ───
export interface GradeEntryUpdate {
  score?: number
  max_score?: number
  grade_type_id?: string | null
  grade_type_name?: string | null
  note?: string | null
  status?: GradeStatus
  send_notification?: boolean
}

// ─── Audit log ───
export interface GradeAuditLogEntry {
  id: string
  school_id: string
  grade_entry_id: string
  changed_by: string | null
  changed_at: string
  field_name: string
  old_value: string | null
  new_value: string | null
  reason: string | null
}

// ─── Badges & Goals ───
export interface StudentBadge {
  id: string
  school_id: string
  student_id: string
  subject_id: string | null
  badge_type: BadgeType
  earned_at: string
  metadata: Record<string, unknown>
  created_at: string
  // enriched
  student_name?: string | null
  subject_name?: string | null
}

export interface StudentGoal {
  id: string
  school_id: string
  student_id: string
  subject_id: string | null
  target_score: number
  deadline: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
}

// ─── Grade Labels (percentage-based classification) ───
export interface GradeLabel {
  label: string
  labelAr: string
  minPercent: number
  maxPercent: number
  color: string // tailwind color class
  badge: string // emoji
}

export const GRADE_LABELS: GradeLabel[] = [
  { label: 'Genius', labelAr: 'مبدع', minPercent: 96, maxPercent: 100, color: 'text-purple-600', badge: '🏆' },
  { label: 'Excellent', labelAr: 'ممتاز', minPercent: 90, maxPercent: 95, color: 'text-yellow-500', badge: '🌟' },
  { label: 'Very Good', labelAr: 'جيد جداً', minPercent: 80, maxPercent: 89, color: 'text-blue-500', badge: '💪' },
  { label: 'Good', labelAr: 'جيد', minPercent: 70, maxPercent: 79, color: 'text-green-500', badge: '👍' },
  { label: 'Average', labelAr: 'متوسط', minPercent: 60, maxPercent: 69, color: 'text-orange-400', badge: '📊' },
  { label: 'Accepted', labelAr: 'مقبول', minPercent: 50, maxPercent: 59, color: 'text-gray-500', badge: '✅' },
  { label: 'Supplementary', labelAr: 'مكمّل', minPercent: 40, maxPercent: 49, color: 'text-amber-500', badge: '⚠️' },
  { label: 'Fail', labelAr: 'راسب', minPercent: 0, maxPercent: 39, color: 'text-red-500', badge: '❌' },
]

// ─── Default grade types (seeded per school) ───
export const DEFAULT_GRADE_TYPES: Omit<GradeType, 'id' | 'school_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'اختبار قصير', name_ar: 'اختبار قصير', name_en: 'Short Quiz', category: 'quiz', max_score: 10, default_max_score: 10, pass_score: 5, weight: 1, is_active: true, sort_order: 1 },
  { name: 'واجب', name_ar: 'واجب', name_en: 'Homework', category: 'homework', max_score: 10, default_max_score: 10, pass_score: 5, weight: 1, is_active: true, sort_order: 2 },
  { name: 'شفهي', name_ar: 'شفهي', name_en: 'Oral', category: 'oral', max_score: 10, default_max_score: 10, pass_score: 5, weight: 1, is_active: true, sort_order: 3 },
  { name: 'مشاركة', name_ar: 'مشاركة', name_en: 'Participation', category: 'participation', max_score: 10, default_max_score: 10, pass_score: 5, weight: 1, is_active: true, sort_order: 4 },
  { name: 'اختبار شهري', name_ar: 'اختبار شهري', name_en: 'Monthly Exam', category: 'monthly', max_score: 25, default_max_score: 25, pass_score: 13, weight: 1, is_active: true, sort_order: 5 },
  { name: 'نصف السنة', name_ar: 'نصف السنة', name_en: 'Midterm', category: 'midterm', max_score: 50, default_max_score: 50, pass_score: 25, weight: 1, is_active: true, sort_order: 6 },
  { name: 'اختبار نهائي', name_ar: 'اختبار نهائي', name_en: 'Final Exam', category: 'final', max_score: 100, default_max_score: 100, pass_score: 50, weight: 1, is_active: true, sort_order: 7 },
  { name: 'مشروع', name_ar: 'مشروع', name_en: 'Project', category: 'project', max_score: 20, default_max_score: 20, pass_score: 10, weight: 1, is_active: true, sort_order: 8 },
]
