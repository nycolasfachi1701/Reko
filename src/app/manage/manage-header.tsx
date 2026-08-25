import Link from "next/link";
import { Role, type User } from "@prisma/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { logoutAction } from "./actions";

export function ManageHeader({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-surface-0/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/manage" className="rounded focus-visible:outline-2 focus-visible:outline-brand">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-fg-lo sm:flex">
            <Link href="/manage" className="transition-colors hover:text-fg-hi">
              Painel
            </Link>
            <Link href="/manage/videos" className="transition-colors hover:text-fg-hi">
              Vídeos
            </Link>
            {user.role === Role.ADMIN ? (
              <Link href="/manage/access" className="transition-colors hover:text-fg-hi">
                Acessos
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-fg-lo sm:inline">
            {user.name} ·{" "}
            <span className="text-fg-hi">
              {user.role === Role.ADMIN ? "Administrador" : "Gestor"}
            </span>
          </span>
          <form action={logoutAction}>
            <Button variant="secondary" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
