/**
 * Professional Import Engine for Student Excel Files
 *
 * Handles:
 * - Flexible column detection (multiple aliases per field)
 * - Automatic header row detection
 * - Text normalization (Arabic diacritics, spaces, numbers)
 * - Class/Section matching with context awareness
 * - Row-level error handling (partial import support)
 * - Full preview before import
 */

import { StudentImportRow, Class } from './import-types';

// ============================================================================
// TEXT NORMALIZATION
// ============================================================================

/**
 * Normalize Arabic text for comparison:
 * - Remove diacritics
 * - Normalize hamza variations
 * - Normalize alif variations
 * - Normalize ya/alif maksura
 * - Remove extra spaces
 * - Lowercase
 */
export function normalizeArabicText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove diacritics (fatH, damma, kasra, sukun, etc)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize hamza variations: أ إ آ ا → ا
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize ya/alif maksura: ى → ي
    .replace(/ى/g, 'ي')
    // Normalize te variations: ة → ه
    .replace(/ة/g, 'ه')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalize class name for flexible matching
 * Supports: "الاول"  "الأول" "الصف الاول" "Grade 1" "1"
 */
export function normalizeClassName(text: string): string {
  if (!text) return '';

  // Remove prefixes BEFORE normalization
  const withoutPrefix = text
    .replace(/^(الصف|الفئة|الدرجة|class|grade|level)\s+/i, '')
    .replace(/\s+(والنوع|والقسم|الاول|الثاني|الثالث)/g, '')
    .trim();

  // Then normalize
  const normalized = normalizeArabicText(withoutPrefix);
  return normalized || text.trim();
}


// ============================================================================
// COLUMN MAPPING & HEADER DETECTION
// ============================================================================

/**
 * Column aliases for flexible Excel column detection
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
  fullName: [
    'fullName', 'full_name', 'fullname',
    'الاسم الكامل', 'اسم الطالب', 'اسم التلميذ', 'الاسم',
    'student_name', 'student name', 'name', 'studentname',
    'الطالب', 'student'
  ],
  className: [
    'className', 'class_name', 'classname',
    'الصف', 'المرحلة', 'الصف الدراسي', 'الفئة',
    'class', 'grade', 'grade_name', 'gradename', 'level', 'class name'
  ],
  sectionName: [
    'sectionName', 'section_name', 'sectionname',
    'الشعبة', 'القسم', 'الفرع',
    'section', 'division', 'group', 'division_name', 'section name'
  ],
  phoneNumber: [
    'phoneNumber', 'phone_number', 'phonenumber',
    'رقم الهاتف', 'الهاتف', 'phone', 'phone number', 'mobile'
  ],
  dateOfBirth: [
    'dateOfBirth', 'date_of_birth', 'dob',
    'تاريخ الميلاد', 'تاريخ المولد', 'birth_date', 'birthdate', 'date of birth'
  ],
  gender: [
    'gender', 'الجنس', 'sex', 'جنس'
  ],
  address: [
    'address', 'العنوان', 'الموقع', 'location'
  ],
  parentName: [
    'parentName', 'parent_name', 'parentname',
    'اسم ولي الأمر', 'اسم الوالد', 'اسم الأب', 'ولي الأمر',
    'parent', 'parent_name_ar', 'father_name'
  ],
  parentPhone: [
    'parentPhone', 'parent_phone', 'parentphone',
    'رقم هاتف ولي الأمر', 'هاتف الوالد', 'هاتف الأب',
    'parent_phone_number', 'father_phone'
  ],
  notes: [
    'notes', 'ملاحظات', 'remarks', 'comments', 'notes'
  ],
};

/**
 * Find which column index matches a target field
 */
export function findColumnIndex(
  headers: string[],
  targetField: string
): number {
  const aliases = COLUMN_ALIASES[targetField as keyof typeof COLUMN_ALIASES] || [];

  for (let i = 0; i < headers.length; i++) {
    const headerNorm = normalizeArabicText(headers[i]).toLowerCase();
    if (aliases.some(alias => headerNorm === normalizeArabicText(alias).toLowerCase())) {
      return i;
    }
  }

  return -1;
}

