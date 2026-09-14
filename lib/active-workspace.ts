import "server-only";

import { cookies } from "next/headers";
import {
  ensurePersonalWorkspace,
  listUserWorkspaces,
} from "@/lib/db/workspaces";
import type { WorkspaceMembership } from "@/lib/workspaces";

export const ACTIVE_WORKSPACE_COOKIE = "portulan_porto";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function readActiveWorkspaceId() {
  const jar = await cookies();
  return jar.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export type WorkspaceContext = {
  active: WorkspaceMembership | null;
  workspaces: WorkspaceMembership[];
};

/**
 * Porto ativo da sessão: o do cookie quando a pessoa ainda faz parte dele,
 * senão o primeiro da lista. Quem não tem nenhum ganha o porto inicial.
 */
export async function resolveWorkspaceContext(userId: string | null | undefined): Promise<WorkspaceContext> {
  if (!userId) return { active: null, workspaces: [] };

  let memberships = await listUserWorkspaces(userId);
  if (memberships.length === 0) {
    const created = await ensurePersonalWorkspace(userId);
    memberships = created ? [created] : [];
  }
  if (memberships.length === 0) return { active: null, workspaces: [] };

  const preferredId = await readActiveWorkspaceId();
  const active = memberships.find((item) => item.id === preferredId) ?? memberships[0];
  return { active, workspaces: memberships };
}

export async function requireWorkspaceContext(userId: string) {
  const context = await resolveWorkspaceContext(userId);
  if (!context.active) {
    throw new Error("Nenhum porto disponível para esta conta.");
  }
  return { active: context.active, workspaces: context.workspaces };
}
