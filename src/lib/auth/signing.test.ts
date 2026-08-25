import { describe, expect, it } from "vitest";
import { sign, verifySignature } from "./signing";

const SECRET = "segredo-de-teste-0123456789";

describe("signing (HMAC)", () => {
  it("assina e verifica o mesmo valor", async () => {
    const sig = await sign("token-abc", SECRET);
    expect(await verifySignature("token-abc", sig, SECRET)).toBe(true);
  });

  it("rejeita valor adulterado", async () => {
    const sig = await sign("token-abc", SECRET);
    expect(await verifySignature("token-xyz", sig, SECRET)).toBe(false);
  });

  it("rejeita segredo errado", async () => {
    const sig = await sign("token-abc", SECRET);
    expect(await verifySignature("token-abc", sig, "outro-segredo")).toBe(false);
  });

  it("rejeita assinatura inválida ou vazia", async () => {
    expect(await verifySignature("token-abc", "", SECRET)).toBe(false);
    expect(await verifySignature("token-abc", "zz", SECRET)).toBe(false);
  });

  it("rejeita quando não há segredo", async () => {
    const sig = await sign("token-abc", SECRET);
    expect(await verifySignature("token-abc", sig, "")).toBe(false);
  });
});
