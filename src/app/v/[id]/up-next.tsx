import Link from "next/link";
import { formatDuration } from "@/lib/utils";

export interface UpNextItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  uploaderName: string;
}

const TONES = [
  "#20303a", "#2e2416", "#241f36", "#182a24",
  "#301a24", "#1e2438", "#2b2016", "#1c2a1e",
];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Coluna "A seguir": outros vídeos como cards horizontais (thumb + título). */
export function UpNext({ videos }: { videos: UpNextItem[] }) {
  if (videos.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-[84px] lg:self-start">
      <h2 className="mb-3 font-display text-lg font-bold">A seguir</h2>
      <div className="flex flex-col gap-2">
        {videos.map((v) => {
          const tone = TONES[hash(v.id) % TONES.length];
          const mono = (v.title.match(/[A-Za-zÀ-ÿ0-9]/)?.[0] ?? "R").toUpperCase();
          return (
            <Link
              key={v.id}
              href={`/v/${v.id}`}
              className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2"
            >
              <div
                className="relative aspect-video w-[42%] shrink-0 overflow-hidden rounded-lg"
                style={{ background: `linear-gradient(150deg, ${tone}, #0b0a09)` }}
              >
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center font-display text-2xl font-extrabold text-white/25">
                    {mono}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
                  {formatDuration(v.durationSec)}
                </span>
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-fg-hi transition-colors group-hover:text-brand">
                  {v.title}
                </h3>
                <p className="mt-1 truncate text-xs text-fg-mut">{v.uploaderName}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
