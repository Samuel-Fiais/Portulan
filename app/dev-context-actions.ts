"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { z } from "zod";
import { liveAnnounceCommand } from "@/lib/collab-live-actions";
import { getWorkspaceMembership } from "@/lib/db/workspaces";
import {
  addAcceptanceCriterion,
  addContextPackItem,
  addContextPackSource,
  addCoordinationMessage,
  addImplementationTask,
  addImplementationTaskSource,
  addProgressReport,
  assignImplementationTask,
  acceptReportedChildren,
  approveContextPack,
  countOpenBlockerThreads,
  createAgentIdentity,
  createContextPack,
  createCoordinationThread,
  createMcpToken,
  createProject,
  createRepository,
  deleteAcceptanceCriterion,
  deleteAgentIdentity,
  deleteContextPackItem,
  deleteContextPackSource,
  deleteImplementationTask,
  deleteImplementationTaskSource,
  deleteProject,
  getAgentIdentity,
  getContextPack,
  getCoordinationThread,
  getDocument,
  getDocumentAccessLevel,
  getDocumentRelease,
  getImplementationTask,
  getProject,
  getRepository,
  linkProjectRepository,
  listDraftCriteria,
  listDraftItems,
  listDraftSources,
  listDraftTasks,
  listChildTasks,
  recordAuditEvent,
  resolveCoordinationThread,
  revokeMcpTokensForAgentIdentity,
  setAgentIdentityStatus,
  setTaskStatus,
  startNewContextPackRevision,
  updateImplementationTaskStatus,
  unlinkProjectRepository,
  updateAgentIdentity,
  updateContextPack,
  updateProject,
  updateRepository,
  upsertDraftPlan,
} from "@/lib/db";
import { getUserById } from "@/lib/users";
import {
  agentIdentityInputSchema,
  contextPackInputSchema,
  contextPackRecorteInputSchema,
  mcpKeyCreateSchema,
  mcpTokenInputSchema,
  projectInputSchema,
  projectRepositoryLinkSchema,
  repositoryInputSchema,
} from "@/lib/validation";
import { validateAgentIdentityLifecycle, validateManageAgentIdentity } from "@/lib/agent-identity-policy";
import { defaultAgentAllowedTools, validateAgentAllowedToolsSelection } from "@/lib/agent-tool-policy";
import {
  canApproveContextPack,
  existingManeuverRevisionNote,
  validateAcceptanceCriterion,
  validateContextItem,
  validateContextPackApproval,
  validateContextPackEditable,
  validateContextPackSourceDraft,
  validateContextPackTitle,
  validateStartNewRevision,
} from "@/lib/context-pack-policy";
import { validateCoordinationMessage, validateCoordinationThreadScope } from "@/lib/coordination-policy";
import {
  canRegisterTaskProgress,
  canRegisterTaskResult,
  isLeaseActive,
  nextStatusAfterLastBlockerResolved,
  validateAcceptTaskResult,
  validateAssignTaskOnTask,
  validateLanceObjective,
  validateManualTaskStatusChange,
  validateParentResult,
  validateParentTask,
  validateProgressReportSummary,
  validateTaskDeletion,
  validateTaskObjective,
} from "@/lib/implementation-task-policy";
import {
  validateProjectDeletion,
  validateProjectMutation,
  validateRepositoryMutation,
  validateWorkspaceScope,
} from "@/lib/project-policy";
import {
  documentSourceRoles,
  implementationTaskStatuses,
  type AgentWorkMode,
  type ContextItemStrength,
  type ContextItemType,
  type ImplementationTaskStatus,
} from "@/lib/dev-context";
import { documentAccessContext } from "@/lib/access-context";

function revalidateDev() {
  revalidatePath("/projects");
  revalidatePath("/context-packs");
  revalidatePath("/repositories");
  revalidatePath("/integrations");
  revalidatePath("/");
}

async function requireActiveMembership() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: "Faça login." };
  const { resolveWorkspaceContext } = await import("@/lib/active-workspace");
  const { active } = await resolveWorkspaceContext(session.user.id);
  if (!active) return { ok: false as const, error: "Escolha um porto." };
  const membership = await getWorkspaceMembership(active.id, session.user.id);
  if (!membership) return { ok: false as const, error: "Você não faz parte deste porto." };
  return {
    ok: true as const,
    userId: session.user.id,
    workspaceId: active.id,
    role: membership.role,
  };
}

