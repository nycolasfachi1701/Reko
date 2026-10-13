// IP do cliente a partir dos headers, para a trilha de auditoria da sessão.
//
// X-Forwarded-For tem o formato "client, proxy1, proxy2, …": a entrada mais à
// ESQUERDA é fornecida pelo cliente (falsificável); a mais à DIREITA é a que o
// proxy confiável mais próximo registrou. Por isso lemos da direita, descontando
// os proxies confiáveis em TRUSTED_PROXY_HOPS (0 = a última entrada). Validamos
// o formato e, no pior caso, caímos em "0.0.0.0" (só alimenta auditoria).
const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      const hops = Math.max(0, Math.floor(Number(process.env.TRUSTED_PROXY_HOPS ?? 0)));
      const idx = Math.max(0, parts.length - 1 - hops);
      const ip = parts[idx];
      if (ip && IP_RE.test(ip)) return ip;
    }
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real && IP_RE.test(real)) return real;
  return "0.0.0.0";
}
