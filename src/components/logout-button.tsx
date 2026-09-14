"use client";

import { logoutAction } from "@/lib/auth/logout";
import { cn } from "@/lib/utils";

/** Botão "Sair" (ícone) usável fora da gestão — feed e página do vídeo. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sair"
        title="Sair"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-sm border border-[var(--border-strong)] bg-surface-1 text-fg-lo transition-colors hover:bg-surface-2 hover:text-fg-hi focus-visible:outline-2 focus-visible:outline-brand",
          className,
        )}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </form>
  );
}
