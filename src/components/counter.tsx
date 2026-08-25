"use client";

import { useEffect, useRef, useState } from "react";
import { formatWatchTime } from "@/lib/format";

// Formatos são passados por CHAVE (string) — não dá para passar função de um
// Server Component para um Client Component.
type FormatKey = "number" | "watchTime" | "percent";

function render(n: number, format: FormatKey): string {
  if (format === "watchTime") return formatWatchTime(n);
  if (format === "percent") return `${n}%`;
  return n.toLocaleString("pt-BR");
}

/** Número que interpola ao montar (SPEC §8.3: contadores que não saltam). */
export function Counter({
  value,
  format = "number",
  className,
  duration = 700,
}: {
  value: number;
  format?: FormatKey;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className={className}>{render(display, format)}</span>;
}
