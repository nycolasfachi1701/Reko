import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === Role.VIEWER ? "/" : "/manage");

  const { next } = await searchParams;
  const safeNext = next?.startsWith("/manage") ? next : "/manage";

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="animate-in p-8 shadow-lg">
          <h1 className="font-display text-xl font-bold">Entrar</h1>
          <p className="mb-6 mt-1 text-sm text-fg-lo">
            Acesse com seu e-mail e senha.
          </p>
          <LoginForm next={safeNext} />
        </Card>
        <p className="mt-6 text-center text-xs text-fg-mut">
          Não tem acesso? Peça uma conta ao administrador da sua equipe.
        </p>
      </div>
    </main>
  );
}