/**
 * Detect header row from first 10 rows
 * Returns { headerRowIndex, detectedHeaders } or null if none found
 * Requires at least 2 of 3 required fields to be present
 */
export function detectHeaderRow(
  rows: Record<string, unknown>[]
): { headerRowIndex: number; detectedHeaders: string[] } | null {
  const requiredFields = ['fullName', 'className', 'sectionName'];
  let bestMatch = { index: -1, score: 0, headers: [] as string[], foundCount: 0 };

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || typeof row !== 'object') continue;

    const headers = Object.keys(row);
    if (headers.length === 0) continue;

    let matchScore = 0;
    let foundCount = 0;

    for (const field of requiredFields) {
      const idx = findColumnIndex(headers, field);
      if (idx >= 0) {
        matchScore += 2;
        foundCount++;
      }
    }

    // Must find at least 2 of 3 required fields
    if (foundCount < 2) continue;

    // Bonus if it's the first row with content
    if (i === 0) matchScore += 1;

    if (matchScore > bestMatch.score) {
      bestMatch = { index: i, score: matchScore, headers, foundCount };
    }
  }

  if (bestMatch.foundCount < 2) return null;

  return {
    headerRowIndex: bestMatch.index,
    detectedHeaders: bestMatch.headers,
  };
}

/**
 * Map raw Excel row to StudentImportRow based on detected headers
 */
export function mapExcelRow(
  row: Record<string, unknown>,
  headers: string[],
  rowIndex: number
): { mapped: StudentImportRow; errors: string[] } {
  const errors: string[] = [];
  const mapped: Partial<StudentImportRow> = {};

  // Map required fields
  const nameIdx = findColumnIndex(headers, 'fullName');
  if (nameIdx >= 0) {
    const headerKey = headers[nameIdx];
    mapped.fullName = String(row[headerKey] || '').trim();
  } else {
    errors.push('لم يتم العثور على عمود اسم الطالب');
  }

  const classIdx = findColumnIndex(headers, 'className');
  if (classIdx >= 0) {
    const headerKey = headers[classIdx];
    mapped.className = String(row[headerKey] || '').trim();
  } else {
    errors.push('لم يتم العثور على عمود الصف');
  }

  const sectionIdx = findColumnIndex(headers, 'sectionName');
  if (sectionIdx >= 0) {
    const headerKey = headers[sectionIdx];
    mapped.sectionName = String(row[headerKey] || '').trim();
  }
  // sectionName is optional - students are linked only to classes

  // Map optional fields
  const optionalFields = ['phoneNumber', 'dateOfBirth', 'gender', 'address', 'parentName', 'parentPhone', 'notes'];

  for (const field of optionalFields) {
    const idx = findColumnIndex(headers, field);
    if (idx >= 0) {
      const headerKey = headers[idx];
      const value = row[headerKey];
      if (value !== null && value !== undefined && String(value).trim()) {
        (mapped as any)[field] = String(value).trim();
      }
    }
  }

  return {
    mapped: mapped as StudentImportRow,
    errors,
  };
}

// ============================================================================
// CLASS MATCHING
// ============================================================================

/**
 * Match class with context awareness
 */
export function matchClass(
  className: string,
  availableClasses: Class[],
  schoolId: string,
  branchId: string
): Class | null {
  if (!className) return null;

  const normalized = normalizeClassName(className);

  // Filter by school/branch context
  const contextClasses = availableClasses.filter(
    c => c.schoolId === schoolId && c.branchId === branchId
  );

  // Try exact match on normalized names
  for (const cls of contextClasses) {
    if (normalizeClassName(cls.nameAr) === normalized ||
        normalizeClassName(cls.nameEn) === normalized) {
      return cls;
    }
  }

  // Try partial match
  for (const cls of contextClasses) {
    if (normalizeClassName(cls.nameAr).includes(normalized) ||
        normalizeClassName(cls.nameEn).includes(normalized)) {
      return cls;
    }
  }

  return null;
}


