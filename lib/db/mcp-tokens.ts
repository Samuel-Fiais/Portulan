import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mcpTokens } from "@/lib/db/schema";
import { mcpTokenExpiresAtFromPreset, type McpTokenExpirationPreset } from "@/lib/validation";

export type McpTokenRecord = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const LEGACY_MCP_TOKEN_NAME = "Agente MCP";

function mapRow(row: typeof mcpTokens.$inferSelect): McpTokenRecord {
  return {
    id: row.id,
    name: row.name?.trim() || LEGACY_MCP_TOKEN_NAME,
    tokenPrefix: row.tokenPrefix,
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

export async function validateMcpToken(token: string) {
  if (!token.startsWith("ptl_")) return null;

  const db = await getDb();
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(mcpTokens).where(eq(mcpTokens.tokenHash, tokenHash)).limit(1);
  if (!row || isExpired(row.expiresAt)) return null;

  await db
    .update(mcpTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(mcpTokens.id, row.id));

  return row.userId;
}
