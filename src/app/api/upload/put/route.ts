import { type NextRequest } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { verifyUploadToken } from "@/lib/storage/upload-token";
import { resolveKeyPath } from "@/lib/storage/local-fs";
import { MAX_VIDEO_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Recebe o upload direto do cliente (comporta-se como PUT pré-assinado).
// Exige gestor/admin logado E um token de upload válido (chave + expiração).
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.MANAGER && user.role !== Role.ADMIN)) {
    return new Response("Não autorizado", { status: 403 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";

  if (!(await verifyUploadToken(key, exp, sig))) {
    return new Response("Token de upload inválido ou expirado", { status: 403 });
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_VIDEO_BYTES) {
    return new Response("Arquivo maior que o limite (2 GB)", { status: 413 });
  }

  if (!req.body) return new Response("Corpo vazio", { status: 400 });

  let path: string;
  try {
    path = resolveKeyPath(key);
  } catch {
    return new Response("Chave inválida", { status: 400 });
  }

  await mkdir(dirname(path), { recursive: true });
  const nodeStream = Readable.fromWeb(req.body as unknown as Parameters<typeof Readable.fromWeb>[0]);

  // Cap REAL durante o streaming: o header Content-Length pode ser omitido
  // (envio chunked), então contamos os bytes e abortamos ao passar do limite.
  let received = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      received += chunk.length;
      if (received > MAX_VIDEO_BYTES) {
        cb(new Error("TOO_LARGE"));
        return;
      }
      cb(null, chunk);
    },
  });

  try {
    await pipeline(nodeStream, limiter, createWriteStream(path));
  } catch (e) {
    await unlink(path).catch(() => {}); // remove o parcial
    if (e instanceof Error && e.message === "TOO_LARGE") {
      return new Response("Arquivo maior que o limite (2 GB)", { status: 413 });
    }
    throw e;
  }

  return new Response(null, { status: 204 });
}
