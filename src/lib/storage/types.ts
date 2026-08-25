// Abstração de storage (SPEC §2/§7.1): dev usa disco local; prod usa R2
// (S3-compatible) por URL pré-assinada. O arquivo sobe direto para o storage.

export interface UploadTarget {
  key: string;
  /** URL para o cliente enviar os bytes (PUT). */
  uploadUrl: string;
  method: "PUT";
}

export interface StorageDriver {
  name: string;
  /** Cria o destino de upload (URL assinada) para uma chave. */
  createUploadTarget(key: string, contentType: string): Promise<UploadTarget>;
  /** URL para reproduzir/baixar o objeto. */
  playbackUrl(key: string): string;
}

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Gera uma chave de storage segura a partir de um id e content-type. */
export function buildKey(
  kind: "videos" | "thumbs",
  id: string,
  contentType: string,
): string {
  const ext =
    kind === "thumbs" ? "jpg" : (VIDEO_EXT[contentType] ?? "mp4");
  return `${kind}/${id}.${ext}`;
}

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB (SPEC §7.1)
export const ALLOWED_VIDEO_TYPES = Object.keys(VIDEO_EXT);
