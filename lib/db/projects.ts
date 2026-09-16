import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contextPacks, projectRepositories, projects, repositories } from "@/lib/db/schema";
import { parseJsonArray, stringifyJsonArray } from "@/lib/db/json-text";
import type { ProjectRepositoryRole, RepositoryKind } from "@/lib/dev-context";

export type ProjectRecord = {
  id: string;
  workspaceId: string;
  name: string;
  objective: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  kind: RepositoryKind;
  remoteUrl: string | null;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRepositoryRecord = {
  id: string;
  projectId: string;
  repositoryId: string;
  role: ProjectRepositoryRole;
  pathScopes: string[];
  notes: string;
  repository?: RepositoryRecord;
};

function mapProject(row: typeof projects.$inferSelect): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    objective: row.objective,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRepository(row: typeof repositories.$inferSelect): RepositoryRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    kind: row.kind as RepositoryKind,
    remoteUrl: row.remoteUrl,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listProjects(workspaceId: string) {
  const db = await getDb();
  const rows = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.updatedAt));
  return rows.map(mapProject);
}

export async function getProject(id: string, workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .limit(1);
  return row ? mapProject(row) : null;
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  objective?: string;
  createdBy: string;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(projects)
    .values({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      objective: input.objective?.trim() ?? "",
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return mapProject(row);
}

export async function updateProject(
  id: string,
  workspaceId: string,
  input: { name?: string; objective?: string },
) {
  const db = await getDb();
  const [row] = await db
    .update(projects)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.objective !== undefined ? { objective: input.objective.trim() } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning();
  return row ? mapProject(row) : null;
}

export async function deleteProject(id: string, workspaceId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.workspaceId, workspaceId)))
    .returning({ id: projects.id });
  return deleted.length > 0;
}

export async function listRepositories(workspaceId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(repositories)
    .where(eq(repositories.workspaceId, workspaceId))
    .orderBy(desc(repositories.updatedAt));
  return rows.map(mapRepository);
}

export async function getRepository(id: string, workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.id, id), eq(repositories.workspaceId, workspaceId)))
    .limit(1);
  return row ? mapRepository(row) : null;
}

export async function findRepositoryByName(workspaceId: string, name: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.workspaceId, workspaceId), eq(repositories.name, name.trim())))
    .limit(1);
  return row ? mapRepository(row) : null;
}

export async function findRepositoryByRemote(workspaceId: string, remoteUrl: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(repositories)
    .where(and(eq(repositories.workspaceId, workspaceId), eq(repositories.remoteUrl, remoteUrl)))
    .limit(1);
  return row ? mapRepository(row) : null;
}

export async function createRepository(input: {
  workspaceId: string;
  name: string;
  kind: RepositoryKind;
  remoteUrl?: string | null;
  notes?: string;
  createdBy: string;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(repositories)
    .values({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      kind: input.kind,
      remoteUrl: input.remoteUrl?.trim() || null,
      notes: input.notes?.trim() ?? "",
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return mapRepository(row);
}

export async function updateRepository(
  id: string,
  workspaceId: string,
  input: { name?: string; kind?: RepositoryKind; remoteUrl?: string | null; notes?: string },
) {
  const db = await getDb();
  const [row] = await db
    .update(repositories)
    .set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.kind ? { kind: input.kind } : {}),
      ...(input.remoteUrl !== undefined ? { remoteUrl: input.remoteUrl?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(repositories.id, id), eq(repositories.workspaceId, workspaceId)))
    .returning();
  return row ? mapRepository(row) : null;
}

export async function listProjectRepositories(projectId: string, workspaceId: string) {
  const db = await getDb();
  const rows = await db
    .select({ link: projectRepositories, repository: repositories })
    .from(projectRepositories)
    .innerJoin(repositories, eq(projectRepositories.repositoryId, repositories.id))
    .innerJoin(projects, eq(projectRepositories.projectId, projects.id))
    .where(and(eq(projectRepositories.projectId, projectId), eq(projects.workspaceId, workspaceId)));

  return rows.map(
    (row): ProjectRepositoryRecord => ({
      id: row.link.id,
      projectId: row.link.projectId,
      repositoryId: row.link.repositoryId,
      role: row.link.role as ProjectRepositoryRole,
      pathScopes: parseJsonArray(row.link.pathScopes),
      notes: row.link.notes,
      repository: mapRepository(row.repository),
    }),
  );
}

export async function listProjectsForRepository(repositoryId: string, workspaceId: string) {
  const db = await getDb();
  const rows = await db
    .select({ project: projects, link: projectRepositories })
    .from(projectRepositories)
    .innerJoin(projects, eq(projectRepositories.projectId, projects.id))
    .where(and(eq(projectRepositories.repositoryId, repositoryId), eq(projects.workspaceId, workspaceId)));
  return rows.map((row) => ({
    ...mapProject(row.project),
    linkRole: row.link.role as ProjectRepositoryRole,
    pathScopes: parseJsonArray(row.link.pathScopes),
  }));
}

export async function linkProjectRepository(input: {
  projectId: string;
  repositoryId: string;
  role: ProjectRepositoryRole;
  pathScopes?: string[];
  notes?: string;
}) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(projectRepositories)
    .where(
      and(
        eq(projectRepositories.projectId, input.projectId),
        eq(projectRepositories.repositoryId, input.repositoryId),
      ),
    )
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(projectRepositories)
    .values({
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      role: input.role,
      pathScopes: stringifyJsonArray(input.pathScopes),
      notes: input.notes?.trim() ?? "",
    })
    .returning();
  return row;
}

export async function unlinkProjectRepository(projectId: string, repositoryId: string) {
  const db = await getDb();
  await db
    .delete(projectRepositories)
    .where(and(eq(projectRepositories.projectId, projectId), eq(projectRepositories.repositoryId, repositoryId)));
}

export async function countWorkspaceProjects(workspaceId: string) {
  const db = await getDb();
  const [row] = await db.select({ total: count() }).from(projects).where(eq(projects.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}

export async function countWorkspaceRepositories(workspaceId: string) {
  const db = await getDb();
  const [row] = await db.select({ total: count() }).from(repositories).where(eq(repositories.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}

export async function countWorkspacePacks(workspaceId: string) {
  const db = await getDb();
  const [row] = await db.select({ total: count() }).from(contextPacks).where(eq(contextPacks.workspaceId, workspaceId));
  return Number(row?.total ?? 0);
}
