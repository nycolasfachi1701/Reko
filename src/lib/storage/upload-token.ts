import { sign, verifySignature } from "@/lib/auth/signing";

// Assina o destino de upload local (comporta-se como uma URL pré-assinada):
// a assinatura cobre a chave + expiração, então o PUT só aceita o que o
// servidor autorizou, e apenas dentro da janela de validade.

function secret(): string {
  return process.env.SESSION_SECRET ?? "";
}

export function signUploadToken(key: string, exp: number): Promise<string> {
  return sign(`${key}|${exp}`, secret());
}

export async function verifyUploadToken(
  key: string,
  exp: number,
  sig: string,
): Promise<boolean> {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return verifySignature(`${key}|${exp}`, sig, secret());
}
