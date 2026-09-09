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

export function isBlobStoreUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /suspended|blocked|store has been|not found|unavailable/i.test(message);
}

export function formatBlobStorageError(error: unknown) {
  if (isBlobStoreUnavailableError(error)) {
    return "O armazenamento Vercel Blob está indisponível (suspenso ou bloqueado). Em desenvolvimento, o arquivo foi salvo localmente; em produção, reative o Blob no dashboard da Vercel.";
  }
  return error instanceof Error ? error.message : "Não foi possível enviar o arquivo.";
}
