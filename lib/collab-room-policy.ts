export type PolicyResult = { ok: true } | { ok: false; error: string };

/** Carimbo de autorização da sala (RN-121): cliente defasado não publica nem renova presença. */
export function validateCollabPolicyVersion(
  clientPolicyVersion: number | null | undefined,
  roomPolicyVersion: number,
): PolicyResult {
  if (clientPolicyVersion == null) return { ok: true };
  if (!Number.isInteger(clientPolicyVersion) || clientPolicyVersion < 1) {
    return { ok: false, error: "Versão de autorização da sala inválida." };
  }
  if (clientPolicyVersion !== roomPolicyVersion) {
    return { ok: false, error: "Autorização da sala mudou. Recarregue a superfície." };
  }
  return { ok: true };
}

export function parseCollabPolicyVersionParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}
