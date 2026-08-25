export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Interpreta o header Range para servir vídeo com seek (SPEC §2).
 * Retorna a faixa, null (sem range / ignorar) ou "unsatisfiable" (416).
 */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | "unsatisfiable" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const startStr = match[1] ?? "";
  const endStr = match[2] ?? "";
  if (startStr === "" && endStr === "") return null;

  let start: number;
  let end: number;

  if (startStr === "") {
    // sufixo: últimos N bytes
    const n = Number.parseInt(endStr, 10);
    if (!Number.isFinite(n) || n <= 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number.parseInt(startStr, 10);
    end = endStr === "" ? size - 1 : Number.parseInt(endStr, 10);
  }

  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (start > end || start >= size) return "unsatisfiable";
  if (end >= size) end = size - 1;
  return { start, end };
}
