import ExcelJS from 'exceljs';
import { NextRequest, NextResponse } from 'next/server';
import { readStudentImportErrorMessage } from '@/lib/api/student-import';
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
    const actorContext = await resolveSchoolScopedActorContext(
      null,
      {
        allowedRoles: ['admin', 'super_admin'],
        roleDeniedMessage: 'استيراد الطلاب متاح لمدير المدرسة فقط.',
      },
      request.headers.get('authorization'),
    );

    if (!actorContext.ok) {
      return jsonError(actorContext.message, actorContext.status);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Import');

    // Define Columns
    worksheet.columns = [
      { header: 'الاسم الكامل*', key: 'fullName', width: 25 },
      { header: 'الصف*', key: 'className', width: 20 },
      { header: 'الشعبة*', key: 'sectionName', width: 10 },
      { header: 'رقم الهاتف', key: 'phoneNumber', width: 15 },
      { header: 'تاريخ الميلاد', key: 'dateOfBirth', width: 15 },
      { header: 'الجنس', key: 'gender', width: 10 },
      { header: 'العنوان', key: 'address', width: 30 },
      { header: 'اسم ولي الأمر', key: 'parentName', width: 25 },
      { header: 'رقم هاتف ولي الأمر', key: 'parentPhone', width: 15 },
      { header: 'ملاحظات', key: 'notes', width: 30 },
    ];

    // Add Instructions/Sample Data
    worksheet.addRow({
      fullName: 'محمد أحمد علي',
      className: 'الصف الأول',
      sectionName: 'أ',
      phoneNumber: '07701234567',
      dateOfBirth: '2015-01-15',
      gender: 'ذكر',
      address: 'بغداد - الكرادة',
      parentName: 'أحمد علي',
      parentPhone: '07801234567',
      notes: 'طالب متفوق',
    });

    worksheet.addRow({
      fullName: 'فاطمة حسن',
      className: 'الصف الثاني',
      sectionName: 'ب',
      gender: 'أنثى',
      address: 'بغداد - المنصور',
    });

    // Style the header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F8CFF' },
    };

    // Add a comment/note about mandatory fields
    worksheet.getCell('A1').note = 'الحقول التي تنتهي بعلامة * هي حقول إجبارية';

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
