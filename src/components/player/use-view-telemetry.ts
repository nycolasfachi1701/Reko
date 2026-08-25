"use client";

import { type RefObject, useEffect } from "react";

// Telemetria de visualização (SPEC §6.3): 1 ViewSession por abertura, heartbeat
// a cada 5s SÓ com o vídeo tocando e a aba visível, e sendBeacon no pagehide.
export function useViewTelemetry(
  videoRef: RefObject<HTMLVideoElement | null>,
  videoId: string,
) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let sessionId: string | null = null;
    let creating = false;
    let watchedMs = 0;
    let playingSince: number | null = null;

    const isActive = () =>
      !v.paused && !v.ended && document.visibilityState === "visible";

    const accumulate = () => {
      if (playingSince != null) {
        const t = performance.now();
        watchedMs += t - playingSince;
        playingSince = t;
      }
    };

    const ensureSession = async () => {
      if (sessionId || creating) return;
      creating = true;
      try {
        const res = await fetch("/api/telemetry/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, referrer: document.referrer }),
        });
        if (res.ok) sessionId = (await res.json()).sessionId;
      } catch {
        /* offline: ignora */
      }
      creating = false;
    };

    const drainBody = () => {
      accumulate();
      const whole = Math.floor(watchedMs / 1000);
      watchedMs -= whole * 1000;
      return {
        sessionId,
        positionSec: Math.floor(v.currentTime),
        watchedDelta: whole,
        duration: Math.floor(v.duration || 0),
      };
    };

    const sendBeat = async () => {
      if (!sessionId) return;
      try {
        await fetch("/api/telemetry/beat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(drainBody()),
          keepalive: true,
        });
      } catch {
        /* ignora */
      }
    };

    const sendFinal = () => {
      if (!sessionId) return;
      try {
        const blob = new Blob([JSON.stringify(drainBody())], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/telemetry/beat", blob);
      } catch {
        /* ignora */
      }
    };

    const onPlay = () => {
      ensureSession();
      if (isActive()) playingSince = performance.now();
    };
    const onPauseOrEnd = () => {
      accumulate();
      playingSince = null;
      void sendBeat();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        accumulate();
        playingSince = null;
        sendFinal();
      } else if (isActive()) {
        playingSince = performance.now();
      }
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPauseOrEnd);
    v.addEventListener("ended", onPauseOrEnd);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", sendFinal);

    // 1 sessão por abertura
    void ensureSession();

    const interval = setInterval(() => {
      if (isActive()) void sendBeat();
    }, 5000);

    return () => {
      clearInterval(interval);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPauseOrEnd);
      v.removeEventListener("ended", onPauseOrEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", sendFinal);
      sendFinal();
    };
  }, [videoId, videoRef]);
}
