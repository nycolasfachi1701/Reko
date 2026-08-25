import { describe, expect, it } from "vitest";
import { randomToken, safeEqualHex, sha256Hex } from "./crypto";

describe("sha256Hex", () => {
  it("bate com o vetor conhecido de 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("randomToken", () => {
  it("gera 32 bytes em hex (64 chars)", () => {
    expect(randomToken(32)).toHaveLength(64);
  });

  it("não repete", () => {
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("safeEqualHex", () => {
  it("true para iguais", () => {
    expect(safeEqualHex("deadbeef", "deadbeef")).toBe(true);
  });

  it("false para diferentes", () => {
    expect(safeEqualHex("deadbeef", "deadbee0")).toBe(false);
  });

  it("false para tamanhos diferentes ou vazio", () => {
    expect(safeEqualHex("dead", "deadbeef")).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });
});
