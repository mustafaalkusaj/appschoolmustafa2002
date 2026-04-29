import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeArabicText,
  normalizeClassName,
  findColumnIndex,
  detectHeaderRow,
  mapExcelRow,
  matchClass,
  generateImportPreview,
  COLUMN_ALIASES,
} from '@/lib/students/import-engine';
import { Class } from '@/lib/students/import-types';

// ============================================================================
// TEST DATA
// ============================================================================

const mockSchoolId = 'school-1';
const mockBranchId = 'branch-a';
const mockAcademicYearId = 'year-2026';

const mockClasses: Class[] = [
  {
    id: 'class-1',
    schoolId: mockSchoolId,
    branchId: mockBranchId,
    academicYearId: mockAcademicYearId,
    nameAr: 'الصف الأول متوسط',
    nameEn: 'First Grade Intermediate',
    gradeLevel: 7,
    name: 'الصف الأول متوسط',
    sections: [
      { id: 'section-1a', name: 'أ' },
      { id: 'section-1b', name: 'ب' },
      { id: 'section-1c', name: 'ج' },
    ],
  },
  {
    id: 'class-2',
    schoolId: mockSchoolId,
    branchId: mockBranchId,
    academicYearId: mockAcademicYearId,
    nameAr: 'الصف الثاني متوسط',
    nameEn: 'Second Grade Intermediate',
    gradeLevel: 8,
    name: 'الصف الثاني متوسط',
    sections: [
      { id: 'section-2a', name: 'أ' },
      { id: 'section-2b', name: 'ب' },
    ],
  },
];

// ============================================================================
// TEXT NORMALIZATION TESTS
// ============================================================================

describe('normalizeArabicText', () => {
  it('removes diacritics', () => {
    expect(normalizeArabicText('أَحْمَد')).toBe('احمد');
    expect(normalizeArabicText('مُحَمَّد')).toBe('محمد');
  });

  it('normalizes hamza variations', () => {
    expect(normalizeArabicText('أحمد')).toBe('احمد');
    expect(normalizeArabicText('إحسان')).toBe('احسان');
    expect(normalizeArabicText('آمن')).toBe('امن');
  });

  it('normalizes ya and alif maksura', () => {
    expect(normalizeArabicText('موسى')).toBe('موسي');
    expect(normalizeArabicText('يحيى')).toBe('يحيي');
  });

  it('removes extra spaces', () => {
    expect(normalizeArabicText('أحمد    علي')).toBe('احمد علي');
    expect(normalizeArabicText('  محمد  ')).toBe('محمد');
  });

  it('handles empty/null input', () => {
    expect(normalizeArabicText('')).toBe('');
    expect(normalizeArabicText('   ')).toBe('');
  });
});

describe('normalizeClassName', () => {
  it('removes grade prefix words', () => {
    expect(normalizeClassName('الصف الأول')).toBe('الاول');
    expect(normalizeClassName('الفئة الثانية')).toBe('الثانيه');
    expect(normalizeClassName('class 1')).toBe('1');
    expect(normalizeClassName('grade first')).toBe('first');
  });

  it('normalizes variations', () => {
    expect(normalizeClassName('الأول')).toBe('الاول');
    expect(normalizeClassName('الاول')).toBe('الاول');
    expect(normalizeClassName('الصف الأول متوسط')).toBe('الاول متوسط');
  });

  it('handles teh normalization (ة -> ه)', () => {
    expect(normalizeClassName('الفئة الثانية')).toBe('الثانيه');
  });

  it('handles pure class names', () => {
    expect(normalizeClassName('متوسط')).toBe('متوسط');
    expect(normalizeClassName('Intermediate')).toBe('intermediate');
  });
});

// ============================================================================
// COLUMN DETECTION TESTS
// ============================================================================

