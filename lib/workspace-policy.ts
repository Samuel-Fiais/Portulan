import {
  WORKSPACE_NAME_MAX,
  WORKSPACE_NAME_MIN,
  type DocumentVisibility,
  type WorkspaceInviteRole,
  type WorkspaceRole,
} from "./workspaces.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

/** Convidar, remover e alterar papéis da tripulação. */
export function canManageCrew(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

/** Nome do porto. */
export function canManageWorkspaceIdentity(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

/** Transferir capitania e afundar o porto. */
export function isCaptain(role: WorkspaceRole | null | undefined) {
  return role === "owner";
}

export function validateWorkspaceName(name: string): PolicyResult {
  const trimmed = name.trim();
  if (trimmed.length < WORKSPACE_NAME_MIN) {
    return deny(`O nome do porto precisa de pelo menos ${WORKSPACE_NAME_MIN} caracteres.`);
  }
  if (trimmed.length > WORKSPACE_NAME_MAX) {
    return deny(`O nome do porto vai até ${WORKSPACE_NAME_MAX} caracteres.`);
  }
  return ok;
}

/** RN-86: porto inicial só é criado quando a conta ainda não tem nenhum porto (idempotente). */
export function shouldCreatePersonalWorkspaceOnBootstrap(existingMembershipCount: number) {
  return existingMembershipCount === 0;
}

export function validateCrewInvite(input: {
  actorRole: WorkspaceRole | null;
  role: WorkspaceInviteRole;
}): PolicyResult {
  if (!canManageCrew(input.actorRole)) {
    return deny("Só capitão e imediato convidam para o porto.");
  }
  if (input.role === "admin" && input.actorRole !== "owner" && input.actorRole !== "admin") {
    return deny("Sem permissão para convidar imediatos.");
  }
  return ok;
}

export function validateRoleChange(input: {
  actorId: string;
  actorRole: WorkspaceRole | null;
  targetId: string;
  targetRole: WorkspaceRole;
  nextRole: WorkspaceRole;
}): PolicyResult {
  if (!canManageCrew(input.actorRole)) {
    return deny("Só capitão e imediato mudam papéis da tripulação.");
  }
  if (input.actorId === input.targetId) {
    return deny("Ninguém muda o próprio papel.");
  }
  if (input.targetRole === input.nextRole) {
    return deny("Esta pessoa já tem esse papel.");
  }
  if (input.targetRole === "owner") {
    return deny("A capitania muda pela transferência, não por troca de papel.");
  }
  if (input.nextRole === "owner") {
    return deny("Use Passar a capitania.");
  }
  if (input.actorRole === "admin" && input.targetRole === "admin") {
    return deny("Imediato não altera outro imediato.");
  }
  return ok;
}

export function validateCrewRemoval(input: {
  actorId: string;
  actorRole: WorkspaceRole | null;
  targetId: string;
  targetRole: WorkspaceRole;
}): PolicyResult {
  if (!canManageCrew(input.actorRole)) {
    return deny("Só capitão e imediato removem da tripulação.");
  }
  if (input.actorId === input.targetId) {
    return deny("Use Deixar o porto para sair.");
  }
  if (input.targetRole === "owner") {
    return deny("O capitão não pode ser removido. Transfira a capitania antes.");
  }
  if (input.actorRole === "admin" && input.targetRole === "admin") {
    return deny("Imediato não remove outro imediato.");
  }
  return ok;
}

export function validateLeaveWorkspace(input: {
  role: WorkspaceRole | null;
  isPersonal: boolean;
  membershipCount: number;
}): PolicyResult {
  if (!input.role) return deny("Você não faz parte deste porto.");
  if (input.isPersonal) return deny("O porto inicial não pode ser deixado.");
  if (input.role === "owner") {
    return deny("Transfira a capitania antes de deixar o porto.");
  }
  if (input.membershipCount <= 1) {
    return deny("Você precisa de pelo menos um porto.");
  }
  return ok;
}

export function validateCaptaincyTransfer(input: {
  actorId: string;
  actorRole: WorkspaceRole | null;
  targetId: string;
  targetRole: WorkspaceRole | null;
}): PolicyResult {
  if (!isCaptain(input.actorRole)) return deny("Só o capitão transfere a capitania.");
  if (input.actorId === input.targetId) return deny("Você já é o capitão.");
  if (!input.targetRole) return deny("Esta pessoa não faz parte do porto.");
  return ok;
}

export function validateWorkspaceDeletion(input: {
  role: WorkspaceRole | null;
  isPersonal: boolean;
  documentCount: number;
}): PolicyResult {
  if (!isCaptain(input.role)) return deny("Só o capitão afunda o porto.");
  if (input.isPersonal) return deny("O porto inicial não pode ser excluído.");
  if (input.documentCount > 0) {
    return deny("Mova ou exclua as cartas do porto antes de excluí-lo.");
  }
  return ok;
}

export type InviteState = {
  revokedAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
};

export function validateInviteRedemption(
  invite: InviteState | null,
  options: { now?: Date; alreadyMember?: boolean } = {},
): PolicyResult {
  if (!invite) return deny("Convite inválido ou já encerrado.");
  if (invite.revokedAt) return deny("Este convite foi revogado.");

  const now = options.now ?? new Date();
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return deny("Este convite expirou.");
  }
  if (invite.maxUses != null && invite.uses >= invite.maxUses) {
    return deny("Este convite atingiu o limite de usos.");
  }
  if (options.alreadyMember) {
    return deny("Você já faz parte deste porto.");
  }
  return ok;
}

/** Quem pode trocar o nível de visibilidade da carta: só o cartógrafo (responsável). */
export function validateVisibilityChange(input: {
  isOwner: boolean;
  visibility: DocumentVisibility;
  hasWorkspace: boolean;
}): PolicyResult {
  if (!input.isOwner) return deny("Só o cartógrafo muda a visibilidade da carta.");
  if (input.visibility === "workspace" && !input.hasWorkspace) {
    return deny("Esta carta não pertence a nenhum porto.");
  }
  return ok;
}

/** Colaborador convidado que não faz parte do porto da carta é sinalizado como externo. */
export function isExternalCollaborator(input: {
  workspaceMemberIds: readonly string[];
  userId: string | null;
}) {
  if (!input.userId) return true;
  return !input.workspaceMemberIds.includes(input.userId);
}
