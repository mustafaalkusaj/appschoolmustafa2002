import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileExams,
  resolveMobileRouteContext,
} from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toBaghdadTimestamp } from "@/lib/tz";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const result = await queryMobileExams(context.value, params);

    return NextResponse.json({
      ok: true,
      gate: result.gate,
      items: result.items,
      page: params.page,
      limit: params.limit,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const { serviceSupabase, schoolId, authUserId, account } = context.value;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-teacher-exam-create",
      windowMs: 60 * 60_000,
      maxHits: 30,
      identifier: authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as {
      title?: string;
      type?: string;
      subject?: string;
      class_name?: string;
      starts_at?: string;
      ends_at?: string;
      total_marks?: number;
      questions?: {
        prompt?: string;
        type?: string;
        difficulty?: string;
        options?: string[];
        answer?: string;
        marks?: number;
      }[];
    } | null;

    const title = body?.title?.trim();
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "عنوان الامتحان مطلوب.", field: "title" },
        { status: 400 },
      );
    }

    const subject = body?.subject?.trim() || "";
    const className = body?.class_name?.trim() || "";
    const normalize = (value: string | null | undefined) =>
      (value ?? "").trim().toLocaleLowerCase("ar-IQ");
    const assigned = account.teacher?.assignments.some(
      (assignment) =>
        assignment.is_active &&
        normalize(assignment.subject_name) === normalize(subject) &&
        normalize(assignment.class_name) === normalize(className),
    );
    if (!subject || !className || !assigned) {
      return NextResponse.json(
        { ok: false, error: "يجب اختيار مادة وصف مسندين لهذا المعلم." },
        { status: 403 },
      );
    }

    const startsAt = toBaghdadTimestamp(body?.starts_at);
    const endsAt = toBaghdadTimestamp(body?.ends_at);
    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      return NextResponse.json(
        { ok: false, error: "وقت انتهاء الامتحان يجب أن يكون بعد وقت البدء." },
        { status: 400 },
      );
    }

    const rawQuestions = body?.questions ?? [];
    if (rawQuestions.length > 100) {
      return NextResponse.json(
        { ok: false, error: "الحد الأقصى هو 100 سؤال." },
        { status: 400 },
      );
    }

    const questions = rawQuestions.map((question) => ({
      prompt: question.prompt?.trim() ?? "",
      type: question.type?.trim() || null,
      difficulty: question.difficulty?.trim() || null,
      options: Array.isArray(question.options)
        ? question.options
            .map((option) => option.trim())
            .filter(Boolean)
            .slice(0, 10)
        : null,
      answer: question.answer?.trim() || null,
      marks: typeof question.marks === "number" ? question.marks : 1,
    }));
    if (
      questions.some(
        (question) =>
          !question.prompt ||
          question.prompt.length > 2000 ||
          question.marks <= 0 ||
          question.marks > 1000,
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "تحقق من نصوص الأسئلة ودرجاتها." },
        { status: 400 },
      );
    }
    const computedTotal = questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );
    if (
      body?.total_marks != null &&
      questions.length > 0 &&
      body.total_marks !== computedTotal
    ) {
      return NextResponse.json(
        { ok: false, error: "الدرجة الكلية يجب أن تساوي مجموع درجات الأسئلة." },
        { status: 400 },
      );
    }

    const rpcClient = serviceSupabase as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: Record<string, unknown>[] | null;
        error: { message?: string } | null;
      }>;
    };
    const { data, error } = await rpcClient.rpc("create_exam_atomic", {
      p_school_id: schoolId,
      p_created_by: authUserId,
      p_title: title.slice(0, 200),
      p_type: body?.type?.trim().slice(0, 80) || null,
      p_subject: subject.slice(0, 120),
      p_class_name: className.slice(0, 120),
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_total_marks:
        questions.length > 0 ? computedTotal : (body?.total_marks ?? null),
      p_questions: questions,
    });

    if (error || !data?.[0]) {
      return NextResponse.json(
        { ok: false, error: "تعذر إنشاء الامتحان بشكل متكامل." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: data[0] }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}
