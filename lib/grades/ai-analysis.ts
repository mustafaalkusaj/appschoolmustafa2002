import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { SubjectAnalytics } from "@/app/[locale]/grades/dashboard/_hooks/useGradeAnalytics";
import type { AtRiskReport } from "./at-risk-detector";

const client = new Anthropic();

export interface GradeAnalysisContext {
  academicYear: string;
  semester: 1 | 2;
  className?: string;
  subjectAnalytics: SubjectAnalytics[];
  atRiskReport: AtRiskReport;
  totalStudents: number;
  overallAvg: number;
  passRate: number;
}

export function buildGradeAnalysisPrompt(ctx: GradeAnalysisContext): string {
  const semesterLabel = ctx.semester === 1 ? "الأول" : "الثاني";
  const classLabel = ctx.className ? `صف: ${ctx.className}` : "جميع الصفوف";

  const subjectLines = ctx.subjectAnalytics
    .map(
      (s) =>
        `- ${s.subjectName}: متوسط ${s.avgScore.toFixed(1)}/100، نسبة نجاح ${s.passRate}%، راسب ${s.failingCount} طالب`,
    )
    .join("\n");

  return `أنت مستشار تربوي خبير. حلّل بيانات الدرجات التالية وقدم تقريراً مختصراً وعملياً باللغة العربية.

## بيانات الفصل الدراسي ${semesterLabel} — ${ctx.academicYear}
${classLabel}
- إجمالي الطلاب: ${ctx.totalStudents}
- المتوسط العام: ${ctx.overallAvg.toFixed(1)}/100
- نسبة النجاح الإجمالية: ${ctx.passRate}%
- الطلاب في خطر: ${ctx.atRiskReport.totalAtRisk} (حرج: ${ctx.atRiskReport.criticalCount}، قلق: ${ctx.atRiskReport.concernCount}، مراقبة: ${ctx.atRiskReport.watchCount})

## أداء المواد:
${subjectLines}

## المطلوب:
قدم تقريراً منظماً بثلاثة أقسام واضحة:

**1. ملاحظات عامة** (2-3 جمل): ما أبرز ما تلاحظه في الأداء العام؟

**2. نقاط الضعف** (2-3 نقاط): ما المواد أو الأنماط التي تستدعي الاهتمام؟

**3. توصيات عملية** (3 توصيات محددة وقابلة للتطبيق فوراً للمعلمين والإدارة)

كن موضوعياً ومحدداً. لا تستخدم الأسماء. ركز على الأرقام والأنماط.`;
}

export async function streamGradeAnalysis(
  ctx: GradeAnalysisContext,
): Promise<ReadableStream<Uint8Array>> {
  const prompt = buildGradeAnalysisPrompt(ctx);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      stream.abort();
    },
  });
}

export async function analyzeGradesNonStreaming(
  ctx: GradeAnalysisContext,
): Promise<string> {
  const prompt = buildGradeAnalysisPrompt(ctx);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}
