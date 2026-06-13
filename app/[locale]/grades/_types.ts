import type { GradeEntry, GradeType } from "@/lib/grades/types";

export type { GradeEntry, GradeType };

export interface ClassOption {
  id: string;
  name: string;
  branch_id: string | null;
}

export interface SectionOption {
  id: string;
  name: string;
  class_id: string;
}

export interface SubjectOption {
  id: string;
  name: string;
}

/** Used by GradesEntryGrid for student search results */
export interface StudentOption {
  id: string;
  name: string;
  class_id: string | null;
  section_id: string | null;
}

export interface GradeFilters {
  academicYear: string;
  semester: 1 | 2;
  classId: string;
  sectionId: string;
  subjectId: string;
  gradeTypeId: string;
  status: string;
  search: string;
  /** @deprecated Used by legacy GradesEntryGrid / GradesToolbar components */
  className?: string;
  /** @deprecated Used by legacy GradesEntryGrid / GradesToolbar components */
  sectionName?: string | null;
  /** @deprecated Used by legacy GradesEntryGrid / GradesToolbar components */
  subjectName?: string;
}

export interface GradeStats {
  total: number;
  draft: number;
  confirmed: number;
  locked: number;
  avgPercentage: number;
  passCount: number;
  failCount: number;
}

export interface GradeEntryDraft {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  gradeTypeId: string | null;
  gradeTypeName: string;
  score: string;
  maxScore: string;
  note: string;
  sendNotification: boolean;
  /** Runtime state used by GradesEntryGrid rows */
  isSaving?: boolean;
  saveError?: string | null;
}
