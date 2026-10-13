export function Sparkline({
  values,
  width = 120,
  height = 32,
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  /** Se informado, o gráfico é anunciado por leitor de tela (role=img). */
  label?: string;
}) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      />
    );
  }
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - (v / max) * (height - 2) - 1).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
