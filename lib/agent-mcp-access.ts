import "server-only";

import { validateAgentMcpToolCall } from "@/lib/agent-tool-policy";
import { getAgentIdentity } from "@/lib/db/agent-identities";

export async function enforceAgentMcpToolCall(input: {
  agentIdentityId: string | null;
  workspaceId: string | null;
  toolName: string;
}) {
  if (!input.agentIdentityId) return { ok: true as const };
  if (!input.workspaceId) {
    return { ok: false as const, error: "Token sem porto." };
  }
  const identity = await getAgentIdentity(input.agentIdentityId, input.workspaceId);
  if (!identity) {
    return { ok: false as const, error: "Agente de Bordo não encontrado neste porto." };
  }
  if (identity.status !== "active") {
    return { ok: false as const, error: "Este Agente de Bordo está desativado." };
  }
  return validateAgentMcpToolCall({
    allowedMcpTools: identity.allowedMcpTools,
    toolName: input.toolName,
  });
}
