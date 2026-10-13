import { describe, expect, it } from "vitest";
import { isOverdue, formatDueDate } from "./due-date";

describe("due-date", () => {
  it("formata o prazo no dia escolhido, sem off-by-one por fuso", () => {
    expect(formatDueDate("2026-10-20")).toBe("20/10/2026");
    expect(formatDueDate(new Date("2026-01-05T00:00:00Z"))).toBe("05/01/2026");
  });

  it("não está vencido no próprio dia do prazo (fuso do app)", () => {
    // meio-dia UTC = manhã em São Paulo, ainda dia 20
    expect(isOverdue("2026-10-20", false, new Date("2026-10-20T12:00:00Z"))).toBe(
      false,
    );
    // 02:00 UTC do dia 21 = 23:00 do dia 20 em São Paulo → ainda não venceu
    expect(isOverdue("2026-10-20", false, new Date("2026-10-21T02:00:00Z"))).toBe(
      false,
    );
  });

  it("fica vencido a partir do dia seguinte", () => {
    expect(isOverdue("2026-10-20", false, new Date("2026-10-21T12:00:00Z"))).toBe(
      true,
    );
  });

  it("nunca está vencido se concluída ou sem prazo", () => {
    expect(isOverdue("2020-01-01", true)).toBe(false);
    expect(isOverdue(null, false)).toBe(false);
  });
});
