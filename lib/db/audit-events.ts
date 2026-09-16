import "server-only";

import { and, desc, eq } from "drizzle-orm";
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
