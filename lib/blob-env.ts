function unwrapEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getBlobReadWriteToken() {
  const raw = process.env.BLOB_READ_WRITE_TOKEN;
  if (!raw) return null;
  const token = unwrapEnvValue(raw);
  return token || null;
}

export function getBlobStorageHint() {
  if (getBlobReadWriteToken()) return null;
  return "Defina BLOB_READ_WRITE_TOKEN no .env.local e reinicie o servidor (npm run dev). No Vercel: Storage → Blob → variáveis do projeto → copiar ou rodar `npx vercel env pull .env.local`.";
}
