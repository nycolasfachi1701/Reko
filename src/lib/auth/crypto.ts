import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token aleatório de alta entropia (SPEC §4.1 — crypto.randomBytes, 32 bytes). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** SHA-256 em hex. Guardamos SEMPRE o hash do token, nunca o texto puro. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash de IP (SHA-256 + salt) — SPEC §5: guardar ipHash, nunca o IP. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

/** Comparação de dois hex em tempo constante. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
