import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel"];
const VALID_PLANS = ["basic", "premium", "enterprise"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// RFC 4180 CSV parsing
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export async function POST(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return jsonError("لا يوجد ملف", 400);
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return jsonError("نوع الملف غير مدعوم. استخدم CSV فقط.", 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(`حجم الملف كبير جداً. الحد الأقصى: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }

    const text = await file.text();
    const lines = text.trim().split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      return jsonError("الملف يجب أن يحتوي على رأس الجدول وبيانات", 400);
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const rowsToInsert: Array<{
      name: string;
      address: string | null;
      phone: string | null;
      owner_email: string | null;
      city: string | null;
      plan: "basic" | "premium" | "enterprise";
      is_active: boolean;
    }> = [];
    const errors: string[] = [];

    // Validate all rows first
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        // Validate required field: name
        if (!row.name || !row.name.trim()) {
          errors.push(`صف ${i + 1}: الاسم مطلوب`);
          continue;
        }

        // Validate email if provided
        const ownerEmail = row.owner_email?.trim();
        if (ownerEmail && !ownerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push(`صف ${i + 1}: بريد إلكتروني غير صحيح`);
          continue;
        }

        // Validate plan
        const plan = (row.plan || "basic").toLowerCase();
        if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
          errors.push(
            `صف ${i + 1}: خطة غير صحيحة. الخيارات: ${VALID_PLANS.join(", ")}`
          );
          continue;
        }

        // Validate status
        const status = (row.status || "active").toLowerCase();
        if (!["active", "inactive"].includes(status)) {
          errors.push(`صف ${i + 1}: حالة غير صحيحة. استخدم active أو inactive`);
          continue;
        }

        rowsToInsert.push({
          name: row.name.trim(),
          address: row.address?.trim() || null,
          phone: row.phone?.trim() || null,
          owner_email: ownerEmail || null,
          city: row.city?.trim() || null,
          plan: plan as "basic" | "premium" | "enterprise",
          is_active: status === "active",
        });
      } catch {
        errors.push(`صف ${i + 1}: خطأ في المعالجة`);
      }
    }

    if (rowsToInsert.length === 0) {
      return jsonError("لا توجد صفوف صحيحة في الملف", 400);
    }

    // Insert all validated rows in batch
    let successful = 0;
    let failed = 0;

    if (rowsToInsert.length > 0) {
      const { error } = await context.value.dataSupabase
        .from("schools")
        .insert(rowsToInsert);

      if (error) {
        return jsonError(`فشل إدراج البيانات: ${error.message}`, 400);
      }
      successful = rowsToInsert.length;
      failed = errors.length;
    }

    return NextResponse.json({ successful, failed, errors });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "خطأ في الخادم", 500);
  }
}
