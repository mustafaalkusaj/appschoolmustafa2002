import { StudentImportRow, ValidationError, Class } from './import-types';

export function isValidIraqiPhone(phone: string): boolean {
  // Iraqi phone number: 07xx xxx xxxx (11 digits)
  const cleaned = phone.trim().replace(/\s+/g, '');
  return /^07[3-9]\d{8}$/.test(cleaned);
}

export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function normalizeGender(gender: string): 'male' | 'female' | null {
  const g = gender.toLowerCase().trim();
  if (['male', 'ذكر', 'ولد'].includes(g)) return 'male';
  if (['female', 'أنثى', 'بنت'].includes(g)) return 'female';
  return null;
}

export function validateRow(
  row: StudentImportRow,
  rowIndex: number,
  availableClasses: Class[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Mandatory Fields Validation
  if (!row.fullName || row.fullName.trim().length < 3) {
    errors.push({
      row: rowIndex,
      field: 'fullName',
      error: 'الاسم الكامل مطلوب ويجب أن يكون 3 أحرف على الأقل',
      value: row.fullName,
      severity: 'error',
    });
  }

  if (!row.className || row.className.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'className',
      error: 'الصف مطلوب',
      value: row.className,
      severity: 'error',
    });
  } else {
    const classExists = availableClasses.find(
      (c) => {
        const classNameInput = row.className.trim().toLowerCase();
        // Match against either Arabic or English name
        return c.nameAr.trim().toLowerCase() === classNameInput ||
               c.nameEn.trim().toLowerCase() === classNameInput ||
               c.name?.trim().toLowerCase() === classNameInput; // Fallback for backward compat
      }
    );
    if (!classExists) {
      errors.push({
        row: rowIndex,
        field: 'className',
        error: 'الصف غير موجود في النظام',
        value: row.className,
        suggestion: `الصفوف المتاحة: ${availableClasses.map((c) => c.nameAr || c.name).join(', ')}`,
        severity: 'error',
      });
    } else {
      row.classId = classExists.id;
    }
  }

  if (!row.sectionName || row.sectionName.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'sectionName',
      error: 'الشعبة مطلوبة',
      value: row.sectionName,
      severity: 'error',
    });
  } else if (row.classId) {
    const classData = availableClasses.find((c) => c.id === row.classId);
    if (classData) {
      const sectionExists = classData.sections.find(
        (s) => s.name.trim().toLowerCase() === row.sectionName.trim().toLowerCase()
      );
      if (!sectionExists) {
        errors.push({
          row: rowIndex,
          field: 'sectionName',
          error: 'الشعبة غير موجودة للصف المحدد',
          value: row.sectionName,
          suggestion: `الشعب المتاحة للصف ${row.className}: ${classData.sections
            .map((s) => s.name)
            .join(', ')}`,
          severity: 'error',
        });
      } else {
        row.sectionId = sectionExists.id;
      }
    }
  }

  // 2. Optional Fields Validation (Only if provided)
  if (row.phoneNumber && String(row.phoneNumber).trim() !== '') {
    if (!isValidIraqiPhone(String(row.phoneNumber))) {
      errors.push({
        row: rowIndex,
        field: 'phoneNumber',
        error: 'رقم الهاتف غير صحيح - يجب أن يبدأ بـ 07 ويتكون من 11 رقم',
        value: row.phoneNumber,
        suggestion: 'مثال: 07701234567',
        severity: 'warning',
      });
    }
  }

  if (row.dateOfBirth && String(row.dateOfBirth).trim() !== '') {
    if (!isValidDate(String(row.dateOfBirth))) {
      errors.push({
        row: rowIndex,
        field: 'dateOfBirth',
        error: 'تاريخ الميلاد غير صحيح',
        value: row.dateOfBirth,
        suggestion: 'استخدم تنسيق: YYYY-MM-DD أو DD/MM/YYYY',
        severity: 'warning',
      });
    }
  }

  if (row.gender && String(row.gender).trim() !== '') {
    if (!normalizeGender(String(row.gender))) {
      errors.push({
        row: rowIndex,
        field: 'gender',
        error: 'الجنس غير صحيح',
        value: row.gender,
        suggestion: 'استخدم: ذكر أو أنثى (أو male/female بالإنجليزي)',
        severity: 'warning',
      });
    }
  }

  if (row.parentPhone && String(row.parentPhone).trim() !== '') {
    if (!isValidIraqiPhone(String(row.parentPhone))) {
      errors.push({
        row: rowIndex,
        field: 'parentPhone',
        error: 'رقم هاتف ولي الأمر غير صحيح',
        value: row.parentPhone,
        suggestion: 'مثال: 07701234567',
        severity: 'warning',
      });
    }
  }

  return errors;
}
