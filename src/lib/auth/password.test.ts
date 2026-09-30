import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./scrypt";

describe("password (scrypt)", () => {
  it("gera hash scrypt e verifica a senha correta", async () => {
    const h = await hashPassword("senha-super-secreta");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(h, "senha-super-secreta")).toBe(true);
  });

  it("rejeita senha errada", async () => {
    const h = await hashPassword("senha-super-secreta");
    expect(await verifyPassword(h, "senha-errada")).toBe(false);
  });

  it("não estoura com hash inválido", async () => {
    expect(await verifyPassword("não-é-um-hash", "x")).toBe(false);
  });
});
