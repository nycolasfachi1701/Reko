import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Já logado como gestor? Vai direto para o painel.
  const user = await getCurrentUser();
  if (user && (user.role === Role.MANAGER || user.role === Role.ADMIN)) {
    redirect("/manage");
  }

  const { next } = await searchParams;
  const safeNext = next?.startsWith("/manage") ? next : "/manage";

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-lg border bg-surface-1 p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-block h-7 w-2 rounded bg-brand" aria-hidden />
          <h1 className="text-xl font-bold">
            Entrar <span className="text-fg-lo">· gestão</span>
          </h1>
        </div>
        <LoginForm next={safeNext} />
      </div>
    </main>
  );
}