// ============================================================================
// IMPORT PREVIEW
// ============================================================================

export interface ImportPreview {
  totalRows: number;
  headerRowIndex: number;
  detectedHeaders: string[];
  columnMapping: Record<string, number>;
  validRows: StudentImportRow[];
  invalidRows: Array<{
    rowIndex: number;
    rawData: Record<string, unknown>;
    errors: string[];
  }>;
  matchedClasses: Map<string, string>; // className → classId
}

/**
 * Generate import preview (expensive operation)
 */
export function generateImportPreview(
  rows: Record<string, unknown>[],
  availableClasses: Class[],
  schoolId: string,
  branchId: string
): ImportPreview {
  const headerDetection = detectHeaderRow(rows);
  if (!headerDetection) {
    return {
      totalRows: rows.length,
      headerRowIndex: -1,
      detectedHeaders: [],
      columnMapping: {},
      validRows: [],
      invalidRows: rows.map((row, i) => ({
        rowIndex: i,
        rawData: row,
        errors: ['لم يتم اكتشاف رؤوس الأعمدة'],
      })),
      matchedClasses: new Map(),
    };
  }

  const { headerRowIndex, detectedHeaders } = headerDetection;
  const columnMapping: Record<string, number> = {};

  ['fullName', 'className'].forEach(field => {
    const idx = findColumnIndex(detectedHeaders, field);
    if (idx >= 0) columnMapping[field] = idx;
  });

  const validRows: StudentImportRow[] = [];
  const invalidRows: ImportPreview['invalidRows'] = [];
  const matchedClasses = new Map<string, string>();

  // Skip header row, process data rows with lenient validation
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const rawRow = rows[i];
    if (!rawRow || typeof rawRow !== 'object' || Object.keys(rawRow).length === 0) {
      continue; // Skip empty rows
    }

    const { mapped, errors } = mapExcelRow(rawRow as Record<string, unknown>, detectedHeaders, i + 1);

    // LENIENT: Accept rows even with mapping errors - try partial data
    let rowErrors = errors.length > 0 ? [...errors] : [];

    // If required fields missing, mark but still try to use what we have
    if (!mapped.fullName || !mapped.className) {
      if (!mapped.fullName) {
        mapped.fullName = `طالب ${i + 1}`;
        rowErrors.push('اسم الطالب مفقود - استخدام القيمة الافتراضية');
      }
      if (!mapped.className) {
        mapped.className = `صف ${i + 1}`;
        rowErrors.push('اسم الصف مفقود - استخدام القيمة الافتراضية');
      }
    }

    // Try to match class, but don't reject if not found
    const matchedClass = matchClass(mapped.className!, availableClasses, schoolId, branchId);
    if (matchedClass) {
      mapped.classId = matchedClass.id;
      matchedClasses.set(mapped.className!, matchedClass.id);

      // Validate section if provided, but accept anyway
      if (mapped.sectionName) {
        const sectionExists = matchedClass.sections.some(
          (s) => s.name.trim().toLowerCase() === mapped.sectionName!.trim().toLowerCase()
        );
        if (!sectionExists) {
          rowErrors.push(`⚠️ الشعبة "${mapped.sectionName}" غير موجودة في النظام`);
        }
      }
    } else {
      // Class not found but still accept the row
      rowErrors.push(`⚠️ الصف "${mapped.className}" غير موجود في هذا الفرع - سيتم استيراد بدون ربط الصف`);
    }

    // Add row to validRows regardless of errors (lenient import)
    validRows.push(mapped as StudentImportRow);

    // Also track in invalidRows for information but still importing
    if (rowErrors.length > 0) {
      invalidRows.push({
        rowIndex: i + 1,
        rawData: rawRow,
        errors: rowErrors,
      });
    }
  }

  return {
    totalRows: rows.length - headerRowIndex - 1,
    headerRowIndex,
    detectedHeaders,
    columnMapping,
    validRows,
    invalidRows,
    matchedClasses,
  };
}
