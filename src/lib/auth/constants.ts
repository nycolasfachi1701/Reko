// Constantes de auth compartilhadas entre runtimes (Node e Edge/middleware).
// Sem imports de node: nem next/headers aqui — precisa rodar no Edge também.

export const SESSION_COOKIE = "nstv_session";

export const DAY_SECONDS = 24 * 60 * 60;
export const HOUR_SECONDS = 60 * 60;
