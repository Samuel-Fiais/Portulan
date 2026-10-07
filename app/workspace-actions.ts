"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  countWorkspaceDocuments,
  createWorkspace,
  createWorkspaceInvite,
  deleteWorkspace,
  findWorkspaceInviteByToken,
  getWorkspaceMembership,
  listUserWorkspaces,
  listWorkspaceInvites,
  listWorkspaceMembers,
  redeemWorkspaceInvite,
  removeWorkspaceMember,
  revokeMcpTokensForWorkspaceUser,
  revokeWorkspaceInvite,
  setWorkspaceMemberRole,
  transferWorkspaceCaptaincy,
  updateWorkspaceIdentity,
} from "@/lib/db";
import { setActiveWorkspaceCookie } from "@/lib/active-workspace";
import {
  canManageCrew,
  canManageWorkspaceIdentity,
  isCaptain,
  validateCaptaincyTransfer,
  validateCrewInvite,
  validateCrewRemoval,
  validateInviteRedemption,
  validateLeaveWorkspace,
  validateRoleChange,
  validateWorkspaceDeletion,
  validateWorkspaceName,
} from "@/lib/workspace-policy";
import { liveAnnounceCommand } from "@/lib/collab-live-actions";
import {
  workspaceIdentitySchema,
  workspaceInputSchema,
  workspaceInviteExpiresAt,
  workspaceInviteInputSchema,
  workspaceRoleSchema,
} from "@/lib/validation";

const NOT_SIGNED_IN = "Faça login para administrar portos." as const;
const NOT_CREW = "Você não faz parte deste porto." as const;

async function requireMembership(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: NOT_SIGNED_IN };
  const membership = await getWorkspaceMembership(workspaceId, session.user.id);
  if (!membership) return { ok: false as const, error: NOT_CREW };
  return { ok: true as const, userId: session.user.id, membership };
}

function revalidateWorkspaceSurfaces() {
  revalidatePath("/", "layout");
  revalidatePath("/workspace");
}

export async function switchWorkspaceAction(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: NOT_SIGNED_IN };

  const membership = await getWorkspaceMembership(workspaceId, session.user.id);
  if (!membership) return { ok: false as const, error: NOT_CREW };

  await setActiveWorkspaceCookie(workspaceId);
  revalidateWorkspaceSurfaces();
  return { ok: true as const, workspace: membership };
}

export async function createWorkspaceAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: NOT_SIGNED_IN };

  const parsed = workspaceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise o nome do porto." };

  const name = validateWorkspaceName(parsed.data.name);
  if (!name.ok) return { ok: false as const, error: name.error };

  const workspace = await createWorkspace(session.user.id, parsed.data.name);
  await setActiveWorkspaceCookie(workspace.id);
  revalidateWorkspaceSurfaces();
  return { ok: true as const, workspace };
}

export async function updateWorkspaceAction(workspaceId: string, input: unknown) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  if (!canManageWorkspaceIdentity(context.membership.role)) {
    return { ok: false as const, error: "Só capitão e imediato mudam o nome do porto." };
  }

  const parsed = workspaceIdentitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise o nome do porto." };

  if (parsed.data.name !== undefined) {
    const name = validateWorkspaceName(parsed.data.name);
    if (!name.ok) return { ok: false as const, error: name.error };
  }

  const workspace = await updateWorkspaceIdentity(workspaceId, parsed.data);
  if (!workspace) return { ok: false as const, error: "Porto não encontrado." };

  revalidateWorkspaceSurfaces();
  return { ok: true as const, workspace };
}

export async function listWorkspaceCrewAction(workspaceId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const [members, invites] = await Promise.all([
    listWorkspaceMembers(workspaceId),
    canManageCrew(context.membership.role) ? listWorkspaceInvites(workspaceId) : Promise.resolve([]),
  ]);

  return { ok: true as const, members, invites, role: context.membership.role };
}

