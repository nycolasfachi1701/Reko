import "server-only";
import { redirect } from "next/navigation";
import { Role, type User } from "@prisma/client";
import { getCurrentUser } from "./session";

/**
 * Autorização checada NO SERVIDOR (SPEC §3). Helper único — usar em toda
 * página, layout e Server Action protegidos. Esconder botão no front não conta.
 *
 * - Não autenticado  → redireciona para o login.
 * - Autenticado, mas sem o papel exigido → redireciona para a home (`/`),
 *   que é a área do espectador.
 */
export async function requireRole(
  roles: Role[],
  opts: { loginRedirect?: string } = {},
): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(opts.loginRedirect ?? "/login");
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/** Exige apenas que haja um usuário autenticado (qualquer papel). */
export async function requireUser(loginRedirect = "/login"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginRedirect);
  return user;
}
