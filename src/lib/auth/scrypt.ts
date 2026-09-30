import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

// Hash de senha com scrypt (crypto nativo do Node — sem binário externo).
// Módulo puro (sem "server-only") para poder ser usado também no seed e nos
// fixtures de teste. O app importa via password.ts. Formato:
//   scrypt$<N>$<saltHex>$<hashHex>
const KEYLEN = 64;
const N = 16384; // fator de custo (2^14)

// Wrapper tipado: promisify(scrypt) resolve para a sobrecarga sem options,
// então envolvemos manualmente para poder passar { N }.
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(plain, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  hashed: string,
  plain: string,
): Promise<boolean> {
  try {
    const [scheme, nStr, saltHex, hashHex] = hashed.split("$");
    if (scheme !== "scrypt" || !nStr || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scryptAsync(plain, salt, expected.length, {
      N: Number(nStr),
    });
    return (
      expected.length === derived.length && timingSafeEqual(expected, derived)
    );
  } catch {
    return false;
  }
}
