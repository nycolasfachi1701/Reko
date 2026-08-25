import "server-only";
import { join, normalize, sep } from "node:path";

/** Raiz do storage local (dev). Configurável por env. */
export function storageRoot(): string {
  const dir = process.env.LOCAL_STORAGE_DIR?.trim();
  return dir ? dir : join(process.cwd(), "storage");
}

/** Resolve a chave para um caminho absoluto, barrando path traversal. */
export function resolveKeyPath(key: string): string {
  const clean = normalize(key).replace(/^([.][.](?:[/\\]|$))+/, "");
  const root = storageRoot();
  const full = join(root, clean);
  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error("chave de storage inválida");
  }
  return full;
}
