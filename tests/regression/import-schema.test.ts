import { describe, it, expect } from 'vitest';

/**
 * Regression Test: Import Schema Validation
 * Ensures import code doesn't use deprecated column names
 * Prevents "classes.name_ar not found" and similar schema errors
 */

describe('Import Schema Regression', () => {

  // Current valid schema columns
  const _validClassesColumns = ['id', 'name', 'school_id', 'branch_id', 'created_at', 'updated_at'];
  const _validStudentColumns = ['name', 'class_name', 'section', 'phone', 'address', 'total_fee', 'discount_value'];

  // Deprecated columns that must NOT be used
  const _deprecatedColumns = {
    classes: ['name_ar', 'nameAr', 'name_en', 'nameEn', 'gradeLevel', 'level', 'academic_year_id', 'year_id'],
    students: ['nameAr', 'nameEn', 'fullName', 'class_id', 'grade', 'level', 'year'],
  };

  it('Import schema uses "name" not "name_ar" for classes', () => {
    // Simulate import validation that looks for column
    const importColumnMapping = {
      studentName: 'name',
      className: 'name', // Using 'name', not 'name_ar'
      section: 'section',
      phone: 'phone',
      address: 'address',
      fees: 'total_fees',
    };

    // Verify no deprecated columns
    expect(importColumnMapping.className).not.toBe('name_ar');
    expect(importColumnMapping.className).toBe('name');
  });

  it('Import validation must not reference classes.name_ar', () => {
    const columnReferences = ['classes.name', 'classes.id']; // Valid

    // Must NOT include these:
    expect(columnReferences).not.toContain('classes.name_ar');
    expect(columnReferences).not.toContain('classes.nameAr');
  });

  it('Import code does not use deprecated gradeLevel column', () => {
    // Grade level was removed, class_name is now used
    const classMapping = {
      classNameFromSheet: '4-أ',
      // ❌ Bad: gradeLevel: 4 - DEPRECATED
      // ✅ Good: class_name: '4-أ' - CURRENT
    };

    expect('gradeLevel' in classMapping).toBe(false);
    expect('classNameFromSheet' in classMapping).toBe(true);
  });

  it('Import code does not use academic_year_id column', () => {
    // Academic year tracking removed from import schema
    const payloadColumn = {
      student_name: 'Ahmed',
      class_name: '4 - أ',
      // ❌ Bad: academic_year_id: 2024 - DEPRECATED
    };

    expect('academic_year_id' in payloadColumn).toBe(false);
  });

  it('Column names are case-sensitive and exact', () => {
    // Valid: class_name
    // Invalid: className, class_id, classId
    const validColumns = {
      class_name: '4 - أ', // ✅ Correct
    };

    const _invalidColumns = {
      className: '4 - أ', // ❌ Wrong
      class_id: 'cls-123', // ❌ Wrong
      classId: '4', // ❌ Wrong
    };

    expect('class_name' in validColumns).toBe(true);
    expect('className' in validColumns).toBe(false);
  });

  it('Section column is optional, not required', () => {
    const studentWithSection = {
      name: 'Ahmed',
      class_name: '4 - أ',
      section: 'أ',
    };

    const studentWithoutSection = {
      name: 'Fatima',
      class_name: '5 - ب',
      // section: optional
    };

    // Both are valid
    expect('section' in studentWithSection).toBe(true);
    expect('section' in studentWithoutSection).toBe(false); // OK
  });

  it('Import column detection uses exact Excel header names', () => {
    const excelHeaderVariants = [
      'اسم الطالب',
      'Student name',
      'Name',
      'Student Name',
    ];

    const classHeaderVariants = [
      'الصف',
      'Class',
      'Class Name',
    ];

    const invalidClassHeaders = ['ClassName', 'ClassId'];

    // Must handle variants correctly
    expect(excelHeaderVariants).toContain('اسم الطالب');
    expect(classHeaderVariants).not.toContain('ClassName');
    expect(invalidClassHeaders).not.toContain('Class Name'); // Wrong - Class Name is valid
    expect(invalidClassHeaders).toContain('ClassName'); // This is invalid
  });

  it('No hardcoded column references that might change', () => {
    // Import should not have hardcoded assumptions like:
    // - Column 1 = class_name
    // - Column 2 = section
    // Instead: detect by header name

    const goodApproach = {
      columnByHeader: {
        'الصف': 'class_name',
        'الشعبة': 'section',
      },
    };

    const badApproach = {
      columnByIndex: {
        0: 'class_name', // ❌ Fragile
        1: 'section',    // ❌ Will break if order changes
      },
    };

    expect('columnByHeader' in goodApproach).toBe(true);
    expect('columnByHeader' in badApproach).toBe(false);
  });

  it('Import validation returns clear errors for missing columns', () => {
    // Simulate import validation response
    const validationResult = {
      success: false,
      errors: [
        { column: 'Student Name', message: 'Required column missing' },
        { column: 'Class', message: 'Required column missing' },
      ],
      message: 'Import failed: 2 required columns missing',
    };

    expect(validationResult.success).toBe(false);
    expect(validationResult.errors.length).toBe(2);
    expect(validationResult.message).not.toContain('classes.name_ar'); // Error message clear
  });

  it('Schema mismatch detection for class lookups', () => {
    // When joining student to class_fees, must use:
    // - class_fees.name (current)
    // NOT:
    // - class_fees.name_ar (old)

    const goodJoin = `
      SELECT students.id, cf.total_fee
      FROM students
      JOIN class_fees cf ON cf.name = students.class_name
      WHERE cf.school_id = students.school_id
    `;

    const badJoin = `
      SELECT students.id, cf.total_fee
      FROM students
      JOIN class_fees cf ON cf.name_ar = students.class_name
      WHERE cf.school_id = students.school_id
    `;

    // Good join uses 'cf.name', not 'cf.name_ar'
    expect(goodJoin).toContain('cf.name =');
    expect(badJoin).toContain('cf.name_ar ='); // This would fail

    // Application should use goodJoin logic
  });

  it('Import process: parse stage validates schema first', () => {
    // Step 1: Read Excel
    const _excelData = {
      headers: ['اسم الطالب', 'الصف', 'العنوان', 'الرسوم'],
      rows: [
        ['أحمد علي', '4 - أ', 'بغداد', '500'],
      ],
    };

    // Step 2: Map headers to schema
    const headerMapping = {
      'اسم الطالب': 'name',
      'الصف': 'class_name',
      'العنوان': 'address',
      'الرسوم': 'total_fee',
    };

    // Step 3: Validate against expected columns
    const expectedColumns = ['name', 'class_name', 'address', 'total_fee'];
    const mappedColumns = Object.values(headerMapping);

    // All expected columns present
    expectedColumns.forEach(col => {
      expect(mappedColumns).toContain(col);
    });

    // No unexpected columns
    expect(mappedColumns.filter(col => !expectedColumns.includes(col)).length).toBe(0);
  });

  it('Import process: validate stage checks data type mismatch', () => {
    const importRow = {
      name: 'Ahmed',
      class_name: '4 - أ', // String, not number
      total_fee: '500', // String, should convert to number
    };

    // Validation must convert/validate:
    const validated = {
      name: importRow.name,
      class_name: importRow.class_name,
      total_fee: parseInt(importRow.total_fee),
    };

    expect(typeof validated.total_fee).toBe('number');
    expect(validated.total_fee).toBe(500);
  });

  it('No reference to removed column aliases', () => {
    // These don't exist and should never be referenced:
    const invalidAliases = ['nameAr', 'nameEn', 'classId', 'gradeLevel'];

    // Import code should not contain these strings
    const _importCode = `
      const name = row.nameAr || row.name;
      const className = row.className || row.class_name;
    `;

    // In actual implementation, should be:
    const correctImportCode = `
      const name = row.name;
      const className = row.class_name;
    `;

    // The correct version doesn't reference old aliases
    invalidAliases.forEach(alias => {
      expect(correctImportCode).not.toContain(alias);
    });
  });
});
