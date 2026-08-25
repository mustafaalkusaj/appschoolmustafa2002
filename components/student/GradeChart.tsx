"use client";

interface GradeItem {
  subject_name: string;
  percentage: number;
}

interface GradeChartProps {
  grades: GradeItem[];
}

export function GradeChart({ grades }: GradeChartProps) {
  if (grades.length === 0) return null;

  const barHeight = 28;
  const gap = 8;
  const labelWidth = 80;
  const chartPadding = 8;
  const totalHeight = grades.length * (barHeight + gap) - gap + chartPadding * 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        viewBox={`0 0 320 ${totalHeight}`}
        className="min-w-[280px]"
        style={{ direction: "ltr" }}
      >
        {grades.map((g, i) => {
          const y = chartPadding + i * (barHeight + gap);
          const barWidth = Math.max(0, Math.min(100, g.percentage)) * 2;
          const color =
            g.percentage >= 80
              ? "var(--success)"
              : g.percentage >= 50
                ? "var(--warning)"
                : "var(--danger)";

          return (
            <g key={i}>
              <text
                x={labelWidth - 6}
                y={y + barHeight / 2 + 1}
                textAnchor="end"
                className="fill-[var(--text-secondary)]"
                fontSize="11"
                fontWeight="500"
              >
                {g.subject_name.length > 10
                  ? g.subject_name.slice(0, 9) + "…"
                  : g.subject_name}
              </text>

              <rect
                x={labelWidth}
                y={y + 2}
                width={200}
                height={barHeight - 4}
                rx={6}
                fill="color-mix(in srgb, var(--border) 30%, transparent)"
              />

              <rect
                x={labelWidth}
                y={y + 2}
                width={barWidth}
                height={barHeight - 4}
                rx={6}
                fill={color}
                opacity={0.85}
                style={{
                  transition: "width 0.6s ease-out",
                }}
              />

              <text
                x={labelWidth + barWidth + 6}
                y={y + barHeight / 2 + 1}
                textAnchor="start"
                className="fill-[var(--text-primary)]"
                fontSize="11"
                fontWeight="700"
              >
                {g.percentage}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
