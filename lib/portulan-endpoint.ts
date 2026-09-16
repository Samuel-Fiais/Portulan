/** URL pública do Portulan em produção (Vercel). Agentes e CLI conectam aqui por padrão. */
export const PORTULAN_CLOUD_URL = "https://portulan.vercel.app";

/** Apenas para quem desenvolve o próprio Portulan localmente. */
export const PORTULAN_LOCAL_DEV_URL = "http://localhost:3000";

export function resolvePortulanEndpoint(explicit?: string | null): string {
  const raw =
    explicit?.trim() ||
    process.env.PORTULAN_ENDPOINT?.trim() ||
    process.env.PORTULAN_PUBLIC_URL?.trim() ||
    PORTULAN_CLOUD_URL;
  return raw.replace(/\/$/, "");
}

export function portulanMcpUrl(base = resolvePortulanEndpoint()): string {
  return `${base}/api/mcp`;
}
