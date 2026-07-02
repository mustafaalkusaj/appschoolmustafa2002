export function computeGradeLabel(_score: number, _maxScore: number): string {
  return "";
}

export function computePercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}
