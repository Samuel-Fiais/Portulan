import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { sanitizeAuditPayload, type AuditEventDraft } from "@/lib/audit-policy";

export type AuditEventRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId: string | null;
  clientInfo: string | null;
  payload: string | null;
  createdAt: string;
};

function mapRow(row: typeof auditEvents.$inferSelect): AuditEventRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    agentIdentityId: row.agentIdentityId,
    mcpTokenId: row.mcpTokenId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    correlationId: row.correlationId,
    clientInfo: row.clientInfo,
    payload: row.payload,
    createdAt: row.createdAt,
  };
}

export async function recordAuditEvent(input: AuditEventDraft) {
  const db = await getDb();
  const payload = sanitizeAuditPayload(input.payload ?? undefined);
  const [row] = await db
    .insert(auditEvents)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentIdentityId: input.agentIdentityId,
      mcpTokenId: input.mcpTokenId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      correlationId: input.correlationId ?? null,
      clientInfo: input.clientInfo ? JSON.stringify(input.clientInfo) : null,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .returning();
  return mapRow(row);
}

export async function listAuditEvents(workspaceId: string, limit = 50) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, workspaceId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map(mapRow);
}

export async function listAuditEventsForIdentity(workspaceId: string, agentIdentityId: string, limit = 20) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.workspaceId, workspaceId), eq(auditEvents.agentIdentityId, agentIdentityId)))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map(mapRow);
}

export type AuditEventQuery = {
  workspaceId: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  agentIdentityId?: string;
  correlationId?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
};

/** Diário pesquisável por identidade, ferramenta, alvo, período e correlação (RN-122). */
export async function queryAuditEvents(input: AuditEventQuery) {
  const db = await getDb();
  const clauses = [eq(auditEvents.workspaceId, input.workspaceId)];
  if (input.action) clauses.push(eq(auditEvents.action, input.action));
  if (input.targetType) clauses.push(eq(auditEvents.targetType, input.targetType));
  if (input.targetId) clauses.push(eq(auditEvents.targetId, input.targetId));
  if (input.agentIdentityId) clauses.push(eq(auditEvents.agentIdentityId, input.agentIdentityId));
  if (input.correlationId) clauses.push(eq(auditEvents.correlationId, input.correlationId));
  if (input.createdAfter) clauses.push(gte(auditEvents.createdAt, input.createdAfter));
  if (input.createdBefore) clauses.push(lte(auditEvents.createdAt, input.createdBefore));

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(...clauses))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map(mapRow);
}

export async function countAuditEventsForWorkspace(workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, workspaceId));
  return row?.count ?? 0;
}
