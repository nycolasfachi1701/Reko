export interface BarPoint {
  label: string; // rótulo curto (data)
  value: number;
}

/** Série diária em barras (SVG responsivo). Tooltip nativo via <title>. */
export function BarSeries({ data }: { data: BarPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-fg-lo">Sem dados no período.</p>;
  }
  const W = 720;
  const H = 160;
  const pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const gap = 2;
  const barW = Math.max(1, innerW / data.length - gap);
  const showEvery = Math.ceil(data.length / 8);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-40 w-full"
      role="img"
      aria-label="Série diária de visualizações"
    >
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = pad.left + i * (barW + gap);
        const y = pad.top + innerH - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx={1.5}
              fill="var(--brand)"
              opacity={0.9}
            >
              <title>
                {d.label}: {d.value}
              </title>
            </rect>
            {i % showEvery === 0 ? (
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-lo)"
              >
                {d.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
