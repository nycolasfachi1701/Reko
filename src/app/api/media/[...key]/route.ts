import { type NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveKeyPath } from "@/lib/storage/local-fs";
import { parseRange } from "@/lib/http/range";

export const dynamic = "force-dynamic";

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
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { key } = await params;
  const rel = key.join("/");

  let path: string;
  try {
    path = resolveKeyPath(rel);
  } catch {
    return new Response("Chave inválida", { status: 400 });
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