describe('findColumnIndex', () => {
  const headers = ['الاسم الكامل', 'الصف', 'الشعبة', 'رقم الهاتف'];

  it('finds Arabic columns', () => {
    expect(findColumnIndex(headers, 'fullName')).toBe(0);
    expect(findColumnIndex(headers, 'className')).toBe(1);
    expect(findColumnIndex(headers, 'sectionName')).toBe(2);
    expect(findColumnIndex(headers, 'phoneNumber')).toBe(3);
  });

  it('finds with different aliases', () => {
    const headers2 = ['اسم الطالب', 'class', 'section'];
    expect(findColumnIndex(headers2, 'fullName')).toBe(0);
    expect(findColumnIndex(headers2, 'className')).toBe(1);
    expect(findColumnIndex(headers2, 'sectionName')).toBe(2);
  });

  it('finds English columns', () => {
    const headers3 = ['full_name', 'grade', 'division', 'phone_number'];
    expect(findColumnIndex(headers3, 'fullName')).toBe(0);
    expect(findColumnIndex(headers3, 'className')).toBe(1);
    expect(findColumnIndex(headers3, 'sectionName')).toBe(2);
    expect(findColumnIndex(headers3, 'phoneNumber')).toBe(3);
  });

  it('returns -1 for missing columns', () => {
    expect(findColumnIndex(headers, 'unknownField')).toBe(-1);
    expect(findColumnIndex([], 'fullName')).toBe(-1);
  });

  it('handles case insensitivity', () => {
    const headers4 = ['FULL_NAME', 'CLASS', 'SECTION'];
    expect(findColumnIndex(headers4, 'fullName')).toBe(0);
  });

  it('handles extra spaces', () => {
    const headers5 = ['  الاسم الكامل  ', '  الصف  '];
    expect(findColumnIndex(headers5, 'fullName')).toBe(0);
    expect(findColumnIndex(headers5, 'className')).toBe(1);
  });
});

// ============================================================================
// HEADER DETECTION TESTS
// ============================================================================

