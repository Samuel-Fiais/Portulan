import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mcpTokens } from "@/lib/db/schema";
import { getWorkspaceMembership } from "@/lib/db/workspaces";
import { validateMcpWorkspaceAccess } from "@/lib/mcp-token-policy";
import { mcpTokenExpiresAtFromPreset, type McpTokenExpirationPreset } from "@/lib/validation";

export type McpTokenRecord = {
  id: string;
  name: string;
  tokenPrefix: string;
  workspaceId: string | null;
  agentIdentityId: string | null;
  scopes: string;
  lastClientInfo: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

export type McpTokenIdentity = {
  userId: string;
  workspaceId: string | null;
  tokenId: string;
  agentIdentityId: string | null;
  lastClientInfo: unknown;
};

function parseClientInfo(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const LEGACY_MCP_TOKEN_NAME = "Agente MCP";

function mapRow(row: typeof mcpTokens.$inferSelect): McpTokenRecord {
  return {
    id: row.id,
    name: row.name?.trim() || LEGACY_MCP_TOKEN_NAME,
    tokenPrefix: row.tokenPrefix,
    workspaceId: row.workspaceId ?? null,
    agentIdentityId: row.agentIdentityId ?? null,
    scopes: row.scopes ?? "[]",
    lastClientInfo: row.lastClientInfo ?? null,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt ?? null,
  };
}

function isExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function listMcpTokens(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(mcpTokens)
    .where(eq(mcpTokens.userId, userId))
    .orderBy(desc(mcpTokens.createdAt));
  return rows.map(mapRow);
}

export async function createMcpToken(
  userId: string,
  name: string,
  expiration: McpTokenExpirationPreset,
  workspaceId: string | null = null,
  agentIdentityId: string | null = null,
) {
  const db = await getDb();
  const raw = randomBytes(32).toString("base64url");
  const token = `ptl_${raw}`;
  const tokenHash = hashToken(token);
  const tokenPrefix = token.slice(0, 12);
  const expiresAt = mcpTokenExpiresAtFromPreset(expiration);

  const [row] = await db
    .insert(mcpTokens)
    .values({
      userId,
      workspaceId,
      agentIdentityId,
      name,
      tokenHash,
      tokenPrefix,
      expiresAt,
    })
    .returning();

  return { token, record: mapRow(row) };
}

export async function revokeMcpToken(userId: string, tokenId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(mcpTokens)
    .where(eq(mcpTokens.id, tokenId))
    .returning({ id: mcpTokens.id, userId: mcpTokens.userId });

  const match = deleted[0];
  if (!match || match.userId !== userId) return false;
  return true;
}

export async function validateMcpToken(token: string): Promise<McpTokenIdentity | null> {
  if (!token.startsWith("ptl_")) return null;

  const db = await getDb();
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(mcpTokens).where(eq(mcpTokens.tokenHash, tokenHash)).limit(1);
  if (!row || isExpired(row.expiresAt)) return null;

  const workspaceId = row.workspaceId ?? null;
  if (workspaceId) {
    const membership = await getWorkspaceMembership(workspaceId, row.userId);
    const access = validateMcpWorkspaceAccess({
      workspaceId,
      isMember: Boolean(membership),
    });
    if (!access.ok) return null;
  }

  if (row.agentIdentityId && workspaceId) {
    const { getAgentIdentity } = await import("@/lib/db/agent-identities");
    const agentIdentity = await getAgentIdentity(row.agentIdentityId, workspaceId);
    if (!agentIdentity || agentIdentity.status !== "active") return null;
  }

  await db
    .update(mcpTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(mcpTokens.id, row.id));

  return {
    userId: row.userId,
    workspaceId,
    tokenId: row.id,
    agentIdentityId: row.agentIdentityId ?? null,
    lastClientInfo: parseClientInfo(row.lastClientInfo),
  };
}

export async function revokeMcpTokensForWorkspaceUser(workspaceId: string, userId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(mcpTokens)
    .where(and(eq(mcpTokens.workspaceId, workspaceId), eq(mcpTokens.userId, userId)))
    .returning({ id: mcpTokens.id });
  return deleted.length;
}

export async function revokeMcpTokensForAgentIdentity(agentIdentityId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(mcpTokens)
    .where(eq(mcpTokens.agentIdentityId, agentIdentityId))
    .returning({ id: mcpTokens.id });
  return deleted.length;
}

export async function recordMcpClientInfo(tokenId: string, clientInfo: unknown) {
  const db = await getDb();
  await db
    .update(mcpTokens)
    .set({ lastClientInfo: JSON.stringify(clientInfo) })
    .where(eq(mcpTokens.id, tokenId));
}
