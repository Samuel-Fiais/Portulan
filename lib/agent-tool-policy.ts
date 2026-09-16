import { isKnownMcpToolName, listAllMcpToolNames, type McpToolName } from "./mcp-tool-catalog.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

/** Todas as ferramentas MCP — padrão na criação do Agente de Bordo (RN-105, RN-111). */
export function defaultAgentAllowedTools(): McpToolName[] {
  return listAllMcpToolNames();
}

/** Identidades legadas sem lista gravada tratam como catálogo completo. */
export function resolveAgentAllowedTools(stored: readonly string[] | null | undefined): McpToolName[] {
  if (!stored?.length) return defaultAgentAllowedTools();
  return stored.filter(isKnownMcpToolName);
}

export function disabledAgentTools(stored: readonly string[] | null | undefined): McpToolName[] {
  const allowed = new Set(resolveAgentAllowedTools(stored));
  return defaultAgentAllowedTools().filter((tool) => !allowed.has(tool));
}

export function validateAgentAllowedToolsSelection(tools: readonly string[]): PolicyResult {
  if (tools.length === 0) {
    return deny("Escolha ao menos uma ferramenta MCP para este Agente de Bordo.");
  }
  const unknown = tools.filter((tool) => !isKnownMcpToolName(tool));
  if (unknown.length > 0) {
    return deny(`Ferramentas desconhecidas: ${unknown.join(", ")}`);
  }
  return { ok: true };
}

export function isAgentToolAllowed(stored: readonly string[] | null | undefined, toolName: string) {
  if (!isKnownMcpToolName(toolName)) return false;
  return resolveAgentAllowedTools(stored).includes(toolName);
}

export function validateAgentMcpToolCall(input: {
  allowedMcpTools: readonly string[] | null | undefined;
  toolName: string;
}): PolicyResult {
  if (!isAgentToolAllowed(input.allowedMcpTools, input.toolName)) {
    return deny(`Ferramenta "${input.toolName}" não está habilitada para este Agente de Bordo.`);
  }
  return { ok: true };
}
