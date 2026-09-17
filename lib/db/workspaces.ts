import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documents, users, workspaceInvites, workspaceMembers, workspaces } from "@/lib/db/schema";
import { getUserById } from "@/lib/users";
import { shouldCreatePersonalWorkspaceOnBootstrap } from "@/lib/workspace-policy";
import {
  personalWorkspaceName,
  type WorkspaceInviteRecord,
  type WorkspaceInviteRole,
  type WorkspaceMemberRecord,
  type WorkspaceMembership,
  type WorkspaceRecord,
  type WorkspaceRole,
} from "@/lib/workspaces";
import type { ThemeMode, ThemePaperId } from "@/lib/workspace-themes";

type WorkspaceRow = typeof workspaces.$inferSelect;

function mapWorkspace(row: WorkspaceRow): WorkspaceRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    themePaper: row.themePaper as ThemePaperId,
    themeMode: row.themeMode as ThemeMode,
    themeInk: row.themeInk,
    isPersonal: row.isPersonal,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function workspaceSlug(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "porto"}-${suffix}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceMembership[]> {
  const db = await getDb();
  const memberCount = db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      total: count().as("total"),
    })
    .from(workspaceMembers)
    .groupBy(workspaceMembers.workspaceId)
    .as("member_count");

  const rows = await db
    .select({ workspace: workspaces, role: workspaceMembers.role, total: memberCount.total })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .leftJoin(memberCount, eq(memberCount.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.isPersonal), asc(workspaces.createdAt));

  return rows.map((row) => ({
    ...mapWorkspace(row.workspace),
    role: row.role as WorkspaceRole,
    memberCount: Number(row.total ?? 1),
  }));
}

export async function listUserWorkspaceIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  return rows.map((row) => row.workspaceId);
}

export async function getWorkspaceMembership(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMembership | null> {
  const db = await getDb();
  const [row] = await db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  if (!row) return null;
  const [{ total } = { total: 1 }] = await db
    .select({ total: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return { ...mapWorkspace(row.workspace), role: row.role as WorkspaceRole, memberCount: Number(total) };
}

export async function getWorkspace(workspaceId: string): Promise<WorkspaceRecord | null> {
  const db = await getDb();
  const [row] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return row ? mapWorkspace(row) : null;
}

export async function createWorkspace(
  userId: string,
  name: string,
  options?: { isPersonal?: boolean },
): Promise<WorkspaceMembership> {
  const db = await getDb();
  const trimmed = name.trim();
  const [row] = await db
    .insert(workspaces)
    .values({
      slug: workspaceSlug(trimmed),
      name: trimmed,
      isPersonal: options?.isPersonal ?? false,
      createdBy: userId,
    })
    .returning();

  await db.insert(workspaceMembers).values({ workspaceId: row.id, userId, role: "owner" });
  return { ...mapWorkspace(row), role: "owner", memberCount: 1 };
}

/** Todo usuário tem um porto inicial. Criado no cadastro e garantido de forma preguiçosa. */
export async function ensurePersonalWorkspace(userId: string): Promise<WorkspaceMembership | null> {
  const existing = await listUserWorkspaces(userId);
  if (!shouldCreatePersonalWorkspaceOnBootstrap(existing.length)) return existing[0];

  const user = await getUserById(userId);
  if (!user) return null;

  return createWorkspace(userId, personalWorkspaceName(user.name, user.login), { isPersonal: true });
}

export async function updateWorkspaceIdentity(
  workspaceId: string,
  input: { name?: string; themePaper?: string; themeMode?: string; themeInk?: string },
): Promise<WorkspaceRecord | null> {
  const db = await getDb();
  const patch: Partial<typeof workspaces.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.themePaper !== undefined) patch.themePaper = input.themePaper;
  if (input.themeMode !== undefined) patch.themeMode = input.themeMode;
  if (input.themeInk !== undefined) patch.themeInk = input.themeInk;
  if (Object.keys(patch).length === 0) return getWorkspace(workspaceId);

  const [row] = await db.update(workspaces).set(patch).where(eq(workspaces.id, workspaceId)).returning();
  return row ? mapWorkspace(row) : null;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
  const db = await getDb();
  const rows = await db
    .select({ member: workspaceMembers, user: users })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));

  return rows.map(({ member, user }) => ({
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role as WorkspaceRole,
    createdAt: member.createdAt,
    login: user.login,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }));
}

