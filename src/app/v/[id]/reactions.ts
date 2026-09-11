// Conjunto fechado de reações (emojis) — compartilhado entre a página e as
// server actions. Fica fora do módulo "use server" (que só pode exportar
// funções async).
export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "👏", "😮", "😂"] as const;
