import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agentIdentities } from "@/lib/db/schema";
import { parseJsonArray, stringifyJsonArray } from "@/lib/db/json-text";
import { defaultAgentAllowedTools, resolveAgentAllowedTools } from "@/lib/agent-tool-policy";
import {
  agentIdentityStatuses,
  agentWorkModes,
  type AgentIdentityStatus,
  type AgentWorkMode,
} from "@/lib/dev-context";

export type AgentIdentityRecord = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  name: string;
  workMode: AgentWorkMode;
  allowedMcpTools: string[];
  status: AgentIdentityStatus;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: typeof agentIdentities.$inferSelect): AgentIdentityRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    ownerUserId: row.ownerUserId,
    name: row.name,
    workMode: (agentWorkModes.includes(row.workMode as AgentWorkMode) ? row.workMode : "context_and_coordination") as AgentWorkMode,
    allowedMcpTools: resolveAgentAllowedTools(parseJsonArray(row.allowedMcpTools)),
    status: (agentIdentityStatuses.includes(row.status as AgentIdentityStatus) ? row.status : "active") as AgentIdentityStatus,
    deactivatedAt: row.deactivatedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAgentIdentities(workspaceId: string, ownerUserId?: string) {
  const db = await getDb();
  const rows = ownerUserId
    ? await db
        .select()
        .from(agentIdentities)
        .where(and(eq(agentIdentities.workspaceId, workspaceId), eq(agentIdentities.ownerUserId, ownerUserId)))
        .orderBy(desc(agentIdentities.createdAt))
    : await db
        .select()
        .from(agentIdentities)
        .where(eq(agentIdentities.workspaceId, workspaceId))
        .orderBy(desc(agentIdentities.createdAt));
  return rows.map(mapRow);
}

export async function getAgentIdentity(id: string, workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(agentIdentities)
    .where(and(eq(agentIdentities.id, id), eq(agentIdentities.workspaceId, workspaceId)))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function getAgentIdentityById(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(agentIdentities).where(eq(agentIdentities.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function createAgentIdentity(input: {
  workspaceId: string;
  ownerUserId: string;
  name: string;
  workMode: AgentWorkMode;
  allowedMcpTools?: readonly string[];
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const allowedMcpTools = input.allowedMcpTools?.length
    ? [...input.allowedMcpTools]
    : defaultAgentAllowedTools();
  const [row] = await db
    .insert(agentIdentities)
    .values({
      workspaceId: input.workspaceId,
      ownerUserId: input.ownerUserId,
      name: input.name.trim(),
      workMode: input.workMode,
      allowedMcpTools: stringifyJsonArray(allowedMcpTools),
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return mapRow(row);
}

export async function updateAgentIdentity(
  id: string,
  workspaceId: string,
  input: { name?: string; workMode?: AgentWorkMode; allowedMcpTools?: readonly string[] },
  ownerUserId?: string,
) {
  const db = await getDb();
  const [row] = await db
    .update(agentIdentities)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.workMode ? { workMode: input.workMode } : {}),
      ...(input.allowedMcpTools
        ? { allowedMcpTools: stringifyJsonArray(input.allowedMcpTools) }
        : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(
      ownerUserId
        ? and(
            eq(agentIdentities.id, id),
            eq(agentIdentities.workspaceId, workspaceId),
            eq(agentIdentities.ownerUserId, ownerUserId),
          )
        : and(eq(agentIdentities.id, id), eq(agentIdentities.workspaceId, workspaceId)),
    )
    .returning();
  return row ? mapRow(row) : null;
}

export async function setAgentIdentityStatus(
  id: string,
  workspaceId: string,
  ownerUserId: string,
  status: AgentIdentityStatus,
) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .update(agentIdentities)
    .set({
      status,
      deactivatedAt: status === "inactive" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(agentIdentities.id, id),
        eq(agentIdentities.workspaceId, workspaceId),
        eq(agentIdentities.ownerUserId, ownerUserId),
      ),
    )
    .returning();
  return row ? mapRow(row) : null;
}

export async function deleteAgentIdentity(id: string, workspaceId: string, ownerUserId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(agentIdentities)
    .where(
      and(
        eq(agentIdentities.id, id),
        eq(agentIdentities.workspaceId, workspaceId),
        eq(agentIdentities.ownerUserId, ownerUserId),
      ),
    )
    .returning({ id: agentIdentities.id });
  return deleted.length > 0;
}