export async function createProjectAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = projectInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da Expedição inválidos." };
  const validated = validateProjectMutation({ role: ctx.role, name: parsed.data.name });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const project = await createProject({
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    objective: parsed.data.objective,
    createdBy: ctx.userId,
  });
  await recordAuditEvent({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    agentIdentityId: null,
    mcpTokenId: null,
    action: "create_project",
    targetType: "project",
    targetId: project.id,
  });
  revalidateDev();
  return { ok: true as const, project };
}

export async function updateProjectAction(projectId: string, input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = projectInputSchema.partial().safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da Expedição inválidos." };
  const project = await getProject(projectId, ctx.workspaceId);
  if (!project) return { ok: false as const, error: "Expedição não encontrada." };
  const updated = await updateProject(projectId, ctx.workspaceId, parsed.data);
  revalidateDev();
  return { ok: true as const, project: updated };
}

export async function deleteProjectAction(projectId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const validated = validateProjectDeletion({ role: ctx.role });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  await deleteProject(projectId, ctx.workspaceId);
  revalidateDev();
  return { ok: true as const };
}

export async function createRepositoryAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = repositoryInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da Embarcação inválidos." };
  const validated = validateRepositoryMutation({
    role: ctx.role,
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const repository = await createRepository({
    workspaceId: ctx.workspaceId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
    notes: parsed.data.notes,
    createdBy: ctx.userId,
  });
  revalidateDev();
  return { ok: true as const, repository };
}

export async function updateRepositoryAction(repositoryId: string, input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = repositoryInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da Embarcação inválidos." };
  const repository = await getRepository(repositoryId, ctx.workspaceId);
  if (!repository) return { ok: false as const, error: "Embarcação não encontrada." };
  const validated = validateRepositoryMutation({
    role: ctx.role,
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const updated = await updateRepository(repositoryId, ctx.workspaceId, {
    name: parsed.data.name,
    kind: parsed.data.kind,
    remoteUrl: parsed.data.remoteUrl,
    notes: parsed.data.notes,
  });
  if (!updated) return { ok: false as const, error: "Embarcação não encontrada." };
  revalidateDev();
  return { ok: true as const, repository: updated };
}

export async function linkRepositoryAction(projectId: string, input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = projectRepositoryLinkSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Vínculo inválido." };
  const project = await getProject(projectId, ctx.workspaceId);
  const repository = await getRepository(parsed.data.repositoryId, ctx.workspaceId);
  if (!project || !repository) return { ok: false as const, error: "Expedição ou Embarcação não encontrada." };
  await linkProjectRepository({
    projectId,
    repositoryId: parsed.data.repositoryId,
    role: parsed.data.role,
    pathScopes: parsed.data.pathScopes,
    notes: parsed.data.notes,
  });
  revalidateDev();
  return { ok: true as const };
}

export async function unlinkRepositoryAction(projectId: string, repositoryId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const scoped = validateWorkspaceScope({
    actorWorkspaceId: ctx.workspaceId,
    resourceWorkspaceId: (await getProject(projectId, ctx.workspaceId))?.workspaceId,
  });
  if (!scoped.ok) return { ok: false as const, error: scoped.error };
  await unlinkProjectRepository(projectId, repositoryId);
  revalidateDev();
  return { ok: true as const };
}

export async function createContextPackAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = contextPackInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do Rumo inválidos." };
  const titleCheck = validateContextPackTitle(parsed.data.title);
  if (!titleCheck.ok) return { ok: false as const, error: titleCheck.error };
  const project = await getProject(parsed.data.projectId, ctx.workspaceId);
  if (!project) return { ok: false as const, error: "Expedição não encontrada." };
  const pack = await createContextPack({
    workspaceId: ctx.workspaceId,
    projectId: parsed.data.projectId,
    title: parsed.data.title,
    objective: parsed.data.objective,
    expectedOutcome: parsed.data.expectedOutcome,
    scope: parsed.data.scope,
    outOfScope: parsed.data.outOfScope,
    ownerUserId: ctx.userId,
  });
  if (parsed.data.documentId) {
    const access = await documentAccessContext(ctx.userId);
    const document = await getDocument(parsed.data.documentId, access);
    if (document && (await getDocumentAccessLevel(document, access))) {
      const releaseId = parsed.data.releaseId ?? null;
      const sourceCheck = validateContextPackSourceDraft({
        documentId: document.id,
        releaseId,
        role: documentSourceRoles[0],
        required: Boolean(releaseId),
        reason: "Carta-fonte inicial",
      });
      if (sourceCheck.ok) {
        await addContextPackSource({
          packId: pack.id,
          workspaceId: ctx.workspaceId,
          documentId: document.id,
          releaseId,
          sourceRole: documentSourceRoles[0],
          reason: "Carta-fonte inicial",
          required: Boolean(releaseId),
        });
      }
    }
  }
  revalidateDev();
  return { ok: true as const, pack };
}

export async function submitContextPackReviewAction(packId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  if (pack.ownerUserId !== ctx.userId && ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false as const, error: "Só o responsável envia o Rumo para revisão." };
  }
  await updateContextPack(packId, ctx.workspaceId, { status: "review" });
  revalidateDev();
  return { ok: true as const };
}

export async function approveContextPackAction(packId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const items = await listDraftItems(packId);
  const sources = await listDraftSources(packId);
  const validated = validateContextPackApproval({
    actorId: ctx.userId,
    ownerUserId: pack.ownerUserId,
    role: ctx.role,
    status: pack.status,
    sources: sources.map((source) => ({
      documentId: source.documentId,
      releaseId: source.releaseId,
      role: source.sourceRole,
      required: source.required,
      reason: source.reason,
    })),
    items,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const criteria = await listDraftCriteria(packId);
  const tasks = await listDraftTasks(packId);
  const result = await approveContextPack({
    pack,
    approvedBy: ctx.userId,
    snapshot: { pack, items, sources, criteria, tasks },
  });
  await recordAuditEvent({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    agentIdentityId: null,
    mcpTokenId: null,
    action: "approve_context_pack",
    targetType: "context_pack",
    targetId: packId,
  });
  revalidateDev();
  return { ok: true as const, pack: result.pack, revisionId: result.revision.id };
}

export async function startNewContextPackRevisionAction(packId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const validated = validateStartNewRevision({
    actorId: ctx.userId,
    ownerUserId: pack.ownerUserId,
    role: ctx.role,
    status: pack.status,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const next = await startNewContextPackRevision(pack);
  await recordAuditEvent({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    agentIdentityId: null,
    mcpTokenId: null,
    action: "start_new_context_pack_revision",
    targetType: "context_pack",
    targetId: packId,
  });
  revalidateDev();
  return { ok: true as const, pack: next, note: existingManeuverRevisionNote() };
}

export async function addContextPackItemAction(
  packId: string,
  input: { type: ContextItemType; strength: ContextItemStrength; body: string; blocking?: boolean },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  const validated = validateContextItem(input);
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const item = await addContextPackItem({
    packId,
    workspaceId: ctx.workspaceId,
    type: input.type,
    strength: input.strength,
    body: input.body,
    blocking: input.blocking,
  });
  revalidateDev();
  return { ok: true as const, item };
}

export async function addContextPackSourceAction(
  packId: string,
  input: {
    documentId: string;
    releaseId?: string | null;
    sourceRole: (typeof documentSourceRoles)[number];
    section?: string | null;
    reason: string;
    required?: boolean;
  },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  const sourceCheck = validateContextPackSourceDraft({
    documentId: input.documentId,
    releaseId: input.releaseId ?? null,
    role: input.sourceRole,
    required: input.required ?? true,
    reason: input.reason,
  });
  if (!sourceCheck.ok) return { ok: false as const, error: sourceCheck.error };
  if (input.releaseId) {
    const release = await getDocumentRelease(input.releaseId);
    if (!release || release.documentId !== input.documentId) {
      return { ok: false as const, error: "A edição escolhida não pertence a esta Carta." };
    }
  }
  const source = await addContextPackSource({
    packId,
    workspaceId: ctx.workspaceId,
    ...input,
  });
  revalidateDev();
  return { ok: true as const, source };
}

export async function deleteContextPackSourceAction(packId: string, sourceId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  await deleteContextPackSource(sourceId, packId);
  revalidateDev();
  return { ok: true as const };
}

export async function addImplementationTaskSourceAction(
  taskId: string,
  input: {
    documentId: string;
    releaseId?: string | null;
    sourceRole: (typeof documentSourceRoles)[number];
    section?: string | null;
    reason: string;
    required?: boolean;
  },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  const sourceCheck = validateContextPackSourceDraft({
    documentId: input.documentId,
    releaseId: input.releaseId ?? null,
    role: input.sourceRole,
    required: input.required ?? false,
    reason: input.reason,
  });
  if (!sourceCheck.ok) return { ok: false as const, error: sourceCheck.error };
  if (input.releaseId) {
    const release = await getDocumentRelease(input.releaseId);
    if (!release || release.documentId !== input.documentId) {
      return { ok: false as const, error: "A edição escolhida não pertence a esta Carta." };
    }
  }
  const source = await addImplementationTaskSource({
    taskId,
    workspaceId: ctx.workspaceId,
    documentId: input.documentId,
    releaseId: input.releaseId ?? null,
    sourceRole: input.sourceRole,
    section: input.section ?? null,
    reason: input.reason,
    required: input.required ?? false,
  });
  revalidateDev();
  return { ok: true as const, source };
}

export async function deleteImplementationTaskSourceAction(taskId: string, sourceId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  await deleteImplementationTaskSource(sourceId, taskId);
  revalidateDev();
  return { ok: true as const };
}

export async function deleteContextPackItemAction(packId: string, itemId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  await deleteContextPackItem(itemId, packId);
  revalidateDev();
  return { ok: true as const };
}

export async function deleteAcceptanceCriterionAction(packId: string, criterionId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  await deleteAcceptanceCriterion(criterionId, packId);
  revalidateDev();
  return { ok: true as const };
}

export async function addAcceptanceCriterionAction(packId: string, description: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  const validated = validateAcceptanceCriterion(description);
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const criterion = await addAcceptanceCriterion({ packId, workspaceId: ctx.workspaceId, description });
  revalidateDev();
  return { ok: true as const, criterion };
}

export async function savePlanAction(packId: string, summary: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  const plan = await upsertDraftPlan({ packId, workspaceId: ctx.workspaceId, summary });
  revalidateDev();
  return { ok: true as const, plan };
}

export async function saveContextPackRecorteAction(packId: string, input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = contextPackRecorteInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do recorte inválidos." };
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };

  const updatedPack = await updateContextPack(packId, ctx.workspaceId, {
    expectedOutcome: parsed.data.expectedOutcome,
    scope: parsed.data.scope,
    outOfScope: parsed.data.outOfScope,
  });
  if (!updatedPack) return { ok: false as const, error: "Não foi possível atualizar o Recorte." };
  const plan = await upsertDraftPlan({
    packId,
    workspaceId: ctx.workspaceId,
    summary: parsed.data.planSummary,
  });
  revalidateDev();
  return { ok: true as const, pack: updatedPack, plan };
}

export async function addImplementationTaskAction(
  packId: string,
  input: {
    objective: string;
    repositoryId?: string | null;
    pathScopes?: string[];
    parentTaskId?: string | null;
  },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const pack = await getContextPack(packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const editable = validateContextPackEditable(pack.status);
  if (!editable.ok) return { ok: false as const, error: editable.error };
  const validated = input.parentTaskId
    ? validateLanceObjective(input.objective)
    : validateTaskObjective(input.objective);
  if (!validated.ok) return { ok: false as const, error: validated.error };
  if (input.parentTaskId) {
    const parent = await getImplementationTask(input.parentTaskId, ctx.workspaceId);
    const parentCheck = validateParentTask({
      parent: parent ? { id: parent.id, parentTaskId: parent.parentTaskId, packId: parent.packId } : null,
      packId,
    });
    if (!parentCheck.ok) return { ok: false as const, error: parentCheck.error };
  }
  const task = await addImplementationTask({
    packId,
    workspaceId: ctx.workspaceId,
    objective: input.objective,
    repositoryId: input.repositoryId ?? null,
    pathScopes: input.pathScopes,
    parentTaskId: input.parentTaskId ?? null,
  });
  revalidateDev();
  return { ok: true as const, task };
}

export async function updateImplementationTaskStatusAction(taskId: string, status: ImplementationTaskStatus) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  if (!(implementationTaskStatuses as readonly string[]).includes(status)) {
    return { ok: false as const, error: "Estado inválido." };
  }
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  const pack = await getContextPack(task.packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const validated = validateManualTaskStatusChange({
    current: task.status,
    next: status,
    packEditable: validateContextPackEditable(pack.status).ok,
  });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const updated = await updateImplementationTaskStatus(taskId, ctx.workspaceId, status);
  if (!updated) return { ok: false as const, error: "Não foi possível atualizar o estado." };
  await liveAnnounceCommand({
    workspaceId: ctx.workspaceId,
    subjectType: "implementation_task",
    subjectId: updated.id,
    command: status === "blocked" ? "task.blocked" : "task.status_changed",
    actor: { userId: ctx.userId },
    idempotencyKey: `status-${updated.id}-${status}`,
    payload: { status },
    mirrorToWorkspaceFeed: true,
  });
  revalidateDev();
  return { ok: true as const, task: updated };
}

export async function deleteImplementationTaskAction(taskId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  const pack = await getContextPack(task.packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const validated = validateTaskDeletion({ packEditable: validateContextPackEditable(pack.status).ok });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  const deleted = await deleteImplementationTask(taskId, ctx.workspaceId);
  if (!deleted) return { ok: false as const, error: "Não foi possível remover." };
  revalidateDev();
  return { ok: true as const, task: deleted };
}

export async function assignImplementationTaskAction(
  taskId: string,
  input: { assigneeUserId?: string | null; assigneeAgentIdentityId?: string | null },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const current = await getImplementationTask(taskId, ctx.workspaceId);
  if (!current) return { ok: false as const, error: "Manobra não encontrada." };
  const assigned = validateAssignTaskOnTask({ status: current.status, ...input });
  if (!assigned.ok) return { ok: false as const, error: assigned.error };
  const task = await assignImplementationTask({
    taskId,
    workspaceId: ctx.workspaceId,
    assigneeUserId: input.assigneeUserId ?? null,
    assigneeAgentIdentityId: input.assigneeAgentIdentityId ?? null,
  });
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  await liveAnnounceCommand({
    workspaceId: ctx.workspaceId,
    subjectType: "implementation_task",
    subjectId: task.id,
    command: "handoff",
    actor: { userId: ctx.userId },
    idempotencyKey: `assign-${task.id}-${task.updatedAt}`,
    payload: {
      assigneeUserId: task.assigneeUserId,
      assigneeAgentIdentityId: task.assigneeAgentIdentityId,
    },
    mirrorToWorkspaceFeed: true,
  });
  revalidateDev();
  return { ok: true as const, task };
}

export async function acceptTaskResultAction(taskId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  const pack = await getContextPack(task.packId, ctx.workspaceId);
  if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
  const canAccept = canApproveContextPack({ actorId: ctx.userId, ownerUserId: pack.ownerUserId, role: ctx.role });
  const validated = validateAcceptTaskResult({ status: task.status, canAccept });
  if (!validated.ok) return { ok: false as const, error: validated.error };
  if (!task.parentTaskId) {
    const children = await listChildTasks(task.id, ctx.workspaceId);
    const parentResult = validateParentResult({ children });
    if (!parentResult.ok) return { ok: false as const, error: parentResult.error };
    await acceptReportedChildren(task.id, ctx.workspaceId);
  }
  await setTaskStatus(taskId, ctx.workspaceId, "accepted");
  await liveAnnounceCommand({
    workspaceId: ctx.workspaceId,
    subjectType: "implementation_task",
    subjectId: taskId,
    command: "task.accepted",
    actor: { userId: ctx.userId },
    idempotencyKey: `accepted-${taskId}`,
    mirrorToWorkspaceFeed: true,
  });
  revalidateDev();
  return { ok: true as const };
}

export async function createCoordinationMessageAction(input: {
  threadId?: string;
  subjectType: "pack" | "task" | "item" | "criterion";
  subjectId: string;
  body: string;
  isBlocker?: boolean;
  mentionedUserIds?: string[];
  mentionedAgentIdentityIds?: string[];
}) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const messageCheck = validateCoordinationMessage({
    body: input.body,
    isRoot: !input.threadId,
  });
  if (!messageCheck.ok) return { ok: false as const, error: messageCheck.error };
  if (input.threadId) {
    const thread = await getCoordinationThread(input.threadId, ctx.workspaceId);
    const scoped = validateCoordinationThreadScope({
      threadWorkspaceId: thread?.workspaceId,
      actorWorkspaceId: ctx.workspaceId,
    });
    if (!scoped.ok) return { ok: false as const, error: scoped.error };
    const message = await addCoordinationMessage({
      threadId: input.threadId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      body: input.body,
      mentionedUserIds: input.mentionedUserIds,
      mentionedAgentIdentityIds: input.mentionedAgentIdentityIds,
    });
    if (!message) return { ok: false as const, error: "Conversa de bordo não encontrada neste porto." };
    revalidateDev();
    return { ok: true as const, message };
  }
  const created = await createCoordinationThread({
    workspaceId: ctx.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    isBlocker: input.isBlocker,
    createdBy: ctx.userId,
    body: input.body,
    mentionedUserIds: input.mentionedUserIds,
    mentionedAgentIdentityIds: input.mentionedAgentIdentityIds,
  });
  if (input.isBlocker && input.subjectType === "task") {
    await setTaskStatus(input.subjectId, ctx.workspaceId, "blocked");
    await liveAnnounceCommand({
      workspaceId: ctx.workspaceId,
      subjectType: "implementation_task",
      subjectId: input.subjectId,
      command: "task.blocked",
      actor: { userId: ctx.userId },
      idempotencyKey: `blocker-${created.thread.id}`,
      payload: { threadId: created.thread.id },
      mirrorToWorkspaceFeed: true,
    });
  }
  revalidateDev();
  return { ok: true as const, thread: created.thread, message: created.message };
}

export async function resolveCoordinationThreadAction(threadId: string, resolved: boolean) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const thread = await resolveCoordinationThread(threadId, ctx.workspaceId, resolved);
  if (!thread) return { ok: false as const, error: "Conversa de bordo não encontrada." };
  if (thread.subjectType === "task") {
    const openBlockers = await countOpenBlockerThreads(ctx.workspaceId, "task", thread.subjectId);
    const task = await getImplementationTask(thread.subjectId, ctx.workspaceId);
    if (task) {
      if (openBlockers > 0) {
        if (task.status !== "accepted" && task.status !== "reported") {
          await setTaskStatus(task.id, ctx.workspaceId, "blocked");
        }
      } else if (task.status === "blocked") {
        await setTaskStatus(
          task.id,
          ctx.workspaceId,
          nextStatusAfterLastBlockerResolved({
            status: task.status,
            leaseHolderTokenId: task.leaseHolderTokenId,
            leaseExpiresAt: task.leaseExpiresAt,
          }),
        );
      }
    }
  }
  revalidateDev();
  return { ok: true as const };
}

export async function createMcpKeyAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = mcpKeyCreateSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da chave MCP inválidos." };

  if (parsed.data.agentIdentityId) {
    return createAgentMcpTokenAction({
      name: parsed.data.name,
      expiration: parsed.data.expiration,
      agentIdentityId: parsed.data.agentIdentityId,
    });
  }

  const allowedMcpTools = parsed.data.allowedMcpTools ?? defaultAgentAllowedTools();
  const toolsCheck = validateAgentAllowedToolsSelection(allowedMcpTools);
  if (!toolsCheck.ok) return { ok: false as const, error: toolsCheck.error };

  const identity = await createAgentIdentity({
    workspaceId: ctx.workspaceId,
    ownerUserId: ctx.userId,
    name: parsed.data.name,
    workMode: "local_implementation" as AgentWorkMode,
    allowedMcpTools,
  });
  const result = await createMcpToken(
    ctx.userId,
    parsed.data.name,
    parsed.data.expiration,
    ctx.workspaceId,
    identity.id,
  );
  try {
    await recordAuditEvent({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      agentIdentityId: identity.id,
      mcpTokenId: result.record.id,
      action: "issue_mcp_key",
      targetType: "agent_identity",
      targetId: identity.id,
    });
  } catch {
    // A chave já foi emitida; falha de auditoria não invalida a emissão.
  }
  revalidateDev();
  return { ok: true as const, token: result.token, record: result.record, identity };
}

export async function createAgentIdentityAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = agentIdentityInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do agente MCP inválidos." };
  const allowedMcpTools = parsed.data.allowedMcpTools ?? defaultAgentAllowedTools();
  const toolsCheck = validateAgentAllowedToolsSelection(allowedMcpTools);
  if (!toolsCheck.ok) return { ok: false as const, error: toolsCheck.error };
  const identity = await createAgentIdentity({
    workspaceId: ctx.workspaceId,
    ownerUserId: ctx.userId,
    name: parsed.data.name,
    workMode: parsed.data.workMode as AgentWorkMode,
    allowedMcpTools,
  });
  revalidateDev();
  return { ok: true as const, identity };
}

export async function updateAgentIdentityAction(id: string, input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = agentIdentityInputSchema.partial().safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do agente MCP inválidos." };
  const current = await getAgentIdentity(id, ctx.workspaceId);
  if (!current) return { ok: false as const, error: "Agente MCP não encontrado." };
  const allowed = validateManageAgentIdentity({
    actorId: ctx.userId,
    ownerUserId: current.ownerUserId,
    action: "edit",
  });
  if (!allowed.ok) return { ok: false as const, error: allowed.error };
  if (parsed.data.allowedMcpTools) {
    const toolsCheck = validateAgentAllowedToolsSelection(parsed.data.allowedMcpTools);
    if (!toolsCheck.ok) return { ok: false as const, error: toolsCheck.error };
  }
  const identity = await updateAgentIdentity(id, ctx.workspaceId, parsed.data, ctx.userId);
  if (!identity) return { ok: false as const, error: "Só o responsável altera este Agente de Bordo." };
  revalidateDev();
  return { ok: true as const, identity };
}

export async function createAgentMcpTokenAction(input: unknown) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const parsed = mcpTokenInputSchema
    .extend({ agentIdentityId: z.string().uuid() })
    .safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados da chave de bordo inválidos." };
  const identity = await getAgentIdentity(parsed.data.agentIdentityId, ctx.workspaceId);
  if (!identity) return { ok: false as const, error: "Agente MCP não encontrado." };
  const allowed = validateManageAgentIdentity({
    actorId: ctx.userId,
    ownerUserId: identity.ownerUserId,
    action: "issue_key",
  });
  if (!allowed.ok) return { ok: false as const, error: allowed.error };
  const lifecycle = validateAgentIdentityLifecycle({ status: identity.status, action: "issue_key" });
  if (!lifecycle.ok) return { ok: false as const, error: lifecycle.error };
  const result = await createMcpToken(
    ctx.userId,
    parsed.data.name,
    parsed.data.expiration,
    ctx.workspaceId,
    parsed.data.agentIdentityId,
  );
  revalidateDev();
  return { ok: true as const, token: result.token, record: result.record };
}

export async function deactivateAgentIdentityAction(identityId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const identity = await getAgentIdentity(identityId, ctx.workspaceId);
  if (!identity) return { ok: false as const, error: "Agente MCP não encontrado." };
  const allowed = validateManageAgentIdentity({
    actorId: ctx.userId,
    ownerUserId: identity.ownerUserId,
    action: "deactivate",
  });
  if (!allowed.ok) return { ok: false as const, error: allowed.error };
  const lifecycle = validateAgentIdentityLifecycle({ status: identity.status, action: "deactivate" });
  if (!lifecycle.ok) return { ok: false as const, error: lifecycle.error };
  const revoked = await revokeMcpTokensForAgentIdentity(identityId);
  const { revokeCollabAccessForAgentIdentity } = await import("@/lib/collab-revocation");
  await revokeCollabAccessForAgentIdentity(ctx.workspaceId, identityId);
  const updated = await setAgentIdentityStatus(identityId, ctx.workspaceId, ctx.userId, "inactive");
  if (!updated) return { ok: false as const, error: "Não foi possível desativar este Agente de Bordo." };
  await recordAuditEvent({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    agentIdentityId: identityId,
    mcpTokenId: null,
    action: "deactivate_agent_identity",
    targetType: "agent_identity",
    targetId: identityId,
  });
  revalidateDev();
  return { ok: true as const, identity: updated, revokedKeys: revoked };
}

export async function reactivateAgentIdentityAction(identityId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const identity = await getAgentIdentity(identityId, ctx.workspaceId);
  if (!identity) return { ok: false as const, error: "Agente MCP não encontrado." };
  const allowed = validateManageAgentIdentity({
    actorId: ctx.userId,
    ownerUserId: identity.ownerUserId,
    action: "reactivate",
  });
  if (!allowed.ok) return { ok: false as const, error: allowed.error };
  const lifecycle = validateAgentIdentityLifecycle({ status: identity.status, action: "reactivate" });
  if (!lifecycle.ok) return { ok: false as const, error: lifecycle.error };
  const updated = await setAgentIdentityStatus(identityId, ctx.workspaceId, ctx.userId, "active");
  if (!updated) return { ok: false as const, error: "Não foi possível reativar este Agente de Bordo." };
  await recordAuditEvent({
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    agentIdentityId: identityId,
    mcpTokenId: null,
    action: "reactivate_agent_identity",
    targetType: "agent_identity",
    targetId: identityId,
  });
  revalidateDev();
  return { ok: true as const, identity: updated };
}

export async function deleteAgentIdentityAction(identityId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const identity = await getAgentIdentity(identityId, ctx.workspaceId);
  if (!identity) return { ok: false as const, error: "Agente MCP não encontrado." };
  const allowed = validateManageAgentIdentity({
    actorId: ctx.userId,
    ownerUserId: identity.ownerUserId,
    action: "delete",
  });
  if (!allowed.ok) return { ok: false as const, error: allowed.error };
  const revoked = await revokeMcpTokensForAgentIdentity(identityId);
  const { revokeCollabAccessForAgentIdentity } = await import("@/lib/collab-revocation");
  await revokeCollabAccessForAgentIdentity(ctx.workspaceId, identityId);
  const deleted = await deleteAgentIdentity(identityId, ctx.workspaceId, ctx.userId);
  if (!deleted) return { ok: false as const, error: "Não foi possível excluir este Agente de Bordo." };
  revalidateDev();
  return { ok: true as const, revokedKeys: revoked };
}

export async function addProgressReportAction(
  taskId: string,
  input: { summary: string; evidence?: string; kind?: "progress" | "result" },
) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const task = await getImplementationTask(taskId, ctx.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  const summaryCheck = validateProgressReportSummary(input.summary);
  if (!summaryCheck.ok) return { ok: false as const, error: summaryCheck.error };
  const kind = input.kind ?? "progress";
  if (kind === "progress" && !canRegisterTaskProgress(task.status)) {
    return { ok: false as const, error: "Esta Manobra já foi aceita." };
  }
  if (kind === "result" && !canRegisterTaskResult(task.status)) {
    return { ok: false as const, error: "O resultado desta Manobra já foi registrado." };
  }
  if (kind === "result" && !task.parentTaskId) {
    const children = await listChildTasks(task.id, ctx.workspaceId);
    const parentResult = validateParentResult({ children });
    if (!parentResult.ok) return { ok: false as const, error: parentResult.error };
  }
  if (!task.leaseHolderUserId || task.leaseHolderUserId !== ctx.userId || !isLeaseActive(task.leaseExpiresAt)) {
    return { ok: false as const, error: "Só quem tem o comando ativo registra nesta Manobra." };
  }
  const report = await addProgressReport({
    taskId,
    workspaceId: ctx.workspaceId,
    packRevisionId: task.packRevisionId,
    kind,
    summary: input.summary,
    evidence: input.evidence,
    userId: ctx.userId,
    agentIdentityId: null,
  });
  if (kind === "result") await setTaskStatus(taskId, ctx.workspaceId, "reported");
  revalidateDev();
  return { ok: true as const, report };
}

export async function getAgentGuidePreview(identityId: string) {
  const ctx = await requireActiveMembership();
  if (!ctx.ok) return ctx;
  const { getAgentIdentity } = await import("@/lib/db/agent-identities");
  const identity = await getAgentIdentity(identityId, ctx.workspaceId);
  if (!identity) return { ok: false as const, error: "Agente MCP não encontrado." };
  const user = await getUserById(identity.ownerUserId);
  const { buildAgentGuide } = await import("@/lib/agent-guide");
  const { MCP_TOOL_COUNT } = await import("@/lib/mcp-tool-catalog");
  return {
    ok: true as const,
    guide: buildAgentGuide({
      name: identity.name,
      ownerName: user?.name?.trim() || user?.login || "Tripulante",
      allowedToolCount: identity.allowedMcpTools.length,
      totalToolCount: MCP_TOOL_COUNT,
    }),
  };
}