describe('detectHeaderRow', () => {
  it('detects headers in first row', () => {
    const rows = [
      { 'الاسم الكامل': 'أحمد علي', 'الصف': 'الأول', 'الشعبة': 'أ' },
      { 'الاسم الكامل': 'محمد إبراهيم', 'الصف': 'الأول', 'الشعبة': 'ب' },
    ];
    const result = detectHeaderRow(rows);
    expect(result).not.toBeNull();
    expect(result?.headerRowIndex).toBe(0);
  });

  it('detects headers starting from row 3', () => {
    const rows = [
      { col1: 'Title', col2: 'Subtitle' },
      { col1: 'blank' },
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول', 'الشعبة': 'أ' },
      { 'الاسم الكامل': 'محمد', 'الصف': 'الثاني', 'الشعبة': 'ب' },
    ];
    const result = detectHeaderRow(rows);
    expect(result?.headerRowIndex).toBe(2);
  });

  it('detects headers with English columns', () => {
    const rows = [
      { 'student name': 'Ahmed', 'class': 'Grade 1', 'section': 'A' },
      { 'student name': 'Mohammed', 'class': 'Grade 1', 'section': 'B' },
    ];
    const result = detectHeaderRow(rows);
    expect(result?.headerRowIndex).toBe(0);
  });

  it('returns null when no clear headers found', () => {
    const rows = [
      { notAHeader: 'val1', randomCol: 'val2', someData: 'val3' },
      { notAHeader: 'val4', randomCol: 'val5', someData: 'val6' },
    ];
    const result = detectHeaderRow(rows);
    expect(result).toBeNull();
  });

  it('handles empty rows', () => {
    const rows: Record<string, unknown>[] = [
      {},
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول', 'الشعبة': 'أ' },
      { 'الاسم الكامل': 'محمد', 'الصف': 'الثاني', 'الشعبة': 'ب' },
    ];
    const result = detectHeaderRow(rows);
    expect(result?.headerRowIndex).toBe(1);
  });

  it('checks only first 10 rows', () => {
    const rows: Record<string, unknown>[] = Array(15).fill(null).map((_, i) => ({
      notAHeader: `val${i}`,
      randomData: `val${i}`,
    }));
    rows[11] = { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول', 'الشعبة': 'أ' };

    const result = detectHeaderRow(rows);
    expect(result).toBeNull(); // Should not find row 11 since it's beyond first 10
  });
});

// ============================================================================
// ROW MAPPING TESTS
// ============================================================================

describe('mapExcelRow', () => {
  const headers = ['الاسم الكامل', 'الصف', 'الشعبة', 'رقم الهاتف'];

  it('maps required fields', () => {
    const row = {
      'الاسم الكامل': 'أحمد علي',
      'الصف': 'الأول',
      'الشعبة': 'أ',
    };
    const { mapped, errors } = mapExcelRow(row, headers, 2);
    expect(mapped.fullName).toBe('أحمد علي');
    expect(mapped.className).toBe('الأول');
    expect(mapped.sectionName).toBe('أ');
    expect(errors.length).toBe(0);
  });

  it('maps optional fields', () => {
    const row = {
      'الاسم الكامل': 'محمد',
      'الصف': 'الثاني',
      'الشعبة': 'ب',
      'رقم الهاتف': '07901234567',
    };
    const { mapped, errors } = mapExcelRow(row, headers, 3);
    expect(mapped.phoneNumber).toBe('07901234567');
    expect(errors.length).toBe(0);
  });

  it('reports missing name column', () => {
    const row = { 'الصف': 'الأول', 'الشعبة': 'أ' };
    const headers2 = ['الصف', 'الشعبة'];
    const { errors } = mapExcelRow(row, headers2, 2);
    expect(errors.some(e => e.includes('اسم الطالب'))).toBe(true);
  });

  it('handles missing optional fields gracefully', () => {
    const row = {
      'الاسم الكامل': 'أحمد',
      'الصف': 'الأول',
      'الشعبة': 'أ',
    };
    const { mapped } = mapExcelRow(row, headers, 2);
    expect(mapped.phoneNumber).toBeUndefined();
  });

  it('trims whitespace', () => {
    const row = {
      'الاسم الكامل': '  أحمد علي  ',
      'الصف': '  الأول  ',
      'الشعبة': '  أ  ',
    };
    const { mapped } = mapExcelRow(row, headers, 2);
    expect(mapped.fullName).toBe('أحمد علي');
    expect(mapped.className).toBe('الأول');
    expect(mapped.sectionName).toBe('أ');
  });
});

// ============================================================================
// CLASS MATCHING TESTS
// ============================================================================

describe('matchClass', () => {
  it('matches by Arabic name', () => {
    const matched = matchClass('الأول متوسط', mockClasses, mockSchoolId, mockBranchId);
    expect(matched?.id).toBe('class-1');
  });

  it('matches by English name', () => {
    const matched = matchClass('First Grade Intermediate', mockClasses, mockSchoolId, mockBranchId);
    expect(matched?.id).toBe('class-1');
  });

  it('matches with normalized Arabic', () => {
    const matched = matchClass('الاول متوسط', mockClasses, mockSchoolId, mockBranchId);
    expect(matched?.id).toBe('class-1');
  });

  it('matches with normalized hamza', () => {
    const matched = matchClass('الأول متوسط', mockClasses, mockSchoolId, mockBranchId);
    expect(matched?.id).toBe('class-1');
  });

  it('respects school scope', () => {
    const wrongSchool = matchClass('الأول متوسط', mockClasses, 'school-2', mockBranchId);
    expect(wrongSchool).toBeNull();
  });

  it('respects branch scope', () => {
    const wrongBranch = matchClass('الأول متوسط', mockClasses, mockSchoolId, 'branch-b');
    expect(wrongBranch).toBeNull();
  });

  it('returns null for non-existent class', () => {
    const matched = matchClass('الصف العاشر', mockClasses, mockSchoolId, mockBranchId);
    expect(matched).toBeNull();
  });

  it('returns null for empty name', () => {
    const matched = matchClass('', mockClasses, mockSchoolId, mockBranchId);
    expect(matched).toBeNull();
  });

  it('handles partial matches', () => {
    const matched = matchClass('أول متوسط', mockClasses, mockSchoolId, mockBranchId);
    expect(matched?.id).toBe('class-1');
  });
});

// ============================================================================
// PREVIEW GENERATION TESTS
// ============================================================================

describe('generateImportPreview', () => {
  it('generates preview with all valid rows (header + data)', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'أحمد علي', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' }, // Header row
      { 'الاسم الكامل': 'محمد إبراهيم', 'الصف': 'الأول متوسط', 'الشعبة': 'ب' }, // Data row 1
      { 'الاسم الكامل': 'علي حسن', 'الصف': 'الأول متوسط', 'الشعبة': 'ج' }, // Data row 2
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(2);
    expect(preview.invalidRows.length).toBe(0);
    expect(preview.validRows[0].classId).toBe('class-1');
  });

  it('handles partial valid/invalid rows', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' }, // Valid
      { 'الاسم الكامل': 'محمد', 'الصف': 'الصف الخامس', 'الشعبة': 'أ' }, // Invalid class
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(1);
    expect(preview.invalidRows.length).toBe(1);
  });

  it('detects headers correctly', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' }, // Header
      { 'الاسم الكامل': 'محمد', 'الصف': 'الأول متوسط', 'الشعبة': 'ب' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.headerRowIndex).toBe(0);
    expect(preview.detectedHeaders.length).toBeGreaterThan(0);
  });

  it('skips empty rows', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' },
      {}, // Empty row
      { 'الاسم الكامل': 'محمد', 'الصف': 'الثاني متوسط', 'الشعبة': 'ب' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(2);
  });

  it('provides detailed error messages', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'INVALID', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toMatch(/غير موجود/);
  });

  it('tracks matched classes', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.matchedClasses.has('الأول متوسط')).toBe(true);
    expect(preview.matchedClasses.get('الأول متوسط')).toBe('class-1');
  });

  it('handles 100+ rows', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      ...Array(150).fill(null).map((_, i) => ({
        'الاسم الكامل': `الطالب ${i}`,
        'الصف': i % 2 === 0 ? 'الأول متوسط' : 'الثاني متوسط',
        'الشعبة': i % 3 === 0 ? 'أ' : (i % 3 === 1 ? 'ب' : 'أ'),
      })),
    ];

    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);
    expect(preview.validRows.length).toBeGreaterThan(140);
  });
});

