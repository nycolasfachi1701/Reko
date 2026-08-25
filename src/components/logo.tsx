import { cn } from "@/lib/utils";

/** Marca Nstech: glifo laranja + wordmark. A cor da marca é acento. */
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
        n
      </span>
      {showText ? (
        <span className="text-lg font-black tracking-tight text-fg-hi">
          nstech
          <span className="font-medium text-fg-lo"> vídeos</span>
        </span>
      ) : null}
    </span>
  );
}
