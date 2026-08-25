export function Sparkline({
  values,
  width = 120,
  height = 32,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
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
      aria-hidden
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
