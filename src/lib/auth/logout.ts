"use server";

import { redirect } from "next/navigation";
import { destroyCurrentSession } from "./session";

/** Encerra a sessão e volta ao login. Usável em qualquer área (feed, player,
 *  gestão) — o logout não pode viver só dentro de /manage. */
export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