// ============================================================================
// STRICT VALIDATION TESTS (Required Fields)
// ============================================================================

describe('generateImportPreview - Strict Validation', () => {
  it('rejects rows with missing student name', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': '', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(0);
    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toContain('اسم الطالب مطلوب');
  });

  it('rejects rows with missing class', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': '', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(0);
    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toContain('الصف مطلوب');
  });

  it('rejects rows with unmatched class', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الصف العاشر', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(0);
    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toContain('غير موجود في هذا الفرع');
  });

  it('rejects rows with missing section', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': '' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(0);
    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toContain('الشعبة مطلوبة');
  });

  it('rejects rows with invalid section in matched class', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'د' }, // Section د doesn't exist
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(0);
    expect(preview.invalidRows.length).toBe(1);
    expect(preview.invalidRows[0].errors[0]).toContain('الشعبة غير موجودة داخل الصف');
  });

  it('accepts rows with valid name, class, and section', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد علي', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' },
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(1);
    expect(preview.invalidRows.length).toBe(0);
    expect(preview.validRows[0].fullName).toBe('أحمد علي');
    expect(preview.validRows[0].classId).toBe('class-1');
  });

  it('handles mixed valid and invalid rows', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ' }, // Valid
      { 'الاسم الكامل': '', 'الصف': 'الأول متوسط', 'الشعبة': 'ب' }, // Missing name
      { 'الاسم الكامل': 'محمد', 'الصف': 'الثاني متوسط', 'الشعبة': 'أ' }, // Valid
      { 'الاسم الكامل': 'علي', 'الصف': 'الصف الخامس', 'الشعبة': 'ب' }, // Unmatched class
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(2);
    expect(preview.invalidRows.length).toBe(2);
  });

  it('allows optional fields to be empty (phone, parentName, dateOfBirth)', () => {
    const rows: Record<string, unknown>[] = [
      { 'الاسم الكامل': 'اسم الطالب', 'الصف': 'الصف', 'الشعبة': 'الشعبة', 'الهاتف': 'هاتف' }, // Header
      { 'الاسم الكامل': 'أحمد', 'الصف': 'الأول متوسط', 'الشعبة': 'أ', 'الهاتف': '' }, // Empty optional field
    ];
    const preview = generateImportPreview(rows, mockClasses, mockSchoolId, mockBranchId);

    expect(preview.validRows.length).toBe(1);
    expect(preview.invalidRows.length).toBe(0);
  });
});
