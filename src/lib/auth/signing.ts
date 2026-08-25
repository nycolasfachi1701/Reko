// Assinatura HMAC-SHA256 do cookie de sessão (SPEC §2: "cookie httpOnly assinado").
// Usa Web Crypto (crypto.subtle), que existe tanto no Node 24 quanto no runtime
// Edge do middleware — assim o mesmo código assina no servidor e verifica no middleware.

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i] = byte;
  }
  return out;
}

export async function sign(value: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(sig);
}

/** Verificação em tempo constante (crypto.subtle.verify). */
export async function verifySignature(
  value: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  if (!secret) return false;
  const sigBytes = fromHex(signatureHex);
  if (!sigBytes) return false;
  const key = await importKey(secret);
  try {
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(value));
  } catch {
    return false;
  }
}
