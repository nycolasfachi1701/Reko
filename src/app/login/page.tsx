import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user && (user.role === Role.MANAGER || user.role === Role.ADMIN)) {
    redirect("/manage");
  }

  const { next } = await searchParams;
  const safeNext = next?.startsWith("/manage") ? next : "/manage";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8">
        <Logo />
      </div>

      <Card className="w-full max-w-sm p-8 shadow-2xl shadow-black/30">
        <h1 className="text-xl font-bold">Entrar na gestão</h1>
        <p className="mb-6 mt-1 text-sm text-fg-lo">
          Acesso para gestores e administradores.
        </p>
        <LoginForm next={safeNext} />
      </Card>

      <p className="mt-6 max-w-sm text-center text-xs text-fg-lo">
        Espectadores entram pelo link de acesso enviado pela sua equipe — sem
        senha.
      </p>
    </main>
  );
}
