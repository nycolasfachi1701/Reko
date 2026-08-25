/** Tempo relativo em pt-BR ("há 3 dias"). `now` injetável para testes. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const sec = Math.round((now.getTime() - date.getTime()) / 1000);
  if (Math.abs(sec) < 60) return "agora mesmo";

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["week", 604800],
    ["month", 2592000],
    ["year", 31536000],
  ];

  let value = sec;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (let i = 0; i < units.length; i++) {
    const [u, size] = units[i]!;
    const next = units[i + 1];
    if (!next || Math.abs(sec) < next[1]) {
      unit = u;
      value = Math.round(sec / size);
      break;
    }
  }
  return rtf.format(-value, unit);
}

/** Contagem de views formatada. */
export function formatViews(n: number): string {
  return n === 1
    ? "1 visualização"
    : `${n.toLocaleString("pt-BR")} visualizações`;
}

/** Tempo total assistido, compacto: "3h 12m", "12m", "45s". */
export function formatWatchTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Fração 0..1 como porcentagem inteira. */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
