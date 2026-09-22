import { cn } from "@/lib/utils";

/** Marca Reko (Nstech): glifo laranja + wordmark. A cor da marca é acento. */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="rk-glyph" aria-hidden>
        R
      </span>
      {showText ? (
        <span className="font-display text-lg font-extrabold tracking-tight text-fg-hi">
          Reko
        </span>
      ) : null}
    </span>
  );
}
