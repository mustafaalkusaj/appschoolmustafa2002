export type GradeStatus = "draft" | "confirmed" | "locked";
export type GoalStatus = "active" | "completed" | "cancelled";
export type BadgeType = "achievement" | "participation" | "improvement";
export type GradeCategory = "exam" | "homework" | "participation" | "project";

export interface GradeType {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  passing_score: number;
  school_id: string;
}

export interface GradeEntry {
  id: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category: GradeCategory;
  status: GradeStatus;
  academic_year: string;
  semester: number;
  school_id: string;
}

export interface GradeEntryInput {
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  category: GradeCategory;
  academic_year: string;
  semester: number;
  class_id?: string;
}

export interface GradeEntryUpdate {
  score?: number;
  max_score?: number;
  category?: GradeCategory;
  status?: GradeStatus;
}

export interface StudentGoal {
  id: string;
  student_id: string;
  title: string;
  status: GoalStatus;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  type: BadgeType;
  title: string;
  awarded_at: string;
}
