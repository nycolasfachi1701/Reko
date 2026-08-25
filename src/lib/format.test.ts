import { describe, expect, it } from "vitest";
import { formatRelativeTime, formatViews } from "./format";

const NOW = new Date("2026-08-25T12:00:00Z");

describe("formatRelativeTime", () => {
  it("menos de 1 min → agora mesmo", () => {
    expect(formatRelativeTime(new Date("2026-08-25T11:59:30Z"), NOW)).toBe(
      "agora mesmo",
    );
  });
  it("minutos", () => {
    expect(formatRelativeTime(new Date("2026-08-25T11:45:00Z"), NOW)).toContain(
      "15",
    );
  });
  it("dias", () => {
    const s = formatRelativeTime(new Date("2026-08-22T12:00:00Z"), NOW);
    expect(s).toContain("3");
    expect(s).toContain("dias");
  });
});

describe("formatViews", () => {
  it("singular", () => {
    expect(formatViews(1)).toBe("1 visualização");
  });
  it("plural", () => {
    expect(formatViews(1234)).toContain("visualizações");
  });
});
