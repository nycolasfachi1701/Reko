import { describe, expect, it } from "vitest";
import { parseRange } from "./range";

describe("parseRange", () => {
  it("sem header → null", () => {
    expect(parseRange(null, 1000)).toBeNull();
  });

  it("faixa completa bytes=0-", () => {
    expect(parseRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
  });

  it("faixa explícita", () => {
    expect(parseRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
  });

  it("limita o fim ao tamanho", () => {
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
  });

  it("sufixo (últimos N bytes)", () => {
    expect(parseRange("bytes=-200", 1000)).toEqual({ start: 800, end: 999 });
  });

  it("início além do tamanho → unsatisfiable", () => {
    expect(parseRange("bytes=2000-3000", 1000)).toBe("unsatisfiable");
  });

  it("header malformado → null", () => {
    expect(parseRange("xoxo", 1000)).toBeNull();
  });
});
