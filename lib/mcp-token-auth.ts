export type McpTokenAuthFailure =
  | "malformed"
  | "not_found"
  | "expired"
  | "workspace_access"
  | "agent_inactive"
  | "agent_missing"
  | "agent_workspace_mismatch";

export function normalizeMcpToken(raw: string): string {
  let token = raw.trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  return token;
}

export function mcpTokenAuthErrorMessage(reason: McpTokenAuthFailure): string {
  switch (reason) {
    case "malformed":
      return "Chave MCP malformada. Use o valor completo que começa com ptl_.";
    case "not_found":
      return "Chave MCP inválida ou revogada. Confira se o endpoint aponta para o mesmo ambiente onde a chave foi gerada.";
    case "expired":
      return "Chave MCP expirada. Gere uma nova em Instrumentos.";
    case "workspace_access":
      return "Esta chave não tem mais acesso ao porto onde foi emitida.";
    case "agent_inactive":
      return "Este Agente de Bordo está desativado. Reative-o ou gere outra chave.";
    case "agent_missing":
      return "Agente de Bordo desta chave não foi encontrado. Gere uma nova chave em Instrumentos.";
    case "agent_workspace_mismatch":
      return "Chave MCP inconsistente com o porto do Agente de Bordo. Gere uma nova chave.";
  }
}

export function evaluateAgentIdentityGate(input: {
  agentIdentityId: string | null;
  workspaceId: string | null;
  identity: { workspaceId: string; status: string } | null;
}):
  | { ok: true; workspaceId: string | null }
  | { ok: false; reason: Exclude<McpTokenAuthFailure, "malformed" | "not_found" | "expired" | "workspace_access"> } {
  if (!input.agentIdentityId) {
    return { ok: true, workspaceId: input.workspaceId };
  }
  if (!input.identity) {
    return { ok: false, reason: "agent_missing" };
  }
  if (input.identity.status !== "active") {
    return { ok: false, reason: "agent_inactive" };
  }
  if (input.workspaceId && input.workspaceId !== input.identity.workspaceId) {
    return { ok: false, reason: "agent_workspace_mismatch" };
  }
  return { ok: true, workspaceId: input.workspaceId ?? input.identity.workspaceId };
}
