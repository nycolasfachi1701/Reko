import { VideoStatus } from "@prisma/client";

const STATUS: Record<VideoStatus, { label: string; dot: string }> = {
  DRAFT: { label: "Rascunho", dot: "bg-fg-lo" },
  PROCESSING: { label: "Processando", dot: "bg-warning" },
  PUBLISHED: { label: "Publicado", dot: "bg-positive" },
  ARCHIVED: { label: "Arquivado", dot: "bg-fg-lo" },
};

// Estado nunca só por cor (SPEC §8.1): ponto + rótulo.
export function StatusBadge({ status }: { status: VideoStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-fg-hi">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
