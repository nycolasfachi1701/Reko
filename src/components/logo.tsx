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
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded bg-brand text-lg font-black leading-none text-[#111]"
      >
        R
      </span>
      {showText ? (
        <span className="text-lg font-black tracking-tight text-fg-hi">
          Reko
          <span className="ml-1.5 align-middle text-xs font-medium text-fg-lo">
            by Nstech
          </span>
        </span>
      ) : null}
    </span>
  );
}
