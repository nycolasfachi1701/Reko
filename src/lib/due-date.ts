// Prazo de trilha é uma data-only. O gestor escolhe "YYYY-MM-DD" e gravamos à
// meia-noite UTC (new Date("YYYY-MM-DD")). Para evitar divergência entre telas
// e off-by-one por fuso, centralizamos aqui:
//  - exibição formatada SEMPRE em UTC (mostra o dia que o gestor escolheu);
//  - "vencido" comparando apenas a data (YYYY-MM-DD), com o "hoje" no fuso do
//    app, não a hora exata — assim o prazo só vence no dia seguinte.
const APP_TZ = "America/Sao_Paulo";

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

// YYYY-MM-DD de uma data num fuso (en-CA formata nesse padrão).
function ymd(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Exibe o prazo (dd/mm/aaaa) no mesmo dia escolhido, independente do fuso. */
export function formatDueDate(due: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(toDate(due));
}

/**
 * Vencido = a trilha não está concluída e o dia de hoje (fuso do app) já passou
 * do dia do prazo. Mesma regra em todas as telas (feed, trilha, gestão).
 */
export function isOverdue(
  due: Date | string | null,
  done: boolean,
  now: Date = new Date(),
): boolean {
  if (!due || done) return false;
  return ymd(now, APP_TZ) > ymd(toDate(due), "UTC");
}
