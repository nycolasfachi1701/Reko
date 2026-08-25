import "server-only";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveKeyPath, storageRoot } from "@/lib/storage/local-fs";

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

/**
 * Transcodifica o vídeo original em um ladder HLS (720p + 480p) com master
 * playlist, para adaptive bitrate (SPEC §2 — hls.js). Retorna a chave do
 * master.m3u8. Lança em caso de falha (o chamador mantém o mp4 como fallback).
 *
 * ⚠️ Produção: isto é pesado e deve rodar num worker/fila dedicado (ou serviço
 * gerenciado). Aqui roda no processo do servidor via `after()`, ok em dev.
 */
export async function transcodeToHls(
  videoId: string,
  inputKey: string,
): Promise<string> {
  const inputPath = resolveKeyPath(inputKey);
  const outDir = join(storageRoot(), "hls", videoId);
  await mkdir(outDir, { recursive: true });

  const args = [
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    "[0:v]split=2[v1][v2];[v1]scale=-2:720[v1out];[v2]scale=-2:480[v2out]",
    "-map",
    "[v1out]",
    "-map",
    "[v2out]",
    // áudio uma vez por variante (o HLS muxer não reusa o mesmo a:0)
    "-map",
    "0:a:0?",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-g",
    "48",
    "-keyint_min",
    "48",
    "-sc_threshold",
    "0",
    "-b:v:0",
    "2500k",
    "-maxrate:v:0",
    "2675k",
    "-bufsize:v:0",
    "3750k",
    "-b:v:1",
    "1200k",
    "-maxrate:v:1",
    "1285k",
    "-bufsize:v:1",
    "1800k",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-f",
    "hls",
    "-hls_time",
    "6",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_filename",
    join(outDir, "stream_%v_%03d.ts"),
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    "v:0,a:0 v:1,a:1",
    join(outDir, "stream_%v.m3u8"),
  ];

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu com código ${code}: ${stderr.slice(-500)}`));
    });
  });

  return `hls/${videoId}/master.m3u8`;
}