export async function listWorkspaceMemberIds(workspaceId: string | null): Promise<string[]> {
  if (!workspaceId) return [];
  const db = await getDb();
  const rows = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  return rows.map((row) => row.userId);
}

export async function setWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
  const db = await getDb();
  const updated = await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning({ id: workspaceMembers.id });
  return updated.length > 0;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning({ id: workspaceMembers.id });
  return deleted.length > 0;
}

export async function transferWorkspaceCaptaincy(
  workspaceId: string,
  currentOwnerId: string,
  nextOwnerId: string,
) {
  const db = await getDb();
  await db
    .update(workspaceMembers)
    .set({ role: "owner" })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, nextOwnerId)));
  await db
    .update(workspaceMembers)
    .set({ role: "admin" })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, currentOwnerId)));
  return true;
}

export async function countWorkspaceDocuments(workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ total: count() })
    .from(documents)
    .where(eq(documents.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}

export async function deleteWorkspace(workspaceId: string) {
  const db = await getDb();
  const deleted = await db.delete(workspaces).where(eq(workspaces.id, workspaceId)).returning({ id: workspaces.id });
  return deleted.length > 0;
}

function mapInvite(
  row: typeof workspaceInvites.$inferSelect,
  createdByName?: string | null,
): WorkspaceInviteRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    role: row.role as WorkspaceInviteRole,
    createdBy: row.createdBy,
    createdByName: createdByName ?? null,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    uses: row.uses,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export async function createWorkspaceInvite(input: {
  workspaceId: string;
  createdBy: string;
  role: WorkspaceInviteRole;
  expiresAt: string | null;
  maxUses: number | null;
}) {
  const db = await getDb();
  const token = `ptli_${randomBytes(24).toString("base64url")}`;
  const [row] = await db
    .insert(workspaceInvites)
    .values({
      workspaceId: input.workspaceId,
      tokenHash: hashInviteToken(token),
      tokenPrefix: token.slice(0, 12),
      role: input.role,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt,
      maxUses: input.maxUses,
    })
    .returning();

  return { token, invite: mapInvite(row) };
}

export async function listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInviteRecord[]> {
  const db = await getDb();
  const rows = await db
    .select({ invite: workspaceInvites, creatorName: users.name, creatorLogin: users.login })
    .from(workspaceInvites)
    .leftJoin(users, eq(workspaceInvites.createdBy, users.id))
    .where(eq(workspaceInvites.workspaceId, workspaceId))
    .orderBy(desc(workspaceInvites.createdAt));

  return rows.map(({ invite, creatorName, creatorLogin }) =>
    mapInvite(invite, creatorName ?? creatorLogin),
  );
}

export async function revokeWorkspaceInvite(workspaceId: string, inviteId: string) {
  const db = await getDb();
  const updated = await db
    .update(workspaceInvites)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspaceId)))
    .returning({ id: workspaceInvites.id });
  return updated.length > 0;
}

export async function findWorkspaceInviteByToken(token: string) {
  const db = await getDb();
  const [row] = await db
    .select({ invite: workspaceInvites, workspace: workspaces })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaceInvites.workspaceId, workspaces.id))
    .where(eq(workspaceInvites.tokenHash, hashInviteToken(token)))
    .limit(1);

  if (!row) return null;
  return { invite: mapInvite(row.invite), workspace: mapWorkspace(row.workspace) };
}

/** Consome um uso do convite e adiciona a pessoa à tripulação. */
export async function redeemWorkspaceInvite(inviteId: string, userId: string, role: WorkspaceInviteRole) {
  const db = await getDb();
  const [invite] = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.id, inviteId))
    .limit(1);
  if (!invite) return null;

  await db
    .insert(workspaceMembers)
    .values({ workspaceId: invite.workspaceId, userId, role })
    .onConflictDoNothing();

  await db
    .update(workspaceInvites)
    .set({ uses: sql`${workspaceInvites.uses} + 1` })
    .where(eq(workspaceInvites.id, inviteId));

  return getWorkspaceMembership(invite.workspaceId, userId);
}

export async function countWorkspaceOwners(workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ total: count() })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "owner")));
  return Number(row?.total ?? 0);
}

export async function listWorkspaceCrewOtherThan(workspaceId: string, userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ userId: workspaceMembers.userId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), ne(workspaceMembers.userId, userId)));
  return rows.map((row) => ({ userId: row.userId, role: row.role as WorkspaceRole }));
}
