import type { WorkspaceRole } from "./workspaces.ts";
import {
  PROJECT_NAME_MAX,
  PROJECT_NAME_MIN,
  REPOSITORY_NAME_MAX,
  REPOSITORY_NAME_MIN,
  isWorkspaceOfficer,
  projectRepositoryRoles,
  repositoryKinds,
  type ProjectRepositoryRole,
  type RepositoryKind,
} from "./dev-context.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

export function canMutateProject(role: WorkspaceRole | null | undefined) {
  return Boolean(role);
}

export function canDeleteProject(role: WorkspaceRole | null | undefined) {
  return isWorkspaceOfficer(role);
}

export function validateProjectName(name: string): PolicyResult {
  const trimmed = name.trim();
  if (trimmed.length < PROJECT_NAME_MIN) {
    return deny(`O nome da Expedição precisa de pelo menos ${PROJECT_NAME_MIN} caracteres.`);
  }
  if (trimmed.length > PROJECT_NAME_MAX) {
    return deny(`O nome da Expedição vai até ${PROJECT_NAME_MAX} caracteres.`);
  }
  return ok;
}

export function validateRepositoryName(name: string): PolicyResult {
  const trimmed = name.trim();
  if (trimmed.length < REPOSITORY_NAME_MIN) {
    return deny(`O nome da Embarcação precisa de pelo menos ${REPOSITORY_NAME_MIN} caracteres.`);
  }
  if (trimmed.length > REPOSITORY_NAME_MAX) {
    return deny(`O nome da Embarcação vai até ${REPOSITORY_NAME_MAX} caracteres.`);
  }
  return ok;
}

export function validateRepositoryKind(kind: string): PolicyResult {
  if (!repositoryKinds.includes(kind as RepositoryKind)) {
    return deny("A Embarcação precisa ser Git, local ou ambas.");
  }
  return ok;
}

export function validateAbsoluteLocalPath(value: string | null | undefined): PolicyResult {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return ok;
  if (trimmed.startsWith("/") || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\\\")) {
    return deny("Path absoluto de checkout não é verdade do porto. Informe só a identidade lógica e paths relativos.");
  }
  return ok;
}

export function validateProjectRepositoryRole(role: string): PolicyResult {
  if (!projectRepositoryRoles.includes(role as ProjectRepositoryRole)) {
    return deny("Papel da Embarcação inválido.");
  }
  return ok;
}

export function validateWorkspaceScope(input: {
  actorWorkspaceId: string | null | undefined;
  resourceWorkspaceId: string | null | undefined;
}): PolicyResult {
  if (!input.actorWorkspaceId) return deny("Esta operação exige um porto.");
  if (!input.resourceWorkspaceId || input.resourceWorkspaceId !== input.actorWorkspaceId) {
    return deny("Este recurso não pertence ao porto ativo.");
  }
  return ok;
}

export function validateProjectMutation(input: {
  role: WorkspaceRole | null;
  name: string;
}): PolicyResult {
  if (!canMutateProject(input.role)) return deny("Só a tripulação cria Expedição neste porto.");
  return validateProjectName(input.name);
}

export function validateProjectDeletion(input: { role: WorkspaceRole | null }): PolicyResult {
  if (!canDeleteProject(input.role)) return deny("Só capitão e imediato excluem Expedição.");
  return ok;
}

export function validateRepositoryMutation(input: {
  role: WorkspaceRole | null;
  name: string;
  kind: string;
  remoteUrl?: string | null;
  localPath?: string | null;
}): PolicyResult {
  if (!canMutateProject(input.role)) return deny("Só a tripulação registra Embarcação neste porto.");
  const named = validateRepositoryName(input.name);
  if (!named.ok) return named;
  const kind = validateRepositoryKind(input.kind);
  if (!kind.ok) return kind;
  return validateAbsoluteLocalPath(input.localPath);
}
