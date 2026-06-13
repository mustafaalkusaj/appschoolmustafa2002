export interface RequiredStudentFields {
  fullName: string;
  className: string;
  sectionName: string;
}

export interface OptionalStudentFields {
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: 'male' | 'female' | null;
  address?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  notes?: string | null;
}

export interface StudentImportRow extends RequiredStudentFields, OptionalStudentFields {
  classId?: string;
  [key: string]: string | number | boolean | null | undefined; // Better than any
}

export interface ValidationError {
  row: number;
  field: string;
  value: string | number | boolean | null | undefined; // Better than any
  error: string;
  suggestion?: string;
  severity: 'error' | 'warning';
}

export interface RowLevelDebugInfo {
  rowNumber: number;
  fullName: string | null;
  rawClassName: string | null;
  normalizedClassName: string | null;
  matchedClassId: string | null;
  failureReason: string;
}

export interface Class {
  id: string;
  nameAr: string;
  nameEn: string;
  gradeLevel: number;
  schoolId: string;
  branchId: string;
  academicYearId?: string;
  name?: string; // Backward compatibility
  sectionsCount?: number;
  sections: {
    id: string;
    name: string;
  }[];
}

export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  estimatedTimeRemaining: number; // in seconds
  status: 'idle' | 'parsing' | 'validating' | 'importing' | 'completed' | 'cancelled' | 'failed';
  errors: ValidationError[];
}

export const IMPORT_COLUMN_MAPPING: Record<string, string[]> = {
  fullName: ['fullName', 'full_name', 'الاسم الكامل', 'اسم الطالب', 'الاسم', 'Name', 'Full Name'],
  className: ['className', 'class_name', 'الصف', 'Class'],
  sectionName: ['sectionName', 'section', 'الشعبة', 'Section'],
  phoneNumber: ['phoneNumber', 'phone_number', 'رقم الهاتف', 'الهاتف', 'Phone', 'Phone Number'],
  dateOfBirth: ['dateOfBirth', 'date_of_birth', 'تاريخ الميلاد', 'Birth Date', 'DOB'],
  gender: ['gender', 'الجنس', 'Gender'],
  address: ['address', 'العنوان', 'Address'],
  parentName: ['parentName', 'parent_name', 'اسم ولي الأمر', 'Parent Name'],
  parentPhone: ['parentPhone', 'parent_phone_number', 'رقم هاتف ولي الأمر', 'Parent Phone'],
  notes: ['notes', 'ملاحظات', 'Notes'],
};
