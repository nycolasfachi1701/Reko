import { formatDuration } from "@/lib/utils";
import type { RetentionDrop } from "@/lib/analytics";

/**
 * Curva de retenção sobre 100 buckets (SPEC §7.3), com marcadores automáticos
 * nas duas maiores quedas, rotulados pelo timestamp.
 */
export function RetentionChart({
  values,
  durationSec,
  drops,
}: {
  values: number[]; // 100 posições (viewers por bucket)
  durationSec: number;
  drops: RetentionDrop[];
}) {
  const W = 720;
  const H = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const peak = Math.max(values[0] ?? 0, ...values, 1);
  const x = (bucket: number) => pad.left + (bucket / 99) * innerW;
  const y = (v: number) => pad.top + innerH - (v / peak) * innerH;

  const linePts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const areaPath =
    `M ${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} ` +
    `L ${linePts.join(" L ")} ` +
    `L ${x(99).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const xTicks = [0, 25, 50, 75, 99];
  const yTicks = [0, 0.5, 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Curva de retenção"
    >
      {/* grades horizontais + rótulos y (% do pico) */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(peak * t)}
            y2={y(peak * t)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text x={pad.left - 6} y={y(peak * t) + 3} textAnchor="end" fontSize="10" fill="var(--text-lo)">
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}

      <path d={areaPath} fill="var(--brand-soft)" />
      <polyline
        points={linePts.join(" ")}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* marcadores das maiores quedas */}
      {drops.map((d, i) => (
        <g key={i}>
          <line
            x1={x(d.bucket)}
            x2={x(d.bucket)}
            y1={pad.top}
            y2={pad.top + innerH}
            stroke="var(--negative)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle cx={x(d.bucket)} cy={y(values[d.bucket] ?? 0)} r={3.5} fill="var(--negative)" />
          <text
            x={Math.min(x(d.bucket) + 4, W - pad.right - 60)}
            y={pad.top + 12 + i * 14}
            fontSize="10"
            fill="var(--negative)"
          >
            {formatDuration(d.atSec)} · −{Math.round(d.dropPct * 100)}%
          </text>
        </g>
      ))}

      {/* rótulos x (timestamps) */}
      {xTicks.map((t) => (
        <text
          key={t}
          x={x(t)}
          y={H - 8}
          textAnchor="middle"
          fontSize="10"
          fill="var(--text-lo)"
        >
          {formatDuration(Math.round((t / 100) * durationSec))}
        </text>
      ))}
    </svg>
  );
}
