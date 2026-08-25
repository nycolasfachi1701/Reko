export type Device = "mobile" | "tablet" | "desktop";

/** Classificação simples de dispositivo a partir do user-agent. */
export function deviceFromUA(ua: string | null): Device {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/.test(s)) return "mobile";
  return "desktop";
}
