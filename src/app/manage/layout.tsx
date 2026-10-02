import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/require-role";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/auth/logout";
import { ManageSidebar, ManageMobileNav } from "./manage-sidebar";

// Shell da área de gestão: menu lateral (desktop) / pílulas (mobile) + topo.
// requireRole protege toda a subárvore /manage de uma vez.
export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole([Role.MANAGER, Role.ADMIN]);
  const isAdmin = user.role === Role.ADMIN;

  return (
    <div className="flex min-h-screen">
      <ManageSidebar isAdmin={isAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="rk-bar">
          <div className="mx-auto flex h-[64px] max-w-6xl items-center gap-4 px-6">
            <Link
              href="/manage"
              className="flex shrink-0 items-center gap-2.5 lg:hidden"
              aria-label="Reko"
            >
              <span className="rk-glyph" aria-hidden>
                R
              </span>
              <span className="font-display text-[22px] font-extrabold tracking-tight">
                Reko
              </span>
            </Link>

            <div className="flex-1" />

            <span className="hidden text-sm text-fg-lo sm:inline">
              {user.name} ·{" "}
              <span className="text-fg-hi">{isAdmin ? "Administrador" : "Gestor"}</span>
            </span>
            <ThemeToggle />
            <form action={logoutAction}>
              <Button variant="secondary" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </header>

        <ManageMobileNav isAdmin={isAdmin} />

        {children}
      </div>
    </div>
  );
}
