import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("passa valores simples", () => {
    expect(csvCell("abc")).toBe("abc");
    expect(csvCell(42)).toBe("42");
  });
  it("aspas em valores com vírgula/aspas/quebra", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
});

describe("toCsv", () => {
  it("monta linhas com CRLF", () => {
    expect(
      toCsv([
        ["a", "b"],
        [1, 2],
      ]),
    ).toBe("a,b\r\n1,2");
  });
});
