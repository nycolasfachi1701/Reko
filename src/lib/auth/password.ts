import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id (SPEC §4.2). Parâmetros = defaults do @node-rs/argon2
// (m=19456 KiB, t=2, p=1), alinhados às recomendações OWASP.

export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(
  hashed: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
