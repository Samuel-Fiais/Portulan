export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

/** RN-104: chave MCP não sobrevive à perda de participação no porto. */
export function validateMcpWorkspaceAccess(input: {
  workspaceId: string | null;
  isMember: boolean;
}): PolicyResult {
  if (!input.workspaceId) return { ok: true };
  if (!input.isMember) {
    return deny("Esta chave não tem mais acesso a este porto.");
  }
  return { ok: true };
}

export function shouldRevokeTokensOnMembershipLoss() {
  return true;
}
