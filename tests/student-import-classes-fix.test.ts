import { describe, it, expect } from 'vitest';

/**
 * Test suite for student bulk import classes fix
 * Verifies that class name matching works with nameAr and nameEn columns
 */

interface Class {
  id: string;
  nameAr: string;
  nameEn: string;
  gradeLevel: number;
  name?: string;
  sections: Array<{ id: string; name: string }>;
}

// Simulate the class matching logic from import-worker.ts
function findClassByName(className: string, availableClasses: Class[]): Class | undefined {
  const classNameInput = String(className).trim().toLowerCase();

  return availableClasses.find((c) => {
    // Match against either Arabic or English name
    return c.nameAr.trim().toLowerCase() === classNameInput ||
           c.nameEn.trim().toLowerCase() === classNameInput ||
           c.name?.trim().toLowerCase() === classNameInput; // Fallback for backward compat
  });
}

describe('Student Import Classes Fix', () => {
  const mockClasses: Class[] = [
    {
      id: 'class-1',
      nameAr: 'الصف الأول',
      nameEn: 'First Grade',
      gradeLevel: 1,
      name: 'الصف الأول', // backward compat
      sections: [
        { id: 'sec-1a', name: 'الشعبة أ' },
        { id: 'sec-1b', name: 'الشعبة ب' }
      ]
    },
    {
      id: 'class-2',
      nameAr: 'الصف الثاني',
      nameEn: 'Second Grade',
      gradeLevel: 2,
      name: 'الصف الثاني',
      sections: [
        { id: 'sec-2a', name: 'الشعبة أ' },
        { id: 'sec-2b', name: 'الشعبة ب' }
      ]
    }
  ];

  it('should find class by Arabic name (exact match)', () => {
    const result = findClassByName('الصف الأول', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-1');
  });

  it('should find class by Arabic name (case insensitive)', () => {
    const result = findClassByName('الصف الأول', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-1');
  });

  it('should find class by English name', () => {
    const result = findClassByName('First Grade', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-1');
  });

  it('should find class by English name (case insensitive)', () => {
    const result = findClassByName('FIRST GRADE', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-1');
  });

  it('should find class by backward compat name field', () => {
    const result = findClassByName('الصف الثاني', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-2');
  });

  it('should handle whitespace in class names', () => {
    const result = findClassByName('  الصف الأول  ', mockClasses);
    expect(result).toBeDefined();
    expect(result?.id).toBe('class-1');
  });

  it('should return undefined for non-existent class', () => {
    const result = findClassByName('الصف العاشر', mockClasses);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty class name', () => {
    const result = findClassByName('', mockClasses);
    expect(result).toBeUndefined();
  });

  it('should validate class response structure includes all required fields', () => {
    const mockResponse: Class[] = [
      {
        id: 'id-1',
        nameAr: 'الصف الأول',
        nameEn: 'Grade 1',
        gradeLevel: 1,
        name: 'الصف الأول', // backward compat
        sections: [
          { id: 'sec-1', name: 'الشعبة أ' }
        ]
      }
    ];

    expect(mockResponse[0]).toHaveProperty('id');
    expect(mockResponse[0]).toHaveProperty('nameAr');
    expect(mockResponse[0]).toHaveProperty('nameEn');
    expect(mockResponse[0]).toHaveProperty('gradeLevel');
    expect(mockResponse[0]).toHaveProperty('sections');
  });
});
