"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { formatDuration } from "@/lib/utils";
import { useViewTelemetry } from "./use-view-telemetry";

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
  src,
  poster,
  title,
  videoId,
  startAt = 0,
  retention,
}: {
  src: string;
  poster: string | null;
  title: string;
  videoId: string;
  startAt?: number;
  retention?: number[]; // 0..1 por bucket (curva de audiência), opcional
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useViewTelemetry(videoRef, videoId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareAtCurrent = useCallback(async () => {
    const t = Math.floor(videoRef.current?.currentTime ?? 0);
    const url = new URL(window.location.href);
    url.searchParams.set("t", String(t));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(time, 0), v.duration);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const changeVolume = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const nv = Math.min(1, Math.max(0, v.volume + delta));
    v.volume = nv;
    v.muted = nv === 0;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* PiP indisponível */
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  // Atalhos de teclado (SPEC §6.2). Ignora quando o foco está em campo de texto.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo((videoRef.current?.currentTime ?? 0) + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo((videoRef.current?.currentTime ?? 0) - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m": {
          const v = videoRef.current;
          if (v) v.muted = !v.muted;
          break;
        }
        case "?":
          setShowShortcuts((s) => !s);
          break;
        case "Escape":
          setShowShortcuts(false);
          break;
      }
      showControlsTemporarily();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekTo, changeVolume, toggleFullscreen, showControlsTemporarily]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function onProgressPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        playsInline
        className="h-full w-full"
        onClick={togglePlay}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          if (startAt > 0) e.currentTarget.currentTime = startAt;
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length > 0) setBuffered(b.end(b.length - 1));
        }}
        onPlay={() => {
          setPlaying(true);
          showControlsTemporarily();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
      />

      {/* Botão central de play quando pausado */}
      {!playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproduzir"
          className="absolute inset-0 grid place-items-center bg-black/20"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand text-[#111] shadow-lg">
            <PlayIcon big />
          </span>
        </button>
      ) : null}

      {/* Barra de controles */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progresso */}
        <div
          role="slider"
          aria-label="Progresso"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onProgressPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) onProgressPointer(e);
          }}
          className="group/bar relative mb-2 h-3 cursor-pointer"
        >
          {/* Assinatura: curva de retenção (onde a audiência mais assiste) */}
          {retention && retention.length > 1 ? (
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
              aria-hidden
            >
              <polygon
                points={`0,10 ${retention
                  .map((v, i) => `${((i / (retention.length - 1)) * 100).toFixed(2)},${(10 - Math.min(1, Math.max(0, v)) * 10).toFixed(2)}`)
                  .join(" ")} 100,10`}
                fill="var(--brand)"
              />
            </svg>
          ) : null}
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25">
            <div
              className="absolute h-full rounded-full bg-white/30"
              style={{ width: `${bufPct}%` }}
            />
            <div
              className="absolute h-full rounded-full bg-brand"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-0 transition-opacity group-hover/bar:opacity-100"
              style={{ left: `${pct}%` }}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 text-white">
          <IconButton onClick={togglePlay} label={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton onClick={() => seekTo(current - 10)} label="Voltar 10s">
            <span className="text-xs font-semibold">-10</span>
          </IconButton>
          <IconButton onClick={() => seekTo(current + 10)} label="Avançar 10s">
            <span className="text-xs font-semibold">+10</span>
          </IconButton>

          <div className="flex items-center gap-1.5">
            <IconButton
              onClick={() => {
                const v = videoRef.current;
                if (v) v.muted = !v.muted;
              }}
              label={muted ? "Ativar som" : "Silenciar"}
            >
              {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </IconButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.volume = Number(e.target.value);
                v.muted = Number(e.target.value) === 0;
              }}
              aria-label="Volume"
              className="hidden h-1 w-20 accent-[var(--brand)] sm:block"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={rate}
              onChange={(e) => {
                const v = videoRef.current;
                if (v) v.playbackRate = Number(e.target.value);
              }}
              aria-label="Velocidade"
              className="rounded bg-white/10 px-1.5 py-1 text-xs text-white outline-none"
            >
              {RATES.map((r) => (
                <option key={r} value={r} className="text-black">
                  {r}×
                </option>
              ))}
            </select>
            <IconButton
              onClick={shareAtCurrent}
              label={copied ? "Link copiado" : "Copiar link no tempo atual"}
            >
              {copied ? <span className="text-xs font-semibold">✓</span> : <ShareIcon />}
            </IconButton>
            <IconButton onClick={() => setShowShortcuts(true)} label="Atalhos">
              <span className="text-sm font-bold">?</span>
            </IconButton>
            <IconButton onClick={togglePip} label="Picture-in-picture">
              <PipIcon />
            </IconButton>
            <IconButton onClick={toggleFullscreen} label="Tela cheia">
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </IconButton>
          </div>
        </div>
      </div>

      {showShortcuts ? (
        <ShortcutsOverlay title={title} onClose={() => setShowShortcuts(false)} />
      ) : null}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 min-w-8 place-items-center rounded px-1 text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-brand"
    >
      {children}
    </button>
  );
}

function ShortcutsOverlay({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  const items: [string, string][] = [
    ["Espaço", "Reproduzir / pausar"],
    ["← / →", "Voltar / avançar 5s"],
    ["↑ / ↓", "Volume"],
    ["f", "Tela cheia"],
    ["m", "Mudo"],
    ["?", "Mostrar/ocultar atalhos"],
  ];
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-white/15 bg-surface-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 truncate font-semibold text-fg-hi">{title}</h3>
        <dl className="flex flex-col gap-2">
          {items.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-fg-lo">{d}</dt>
              <dd>
                <kbd className="rounded border border-[var(--border)] bg-surface-2 px-2 py-0.5 text-xs text-fg-hi">
                  {k}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded bg-brand py-2 text-sm font-medium text-[#111] hover:bg-brand-strong"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

/* Ícones inline (transform/opacity apenas) */
function PlayIcon({ big }: { big?: boolean }) {
  const s = big ? 28 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function VolumeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 9v6h4l5 5V4L8 9H4zm12 3a4 4 0 00-2-3.5v7A4 4 0 0016 12z" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 9v6h4l5 5V4L8 9H4zm15.5 3l2-2-1-1-2 2-2-2-1 1 2 2-2 2 1 1 2-2 2 2 1-1-2-2z" />
    </svg>
  );
}
function FullscreenIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}
function ExitFullscreenIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 16a3 3 0 00-2.4 1.2l-6.1-3.1a3 3 0 000-2.2l6.1-3.1a3 3 0 10-.7-1.9c0 .2 0 .4.1.6L8.9 10.6a3 3 0 100 4l6.2 3.1c-.1.2-.1.4-.1.6a3 3 0 103-3z" />
    </svg>
  );
}
function PipIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14z" />
    </svg>
  );
}
