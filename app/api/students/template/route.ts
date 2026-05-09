import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';
import { readStudentImportErrorMessage } from '@/lib/api/student-import';
import { resolveBranchScope } from '@/lib/branch-scope';
import { resolveSchoolScopedActorContext } from '@/lib/managed-users/context';
import { enforceRateLimit } from '@/lib/rate-limit';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-import-template",
    windowMs: 60_000,
    maxHits: 20,
  });
  if (rateLimited) {
    return rateLimited;
  }

  try {
    const schoolId = request.nextUrl.searchParams.get('school') ?? request.nextUrl.searchParams.get('schoolId');

    const actorContext = await resolveSchoolScopedActorContext(
      schoolId,
      {
        allowedRoles: ['admin', 'super_admin'],
        roleDeniedMessage: 'استيراد الطلاب متاح لمدير المدرسة فقط.',
      },
      request.headers.get('authorization'),
    );

    if (!actorContext.ok) {
      return jsonError(actorContext.message, actorContext.status);
    }

    const requestedBranchId = request.nextUrl.searchParams.get('branchId') ?? request.nextUrl.searchParams.get('branch_id');
    const branchScope = resolveBranchScope(actorContext.value, requestedBranchId);

    // Fetch actual classes for the school
    const { actorSupabase, targetSchoolId } = actorContext.value;
    let classesQuery = actorSupabase
      .from('classes')
      .select('id, grade, section, branch_id')
      .eq('school_id', targetSchoolId)
      .order('grade', { ascending: true });

    if (branchScope.ok && branchScope.value.branchId) {
      classesQuery = classesQuery.eq('branch_id', branchScope.value.branchId);
    } else if (branchScope.ok && branchScope.value.branchIds.length > 0) {
      classesQuery = classesQuery.in('branch_id', branchScope.value.branchIds);
    }

    const { data: classesData } = await classesQuery;
    const classes = (classesData ?? []) as Array<{ id: string; grade?: string; section?: string; branch_id?: string }>;

    const workbook = new ExcelJS.Workbook();

    // ── Sheet 1: Import template ──────────────────────────────────────────────
    const worksheet = workbook.addWorksheet('Students Import');
    worksheet.views = [{ rightToLeft: true }];

    worksheet.columns = [
      { header: 'الاسم الكامل *', key: 'fullName', width: 28 },
      { header: 'الصف *', key: 'className', width: 20 },
      { header: 'الشعبة', key: 'sectionName', width: 12 },
      { header: 'رقم الهاتف', key: 'phoneNumber', width: 16 },
      { header: 'تاريخ الميلاد', key: 'dateOfBirth', width: 16 },
      { header: 'الجنس', key: 'gender', width: 10 },
      { header: 'العنوان', key: 'address', width: 32 },
      { header: 'اسم ولي الأمر', key: 'parentName', width: 26 },
      { header: 'رقم هاتف ولي الأمر', key: 'parentPhone', width: 20 },
      { header: 'ملاحظات', key: 'notes', width: 32 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.height = 22;

    worksheet.getCell('A1').note = 'الحقول المعلّمة بـ * إجبارية. الشعبة اختيارية.';

    // Example rows
    worksheet.addRow({
      fullName: 'محمد أحمد علي',
      className: classes[0]?.grade ?? 'الصف الأول',
      sectionName: 'أ',
      phoneNumber: '07701234567',
      dateOfBirth: '2015-01-15',
      gender: 'ذكر',
      address: 'بغداد - الكرادة',
      parentName: 'أحمد علي',
      parentPhone: '07801234567',
      notes: '',
    });

    worksheet.addRow({
      fullName: 'فاطمة حسن محمود',
      className: classes[1]?.grade ?? classes[0]?.grade ?? 'الصف الثاني',
      sectionName: 'ب',
      gender: 'أنثى',
    });

    // Style example rows
    [2, 3].forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
    });

    // ── Sheet 2: Available classes reference ──────────────────────────────────
    if (classes.length > 0) {
      const classSheet = workbook.addWorksheet('الصفوف المتاحة');
      classSheet.views = [{ rightToLeft: true }];

      classSheet.columns = [
        { header: 'اسم الصف', key: 'grade', width: 25 },
        { header: 'الشعبة', key: 'section', width: 15 },
      ];

      const classHeaderRow = classSheet.getRow(1);
      classHeaderRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      classHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
      classHeaderRow.height = 22;

      const addedGrades = new Set<string>();
      for (const cls of classes) {
        const grade = String(cls.grade ?? '').trim();
        if (!grade) continue;

        // Parse sections
        let sectionNames: string[] = [];
        if (cls.section) {
          try {
            const parsed = JSON.parse(cls.section);
            if (Array.isArray(parsed)) {
              sectionNames = parsed.map((s: { name?: string } | string) =>
                typeof s === 'object' ? String(s.name ?? '') : String(s)
              ).filter(Boolean);
            }
          } catch {
            sectionNames = cls.section.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        if (sectionNames.length > 0) {
          for (const sec of sectionNames) {
            classSheet.addRow({ grade, section: sec });
          }
        } else if (!addedGrades.has(grade)) {
          classSheet.addRow({ grade, section: '' });
          addedGrades.add(grade);
        }
      }

      // Also query sections table
      const classIds = classes.map(c => c.id).filter(Boolean);
      if (classIds.length > 0) {
        const { data: sectionsData } = await actorSupabase
          .from('sections')
          .select('name, class_id')
          .in('class_id', classIds);

        if (sectionsData && sectionsData.length > 0) {
          const classById = new Map(classes.map(c => [c.id, c]));
          // Add sections from sections table (may already be there from column — avoid duplicates)
          const existingRows = new Set<string>();
          classSheet.eachRow((row, rowNum) => {
            if (rowNum > 1) {
              existingRows.add(`${row.getCell(1).value}||${row.getCell(2).value}`);
            }
          });

          for (const sec of sectionsData as Array<{ name: string; class_id: string }>) {
            const cls = classById.get(sec.class_id);
            if (!cls) continue;
            const grade = String(cls.grade ?? '').trim();
            const key = `${grade}||${sec.name}`;
            if (!existingRows.has(key)) {
              classSheet.addRow({ grade, section: sec.name });
              existingRows.add(key);
            }
          }
        }
      }

      classSheet.addRow({});
      const noteRow = classSheet.addRow({ grade: '* انسخ اسم الصف كما هو بالضبط في ملف الاستيراد' });
      noteRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="students_import_template.xlsx"',
      },
    });

  } catch (error) {
    console.error('Template API error:', error);
    return jsonError(readStudentImportErrorMessage(error, 'Failed to generate template'), 500);
  }
}
