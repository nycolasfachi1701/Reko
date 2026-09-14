import { type NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { Role, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveKeyPath } from "@/lib/storage/local-fs";
import { parseRange } from "@/lib/http/range";

export const dynamic = "force-dynamic";

// Cache em memória (TTL) do status do vídeo dono de cada key: os N segmentos HLS
// de um mesmo vídeo compartilham um único lookup. Deliberadamente NÃO usa o Data
// Cache do Next (unstable_cache/revalidateTag) — isso deixa o caminho quente
// independente do catálogo e evita I/O em .next/cache por requisição.
const STATUS_TTL_MS = 30_000;
const statusCache = new Map<string, { status: VideoStatus | null; exp: number }>();

async function videoStatusForKey(rel: string): Promise<VideoStatus | null> {
  const now = Date.now();
  const hit = statusCache.get(rel);
  if (hit && hit.exp > now) return hit.status;

  const video = rel.startsWith("hls/")
    ? await db.video.findUnique({
        where: { id: rel.split("/")[1] ?? "" },
        select: { status: true },
      })
    : await db.video.findFirst({
        where: { OR: [{ storageKey: rel }, { thumbnailUrl: { endsWith: rel } }] },
        select: { status: true },
      });

  const status = video?.status ?? null;
  statusCache.set(rel, { status, exp: now + STATUS_TTL_MS });
  return status;
}

/**
 * Autorização por vídeo: a key precisa pertencer a um vídeo que o usuário pode
 * ver — publicado, ou qualquer status para gestor/admin (prévia). Sem isso,
 * qualquer logado baixaria o arquivo de um rascunho sabendo a key.
 */
async function mayAccessKey(rel: string, role: Role): Promise<boolean> {
  const isManager = role === Role.MANAGER || role === Role.ADMIN;
  const status = await videoStatusForKey(rel);
  return status != null && (isManager || status === VideoStatus.PUBLISHED);
}

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
};

// Serve mídia do storage local, exigindo sessão e suportando Range (seek).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  // touch:false — requisições de mídia são frequentes; não renovar sessão aqui.
  const user = await getCurrentUser({ touch: false });
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { key } = await params;
  const rel = key.join("/");

  let path: string;
  try {
    path = resolveKeyPath(rel);
  } catch {
    return new Response("Chave inválida", { status: 400 });
  }

  // 404 (em vez de 403) para não revelar a existência do arquivo.
  if (!(await mayAccessKey(rel, user.role))) {
    return new Response("Não encontrado", { status: 404 });
  }

  let info;
  try {
    info = await stat(path);
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME[ext] ?? "application/octet-stream";
  const range = parseRange(req.headers.get("range"), info.size);

  if (range === "unsatisfiable") {
    return new Response("Range inválido", {
      status: 416,
      headers: { "Content-Range": `bytes */${info.size}` },
    });
  }

  const commonHeaders = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
  };

  if (range) {
    const chunk = range.end - range.start + 1;
    const body = Readable.toWeb(
      createReadStream(path, { start: range.start, end: range.end }),
    ) as unknown as ReadableStream<Uint8Array>;
    return new Response(body, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(chunk),
        "Content-Range": `bytes ${range.start}-${range.end}/${info.size}`,
      },
    });
  }

  const body = Readable.toWeb(
    createReadStream(path),
  ) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: 200,
    headers: { ...commonHeaders, "Content-Length": String(info.size) },
  });
}