export async function setWorkspaceMemberRoleAction(
  workspaceId: string,
  targetUserId: string,
  input: unknown,
) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const parsed = workspaceRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Papel inválido." };

  const members = await listWorkspaceMembers(workspaceId);
  const target = members.find((member) => member.userId === targetUserId);
  if (!target) return { ok: false as const, error: "Esta pessoa não faz parte do porto." };

  const validated = validateRoleChange({
    actorId: context.userId,
    actorRole: context.membership.role,
    targetId: targetUserId,
    targetRole: target.role,
    nextRole: parsed.data,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  await setWorkspaceMemberRole(workspaceId, targetUserId, parsed.data);
  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.member.role_changed",
    actor: { userId: context.userId },
    idempotencyKey: `role-${targetUserId}-${parsed.data}`,
    payload: { targetUserId, role: parsed.data },
  });
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function removeWorkspaceMemberAction(workspaceId: string, targetUserId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const members = await listWorkspaceMembers(workspaceId);
  const target = members.find((member) => member.userId === targetUserId);
  if (!target) return { ok: false as const, error: "Esta pessoa não faz parte do porto." };

  const validated = validateCrewRemoval({
    actorId: context.userId,
    actorRole: context.membership.role,
    targetId: targetUserId,
    targetRole: target.role,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  await removeWorkspaceMember(workspaceId, targetUserId);
  await revokeMcpTokensForWorkspaceUser(workspaceId, targetUserId);
  const { revokeCollabAccessForWorkspaceMember } = await import("@/lib/collab-revocation");
  await revokeCollabAccessForWorkspaceMember(workspaceId, targetUserId);
  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.member.removed",
    actor: { userId: context.userId },
    idempotencyKey: `removed-${targetUserId}`,
    payload: { targetUserId },
  });
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function leaveWorkspaceAction(workspaceId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const memberships = await listUserWorkspaces(context.userId);
  const validated = validateLeaveWorkspace({
    role: context.membership.role,
    isPersonal: context.membership.isPersonal,
    membershipCount: memberships.length,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  await removeWorkspaceMember(workspaceId, context.userId);
  await revokeMcpTokensForWorkspaceUser(workspaceId, context.userId);
  const { revokeCollabAccessForWorkspaceMember } = await import("@/lib/collab-revocation");
  await revokeCollabAccessForWorkspaceMember(workspaceId, context.userId);
  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.member.left",
    actor: { userId: context.userId },
    idempotencyKey: `left-${context.userId}`,
  });
  const remaining = memberships.find((item) => item.id !== workspaceId);
  if (remaining) await setActiveWorkspaceCookie(remaining.id);
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function transferCaptaincyAction(workspaceId: string, targetUserId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const members = await listWorkspaceMembers(workspaceId);
  const target = members.find((member) => member.userId === targetUserId);

  const validated = validateCaptaincyTransfer({
    actorId: context.userId,
    actorRole: context.membership.role,
    targetId: targetUserId,
    targetRole: target?.role ?? null,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  await transferWorkspaceCaptaincy(workspaceId, context.userId, targetUserId);
  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.captaincy.transferred",
    actor: { userId: context.userId },
    idempotencyKey: `captaincy-${targetUserId}`,
    payload: { targetUserId },
  });
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function deleteWorkspaceAction(workspaceId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const documentCount = await countWorkspaceDocuments(workspaceId);
  const validated = validateWorkspaceDeletion({
    role: context.membership.role,
    isPersonal: context.membership.isPersonal,
    documentCount,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  await deleteWorkspace(workspaceId);
  const remaining = (await listUserWorkspaces(context.userId))[0];
  if (remaining) await setActiveWorkspaceCookie(remaining.id);
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function createWorkspaceInviteAction(workspaceId: string, input: unknown) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  const parsed = workspaceInviteInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do convite inválidos." };

  const validated = validateCrewInvite({ actorRole: context.membership.role, role: parsed.data.role });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  const { token, invite } = await createWorkspaceInvite({
    workspaceId,
    createdBy: context.userId,
    role: parsed.data.role,
    expiresAt: workspaceInviteExpiresAt(parsed.data.expiration),
    maxUses: parsed.data.maxUses,
  });

  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.invite.created",
    actor: { userId: context.userId },
    idempotencyKey: `invite-${invite.id}`,
    payload: { inviteId: invite.id, role: parsed.data.role },
  });
  revalidateWorkspaceSurfaces();
  return { ok: true as const, token, invite };
}

export async function revokeWorkspaceInviteAction(workspaceId: string, inviteId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;

  if (!canManageCrew(context.membership.role)) {
    return { ok: false as const, error: "Só capitão e imediato revogam convites." };
  }

  const revoked = await revokeWorkspaceInvite(workspaceId, inviteId);
  if (!revoked) return { ok: false as const, error: "Convite não encontrado." };
  await liveAnnounceCommand({
    workspaceId,
    subjectType: "workspace",
    subjectId: workspaceId,
    command: "workspace.invite.revoked",
    actor: { userId: context.userId },
    idempotencyKey: `invite-revoked-${inviteId}`,
    payload: { inviteId },
  });
  revalidateWorkspaceSurfaces();
  return { ok: true as const };
}

export async function acceptWorkspaceInviteAction(token: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: NOT_SIGNED_IN };

  const found = await findWorkspaceInviteByToken(token);
  if (!found) return { ok: false as const, error: "Convite inválido ou já encerrado." };

  const membership = await getWorkspaceMembership(found.workspace.id, session.user.id);
  const validated = validateInviteRedemption(found.invite, { alreadyMember: Boolean(membership) });
  if (!validated.ok) {
    if (membership) await setActiveWorkspaceCookie(found.workspace.id);
    return { ok: false as const, error: validated.error };
  }

  const joined = await redeemWorkspaceInvite(found.invite.id, session.user.id, found.invite.role);
  if (!joined) return { ok: false as const, error: "Não foi possível entrar no porto." };

  await setActiveWorkspaceCookie(found.workspace.id);
  revalidateWorkspaceSurfaces();
  return { ok: true as const, workspace: joined };
}

export async function currentWorkspaceRoleAction(workspaceId: string) {
  const context = await requireMembership(workspaceId);
  if (!context.ok) return context;
  return {
    ok: true as const,
    role: context.membership.role,
    canManageCrew: canManageCrew(context.membership.role),
    isCaptain: isCaptain(context.membership.role),
  };
}
