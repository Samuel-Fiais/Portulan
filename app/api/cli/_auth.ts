import { NextResponse } from "next/server";
import { validateMcpToken } from "@/lib/db/mcp-tokens";
import { getWorkspaceMembership } from "@/lib/db/workspaces";
import type { McpTokenIdentity } from "@/lib/db/mcp-tokens";
import type { WorkspaceRole } from "@/lib/workspaces";

export type CliAuth = McpTokenIdentity & { role: WorkspaceRole; workspaceId: string };

export async function authenticateCliRequest(request: Request): Promise<CliAuth | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token MCP ausente." }, { status: 401 });
  }
  const identity = await validateMcpToken(authHeader.slice("Bearer ".length).trim());
  if (!identity?.workspaceId) {
    return NextResponse.json({ error: "Token MCP inválido ou sem porto." }, { status: 401 });
  }
  const membership = await getWorkspaceMembership(identity.workspaceId, identity.userId);
  if (!membership) {
    return NextResponse.json({ error: "Token sem acesso a este porto." }, { status: 403 });
  }
  return { ...identity, workspaceId: identity.workspaceId, role: membership.role };
}
