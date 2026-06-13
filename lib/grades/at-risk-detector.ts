import "server-only";
import type { GradeEntry } from "./types";

export type RiskLevel = "watch" | "concern" | "critical";

export interface AtRiskStudent {
  studentId: string;
  studentName: string | null;
  subjectId: string;
  subjectName: string | null;
  className: string | null;
  sectionName: string | null;
  totalScore: number;
  passScore: number;
  deficit: number; // how many points below pass score
  riskLevel: RiskLevel;
}

export interface AtRiskReport {
  atRiskStudents: AtRiskStudent[];
  watchCount: number;
  concernCount: number;
  criticalCount: number;
  totalAtRisk: number;
}

function resolveRiskLevel(totalScore: number, passScore: number): RiskLevel {
  const deficit = passScore - totalScore;
  if (deficit >= 20) return "critical";
  if (deficit >= 10) return "concern";
  return "watch";
}

export function detectAtRiskStudents(
  entries: GradeEntry[],
  _scheme: { pass_score?: number } | null,
): AtRiskReport {
  const passScore = _scheme?.pass_score ?? 50;

  const atRiskStudents: AtRiskStudent[] = entries
    .filter((entry) => {
      const total = entry.percentage ?? 0;
      return total < passScore;
    })
    .map((entry) => {
      const total = entry.percentage ?? 0;
      const deficit = passScore - total;
      return {
        studentId: entry.student_id,
        studentName: entry.student_name ?? null,
        subjectId: entry.subject_id,
        subjectName: entry.subject_name ?? null,
        className: entry.class_name ?? null,
        sectionName: entry.section_name ?? null,
        totalScore: Math.round(total),
        passScore,
        deficit,
        riskLevel: resolveRiskLevel(total, passScore),
      };
    })
    .sort((a, b) => a.totalScore - b.totalScore); // lowest first

  const watchCount = atRiskStudents.filter((s) => s.riskLevel === "watch").length;
  const concernCount = atRiskStudents.filter((s) => s.riskLevel === "concern").length;
  const criticalCount = atRiskStudents.filter((s) => s.riskLevel === "critical").length;

  return {
    atRiskStudents,
    watchCount,
    concernCount,
    criticalCount,
    totalAtRisk: atRiskStudents.length,
  };
}

export function buildAtRiskSummaryAr(report: AtRiskReport): string {
  const { criticalCount, concernCount, watchCount } = report;
  const parts: string[] = [];
  if (criticalCount > 0) parts.push(`${criticalCount} طالب في خطر شديد (أقل من 30)`);
  if (concernCount > 0) parts.push(`${concernCount} طالب يحتاج متابعة (30-39)`);
  if (watchCount > 0) parts.push(`${watchCount} طالب تحت المراقبة (40-49)`);
  return parts.length > 0 ? parts.join("، ") : "لا يوجد طلاب معرضون للخطر";
}
