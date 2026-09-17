import "server-only";

import { resolveDocumentSharesForUser } from "@/lib/db/document-shares";
import type { DocumentAccessContext } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { getUserById } from "@/lib/users";

export async function documentAccessContext(userId?: string | null): Promise<DocumentAccessContext> {
  if (!userId) return { userId: null, userEmail: null, workspaceIds: [], activeWorkspaceId: null };

  const user = await getUserById(userId);
  const userEmail = user?.email ?? null;
  await resolveDocumentSharesForUser(userId, userEmail);

  const { active, workspaces } = await resolveWorkspaceContext(userId);
  const workspaceIds = workspaces.map((item) => item.id);

  return { userId, userEmail, workspaceIds, activeWorkspaceId: active?.id ?? null };
}

/** Recorte de gabaritos: o que a pessoa enxerga (porto ativo) e o que ela altera (capitania). */
export async function templateAccessContext(userId: string, workspaceId?: string | null) {
  const { active, workspaces } = await resolveWorkspaceContext(userId);
  const scoped = workspaceId
    ? workspaces.find((item) => item.id === workspaceId) ?? active
    : active;

  return {
    userId,
    workspaceId: scoped?.id ?? null,
    workspaceIds: workspaces.map((item) => item.id),
    manageableWorkspaceIds: workspaces
      .filter((item) => item.role === "owner" || item.role === "admin")
      .map((item) => item.id),
  };
}

/** Contexto de acesso preso a um porto específico (MCP com token de porto, convites). */
export async function workspaceScopedAccessContext(
  userId: string,
  workspaceId: string | null,
): Promise<DocumentAccessContext> {
  const user = await getUserById(userId);
  const userEmail = user?.email ?? null;
  await resolveDocumentSharesForUser(userId, userEmail);
  const { active, workspaces } = await resolveWorkspaceContext(userId);
  const workspaceIds = workspaces.map((item) => item.id);
  const activeWorkspaceId =
    workspaceId && workspaceIds.includes(workspaceId) ? workspaceId : active?.id ?? null;

  return { userId, userEmail, workspaceIds, activeWorkspaceId };
}
