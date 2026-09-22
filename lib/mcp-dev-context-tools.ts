import { z } from "zod";
import { liveAnnounceCommand } from "@/lib/collab-live-actions";
import type { CollabSubjectType } from "@/lib/collab-rooms";
import { touchAgentCollabPresence } from "@/lib/db/collab-agent-presence";
import {
  addAcceptanceCriterion,
  addContextPackItem,
  addContextPackSource,
  addCoordinationMessage,
  addImplementationTask,
  addImplementationTaskSource,
  approveContextPack,
  assignImplementationTask,
  acceptReportedChildren,
  claimImplementationTask,
  countOpenBlockerThreads,
  createContextPack,
  createCoordinationThread,
  createProject,
  createRepository,
  deleteAcceptanceCriterion,
  deleteContextPackItem,
  deleteContextPackSource,
  deleteImplementationTaskSource,
  getAgentIdentity,
  getContextPack,
  getCoordinationThread,
  getDocumentRelease,
  getImplementationTask,
  getProject,
  getRepository,
  listAvailableTasks,
  listChildTasks,
  listClaimedTasksForToken,
  listContextPacks,
  listCoordinationMessages,
  listCoordinationThreads,
  listMentionsForActor,
  listDraftCriteria,
  listDraftItems,
  listDraftSources,
  listDraftTasks,
  listTaskSources,
  listPacksUsingDocument,
  listProjectRepositories,
  linkProjectRepository,
  listProjects,
  listProjectsForRepository,
  listRepositories,
  listRevisionCriteria,
  listRevisionItems,
  listRevisionSources,
  registerAuthorizedProgress,
  releaseImplementationTask,
  renewImplementationTaskLease,
  resolveCoordinationThread,
  setTaskStatus,
  startNewContextPackRevision,
  updateContextPack,
  updateRepository,
  upsertDraftPlan,
} from "@/lib/db";
import { getDocument, getDocumentAccessLevel } from "@/lib/db/documents";
import { getWorkspaceMembership } from "@/lib/db/workspaces";
import { documentAccessContext } from "@/lib/access-context";
import { getUserById } from "@/lib/users";
import { validateProjectMutation, validateRepositoryMutation } from "@/lib/project-policy";
import { defaultAgentAllowedTools, disabledAgentTools } from "@/lib/agent-tool-policy";
import {
  bootstrapActionLists,
  sessionFromRecognizedRepository,
  validateAgentAction,
  validateSessionRepository,
} from "@/lib/agent-capability-policy";
import {
  canApproveContextPack,
  existingManeuverRevisionNote,
  isPackServable,
  untrustedContentNote,
  validateAcceptanceCriterion,
  validateContextItem,
  validateContextPackApproval,
  validateContextPackEditable,
  validateContextPackSourceDraft,
  validateContextPackTitle,
  validateStartNewRevision,
} from "@/lib/context-pack-policy";
import { validateCoordinationThreadScope } from "@/lib/coordination-policy";
import { buildImplementationBrief } from "@/lib/implementation-brief";
import {
  nextStatusAfterLastBlockerResolved,
  validateAcceptTaskResult,
  validateAssignTaskOnTask,
  validateClaimTask,
  validateLanceObjective,
  validateParentResult,
  validateParentTask,
  validateRegisterProgress,
  validateRegisterResult,
  validateReleaseTask,
  validateRenewLease,
  completionCartaProtocol,
  validateTaskObjective,
  validateTaskRevisionChoice,
} from "@/lib/implementation-task-policy";
import {
  contextItemStrengths,
  contextItemTypes,
  documentSourceRoles,
  projectRepositoryRoles,
  isCodeTask,
  type AgentAction,
  type AgentWorkMode,
} from "@/lib/dev-context";
import { resolveBoardId } from "@/lib/db/board-numbers";
import { getMcpServerVersion } from "@/lib/system-guide";

type ToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (args: ToolArgs) => Promise<unknown>,
  ) => void;
};

type ToolArgs = {
  repository_id: string;
  query?: string;
  project_id: string;
  pack_id: string;
  task_id: string;
  title: string;
  name: string;
  objective: string;
  kind?: "git" | "local" | "both";
  remote_url?: string | null;
  notes?: string;
  mode?: "brief" | "full";
  accept_revision_id?: string;
  summary: string;
  changed_scopes?: string[];
  path_scopes?: string[];
  evidence?: string;
  commit_ref?: string;
  pull_request_ref?: string;
  covered_criterion_ids?: string[];
  gaps?: string;
  claims_local_test?: boolean;
  subject_type?: "pack" | "task" | "item" | "criterion";
  subject_id?: string;
  thread_id: string;
  body: string;
  is_blocker?: boolean;
  resolved?: boolean;
  parent_task_id?: string | null;
  assignee_user_id?: string | null;
  assignee_agent_identity_id?: string | null;
  mentioned_user_ids?: string[];
  mentioned_agent_identity_ids?: string[];
  expected_outcome?: string;
  scope?: string;
  out_of_scope?: string;
  release_id?: string | null;
  type: "decision" | "rule" | "contract" | "risk" | "assumption" | "question";
  strength: "required" | "recommended" | "reference";
  blocking?: boolean;
  source_role: "decision" | "reference" | "spec" | "constraint" | "background";
  section?: string | null;
  reason: string;
  required?: boolean;
  item_id: string;
  source_id: string;
  description: string;
  criterion_id: string;
  role?: "primary" | "dependency" | "consumer" | "infrastructure";
  document_id: string;
};

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const errorResult = (error: string) => ({ ...textResult({ error }), isError: true as const });

export type DevContextMcpStore = {
  userId: string;
  workspaceId: string | null;
  tokenId: string;
  agentIdentityId: string | null;
  clientInfo: unknown;
};

export function registerDevContextMcpTools(
  server: ToolServer,
  getStore: () => DevContextMcpStore,
) {
  const requireWorkspace = () => {
    const store = getStore();
    if (!store.workspaceId) throw new Error("Token sem porto.");
    return store as DevContextMcpStore & { workspaceId: string };
  };

  async function requireIdentity() {
    const store = requireWorkspace();
    if (!store.agentIdentityId) {
      return {
        ok: true as const,
        store,
        identity: {
          id: null,
          name: "Chave legada",
          workMode: "local_implementation" as const,
          allowedMcpTools: defaultAgentAllowedTools(),
          status: "active" as const,
        },
      };
    }
    const identity = await getAgentIdentity(store.agentIdentityId, store.workspaceId);
    if (!identity) return { ok: false as const, error: "Agente MCP não encontrado neste porto." };
    if (identity.status !== "active") {
      return { ok: false as const, error: "Este agente MCP está desativado." };
    }
    return { ok: true as const, store, identity };
  }

  async function requireMembership() {
    const store = requireWorkspace();
    const membership = await getWorkspaceMembership(store.workspaceId, store.userId);
    if (!membership) {
      return { ok: false as const, error: "Você não faz parte deste porto." };
    }
    return { ok: true as const, store, role: membership.role };
  }

  async function resolveSession(repositoryId?: string | null, taskRepositoryId?: string | null) {
    const store = requireWorkspace();
    const provided = repositoryId ?? null;
    if (!provided) {
      return { ok: true as const, session: null, repository: null };
    }
    const repository = await getRepository(provided, store.workspaceId);
    const check = validateSessionRepository({
      providedId: provided,
      repositoryExists: Boolean(repository),
      taskRepositoryId,
    });
    if (!check.ok) return { ok: false as const, error: check.error };
    return {
      ok: true as const,
      session: sessionFromRecognizedRepository(repository?.id, Boolean(repository)),
      repository,
    };
  }

  async function packIsServable(packId: string, revisionId?: string | null) {
    const store = requireWorkspace();
    const pack = await getContextPack(packId, store.workspaceId);
    if (!pack) return { ok: false as const, pack: null, reasons: ["not_found"] };
    const items = revisionId
      ? await listRevisionItems(pack.id, revisionId)
      : pack.currentRevisionId
        ? await listRevisionItems(pack.id, pack.currentRevisionId)
        : await listDraftItems(pack.id);
    const servable = isPackServable({ status: pack.status, validity: pack.validity, items });
    if (!servable.ok) return { ok: false as const, pack, reasons: servable.reasons };
    return { ok: true as const, pack, reasons: [] as string[] };
  }

  function collabSubjectFromAuditTarget(
    targetType: string,
    targetId: string,
  ): { subjectType: CollabSubjectType; subjectId: string } | null {
    switch (targetType) {
      case "task":
        return { subjectType: "implementation_task", subjectId: targetId };
      case "pack":
        return { subjectType: "context_pack", subjectId: targetId };
      case "document":
        return { subjectType: "document", subjectId: targetId };
      case "project":
        return { subjectType: "project", subjectId: targetId };
      case "repository":
        return { subjectType: "repository", subjectId: targetId };
      default:
        return null;
    }
  }

  const MCP_ACTION_COMMAND: Record<string, string> = {
    claim_implementation_task: "task.claimed",
    release_implementation_task: "task.released",
    renew_implementation_task_lease: "task.lease_renewed",
    report_implementation_progress: "task.progress_reported",
    report_implementation_result: "task.result_reported",
    assign_implementation_task: "task.assigned",
    accept_implementation_task_result: "task.accepted",
    add_implementation_task_source: "task.source_linked",
    delete_implementation_task_source: "task.source_removed",
    approve_context_pack: "pack.approved",
    submit_context_pack_review: "pack.submitted",
  };

  async function audit(action: string, targetType: string, targetId: string) {
    const store = getStore();
    if (!store.workspaceId) return;
    const subject = collabSubjectFromAuditTarget(targetType, targetId);
    if (!subject) return;
    const command = MCP_ACTION_COMMAND[action] ?? action;
    const actor = {
      userId: store.userId,
      agentIdentityId: store.agentIdentityId,
      mcpTokenId: store.tokenId,
    };
    await liveAnnounceCommand({
      workspaceId: store.workspaceId,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      command,
      actor,
      mirrorToWorkspaceFeed: command.startsWith("task.") || command.startsWith("workspace."),
      payload: { source: "mcp", action },
    });
    if (store.agentIdentityId && subject.subjectType === "implementation_task") {
      const intention =
        action === "claim_implementation_task" || action === "report_implementation_progress"
          ? "automating"
          : action === "release_implementation_task"
            ? "waiting"
            : "viewing";
      await touchAgentCollabPresence({
        workspaceId: store.workspaceId,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actor,
        intention,
      });
    }
  }

  async function requireEditablePack(packLocator: string, action: AgentAction) {
    const ready = await requireIdentity();
    if (!ready.ok) return ready;
    const capability = validateAgentAction({ mode: ready.identity.workMode, action });
    if (!capability.ok) return { ok: false as const, error: capability.error };
    const packId = (await resolveBoardId(ready.store.workspaceId, packLocator, "pack")) ?? packLocator;
    const pack = await getContextPack(packId, ready.store.workspaceId);
    if (!pack) return { ok: false as const, error: "Rumo não encontrado." };
    const editable = validateContextPackEditable(pack.status);
    if (!editable.ok) return { ok: false as const, error: editable.error };
    return { ...ready, pack };
  }

  server.registerTool(
    "get_agent_bootstrap",
    {
      title: "Bootstrap do Agente de Bordo",
      description:
        "Primeiro passo canônico. Devolve identidade, modo, clientInfo observado, Embarcação da sessão, Expedições, Manobras, Lances e o protocolo. RN-104, RN-105, RN-113.",
      inputSchema: z.object({
        repository_id: z.string().uuid().optional().describe("Embarcação reconhecida nesta sessão, se houver"),
      }),
    },
    async ({ repository_id }) => {
      const store = requireWorkspace();
      const user = await getUserById(store.userId);
      const identity = store.agentIdentityId
        ? await getAgentIdentity(store.agentIdentityId, store.workspaceId)
        : null;
      const sessionResult = await resolveSession(repository_id);
      if (!sessionResult.ok) return errorResult(sessionResult.error);
      const repository = sessionResult.repository;
      const session = sessionResult.session;
      const workMode: AgentWorkMode = identity?.workMode ?? "context_and_coordination";
      const actions = bootstrapActionLists(workMode, session);
      const projects = repository
        ? await listProjectsForRepository(repository.id, store.workspaceId)
        : await listProjects(store.workspaceId);
      const claimed = await listClaimedTasksForToken(store.workspaceId, store.tokenId);
      const available = identity
        ? (
            await Promise.all(
              (await listAvailableTasks(store.workspaceId)).map(async (task) => {
                const servable = await packIsServable(task.packId, task.packRevisionId);
                if (!servable.ok) return null;
                const check = validateAgentAction({
                  mode: workMode,
                  action: isCodeTask(task.repositoryId) ? "claim_code_task" : "claim_non_code_task",
                  session,
                  isCodeTask: isCodeTask(task.repositoryId),
                });
                return check.ok ? task : null;
              }),
            )
          ).filter((task) => task !== null)
        : [];
      const packs = await listContextPacks(store.workspaceId);
      const alerts = packs
        .filter((pack) => pack.validity === "needs_review")
        .map((pack) => ({
          packId: pack.id,
          message: "Esta Carta-fonte ganhou uma nova edição; revise o Rumo",
        }));

      const payload = {
        protocolVersion: getMcpServerVersion(),
        principal: {
          userId: store.userId,
          name: user?.name ?? user?.login ?? null,
        },
        agentIdentity: identity
          ? {
              id: identity.id,
              name: identity.name,
              workMode: identity.workMode,
              allowedMcpTools: identity.allowedMcpTools,
              disabledMcpTools: disabledAgentTools(identity.allowedMcpTools),
            }
          : null,
        clientInfo: store.clientInfo,
        observed: true,
        authenticationNote: "O servidor afirma só a credencial usada. clientInfo é dado observado, não prova do aplicativo.",
        untrustedContent: untrustedContentNote(),
        ...actions,
        repository: repository ? { id: repository.id, name: repository.name } : null,
        projects: projects.map((project) => ({ id: project.id, name: project.name })),
        mentions: (
          await listMentionsForActor({
            workspaceId: store.workspaceId,
            userId: store.userId,
            agentIdentityId: identity?.id ?? null,
          })
        ).map((message) => ({
          id: message.id,
          number: message.boardNumber,
          threadId: message.threadId,
          body: message.body,
          mentionedMe: true,
          createdAt: message.createdAt,
        })),
        claimedTasks: claimed.map((task) => ({
          id: task.id,
          number: task.boardNumber,
          parentTaskId: task.parentTaskId,
          objective: task.objective,
          packId: task.packId,
        })),
        availableTasks: available.map((task) => ({
          id: task.id,
          number: task.boardNumber,
          parentTaskId: task.parentTaskId,
          objective: task.objective,
          packId: task.packId,
          packRevisionId: task.packRevisionId,
          isCode: isCodeTask(task.repositoryId),
          assigneeAgentIdentityId: task.assigneeAgentIdentityId,
        })),
        alerts,
        protocol: [
          "Chame get_agent_bootstrap no início de cada sessão.",
          "Consulte um Rumo aprovado e válido antes de assumir Manobra.",
          "Assuma o comando com claim_implementation_task e renove o lease com atividade explícita.",
          "Registre Maré contrária numa Conversa de bordo.",
          "Reporte o resultado; aceite humano é separado.",
          ...completionCartaProtocol(),
        ],
      };
      return textResult(payload);
    },
  );

  server.registerTool(
    "find_context",
    {
      title: "Buscar contexto",
      description: "Encontra Expedições e Rumos no porto do token.",
      inputSchema: z.object({
        query: z.string().trim().max(200).optional(),
      }),
    },
    async ({ query }) => {
      const store = requireWorkspace();
      const q = query?.toLowerCase() ?? "";
      const projects = await listProjects(store.workspaceId);
      const packs = await listContextPacks(store.workspaceId);
      return textResult({
        projects: projects.filter((item) => !q || item.name.toLowerCase().includes(q) || item.objective.toLowerCase().includes(q)),
        packs: packs
          .filter((item) => !q || item.title.toLowerCase().includes(q) || item.objective.toLowerCase().includes(q))
          .map((pack) => ({
            packId: pack.id,
            revisionId: pack.currentRevisionId,
            title: pack.title,
            status: pack.status,
            validity: pack.validity,
          })),
      });
    },
  );

  server.registerTool(
    "create_project",
    {
      title: "Criar Expedição",
      description: "Cria Expedição no porto do token. Nome 2–80; objetivo opcional (RN-108).",
      inputSchema: z.object({
        name: z.string().trim().min(2).max(80),
        objective: z.string().trim().max(4_000).default(""),
      }),
    },
    async ({ name, objective }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const action = validateAgentAction({ mode: ready.identity.workMode, action: "create_project" });
      if (!action.ok) return errorResult(action.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const validated = validateProjectMutation({ role: membership.role, name });
      if (!validated.ok) return errorResult(validated.error);
      const project = await createProject({
        workspaceId: ready.store.workspaceId,
        name,
        objective,
        createdBy: ready.store.userId,
      });
      await audit("create_project", "project", project.id);
      return textResult({ projectId: project.id, project });
    },
  );

  server.registerTool(
    "create_repository",
    {
      title: "Criar Embarcação",
      description:
        "Registra Embarcação lógica no porto. Git, local ou ambas. Opcionalmente vincula a uma Expedição (RN-108).",
      inputSchema: z.object({
        name: z.string().trim().min(2).max(80),
        kind: z.enum(["git", "local", "both"]).default("git"),
        remote_url: z.string().trim().max(2_048).optional().nullable(),
        notes: z.string().trim().max(2_000).default(""),
        project_id: z.string().uuid().optional(),
      }),
    },
    async ({ name, kind, remote_url, notes, project_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const action = validateAgentAction({ mode: ready.identity.workMode, action: "create_repository" });
      if (!action.ok) return errorResult(action.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const validated = validateRepositoryMutation({
        role: membership.role,
        name,
        kind: kind ?? "git",
        remoteUrl: remote_url,
      });
      if (!validated.ok) return errorResult(validated.error);
      const repository = await createRepository({
        workspaceId: ready.store.workspaceId,
        name,
        kind: kind ?? "git",
        remoteUrl: remote_url,
        notes,
        createdBy: ready.store.userId,
      });
      if (project_id) {
        const project = await getProject(project_id, ready.store.workspaceId);
        if (!project) return errorResult("Expedição não encontrada.");
        await linkProjectRepository({
          projectId: project_id,
          repositoryId: repository.id,
          role: "primary",
        });
      }
      await audit("create_repository", "repository", repository.id);
      return textResult({
        repositoryId: repository.id,
        repository,
        linkedProjectId: project_id ?? null,
      });
    },
  );

  server.registerTool(
    "update_repository",
    {
      title: "Atualizar Embarcação",
      inputSchema: z.object({
        repository_id: z.string().uuid(),
        name: z.string().trim().min(2).max(80).optional(),
        kind: z.enum(["git", "local", "both"]).optional(),
        remote_url: z.string().trim().max(2_048).optional().nullable(),
        notes: z.string().trim().max(2_000).optional(),
      }),
    },
    async ({ repository_id, name, kind, remote_url, notes }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({ mode: ready.identity.workMode, action: "update_repository" });
      if (!check.ok) return errorResult(check.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const existing = await getRepository(repository_id, ready.store.workspaceId);
      if (!existing) return errorResult("Embarcação não encontrada.");
      const validated = validateRepositoryMutation({
        role: membership.role,
        name: name ?? existing.name,
        kind: kind ?? existing.kind,
        remoteUrl: remote_url !== undefined ? remote_url : existing.remoteUrl,
      });
      if (!validated.ok) return errorResult(validated.error);
      const repository = await updateRepository(repository_id, ready.store.workspaceId, {
        ...(name ? { name } : {}),
        ...(kind ? { kind } : {}),
        ...(remote_url !== undefined ? { remoteUrl: remote_url } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
      if (!repository) return errorResult("Embarcação não encontrada.");
      await audit("update_repository", "repository", repository_id);
      return textResult({ repository });
    },
  );

  server.registerTool(
    "link_project_repository",
    {
      title: "Vincular Embarcação à Expedição",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        repository_id: z.string().uuid(),
        role: z.enum(projectRepositoryRoles).default("primary"),
        path_scopes: z.array(z.string().trim().min(1).max(240)).max(40).optional(),
        notes: z.string().trim().max(2_000).default(""),
      }),
    },
    async ({ project_id, repository_id, role, path_scopes, notes }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "link_project_repository",
      });
      if (!check.ok) return errorResult(check.error);
      const project = await getProject(project_id, ready.store.workspaceId);
      const repository = await getRepository(repository_id, ready.store.workspaceId);
      if (!project || !repository) return errorResult("Expedição ou Embarcação não encontrada.");
      await linkProjectRepository({
        projectId: project_id,
        repositoryId: repository_id,
        role: role ?? "primary",
        pathScopes: path_scopes,
        notes,
      });
      await audit("link_project_repository", "project", project_id);
      return textResult({ projectId: project_id, repositoryId: repository_id, role: role ?? "primary" });
    },
  );

  server.registerTool(
    "list_repositories",
    {
      title: "Listar Embarcações",
      description: "Embarcações registradas no porto do token.",
      inputSchema: z.object({}),
    },
    async () => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({ mode: ready.identity.workMode, action: "list_repositories" });
      if (!check.ok) return errorResult(check.error);
      const repositories = await listRepositories(ready.store.workspaceId);
      return textResult({ repositories });
    },
  );

  server.registerTool(
    "get_project_context",
    {
      title: "Contexto-base da Expedição",
      description: "Devolve a Expedição, Embarcações vinculadas e Rumos.",
      inputSchema: z.object({ project_id: z.string().uuid() }),
    },
    async ({ project_id }) => {
      if (!project_id) return errorResult("project_id é obrigatório.");
      const store = requireWorkspace();
      const project = await getProject(project_id, store.workspaceId);
      if (!project) return errorResult("Expedição não encontrada.");
      const repos = await listProjectRepositories(project.id, store.workspaceId);
      const packs = await listContextPacks(store.workspaceId, project.id);
      return textResult({ project, repositories: repos, packs });
    },
  );

  server.registerTool(
    "get_context_pack",
    {
      title: "Obter Rumo",
      description:
        "Serve somente revisão aprovada e válida. Caso contrário devolve diagnóstico pack_not_servable (RN-101).",
      inputSchema: z.object({ pack_id: z.string() }),
    },
    async ({ pack_id }) => {
      const store = requireWorkspace();
      const pack = await getContextPack(pack_id, store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      const revisionId = pack.currentRevisionId;
      const items = revisionId ? await listRevisionItems(pack.id, revisionId) : await listDraftItems(pack.id);
      const sources = revisionId ? await listRevisionSources(pack.id, revisionId) : await listDraftSources(pack.id);
      const servable = isPackServable({ status: pack.status, validity: pack.validity, items });
      if (!servable.ok) {
        return textResult({
          ok: false,
          code: servable.code,
          reasons: servable.reasons,
          packId: pack.id,
          revisionId,
          untrustedContent: untrustedContentNote(),
        });
      }
      const criteria = await listRevisionCriteria(pack.id, revisionId!);
      return textResult({
        ok: true,
        packId: pack.id,
        revisionId,
        pack,
        items,
        sources,
        criteria,
        untrustedContent: untrustedContentNote(),
      });
    },
  );

  server.registerTool(
    "get_implementation_brief",
    {
      title: "Brief de implementação",
      description: "Recorte por Rumo, Manobra e/ou Embarcação. brief ou full. Sempre inclui packId e revisionId.",
      inputSchema: z.object({
        pack_id: z.string().optional(),
        task_id: z.string().optional(),
        repository_id: z.string().uuid().optional(),
        mode: z.enum(["brief", "full"]).default("brief"),
      }),
    },
    async ({ pack_id, task_id, repository_id, mode }) => {
      const store = requireWorkspace();
      const task = task_id ? await getImplementationTask(task_id, store.workspaceId) : null;
      const packId = pack_id
        ? ((await resolveBoardId(store.workspaceId, pack_id, "pack")) ?? pack_id)
        : task?.packId;
      if (!packId) return errorResult("Informe pack_id ou task_id.");
      const pack = await getContextPack(packId, store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      const revisionId = task?.packRevisionId ?? pack.currentRevisionId;
      const items = revisionId ? await listRevisionItems(pack.id, revisionId) : [];
      const servable = isPackServable({ status: pack.status, validity: pack.validity, items });
      if (!servable.ok) {
        return textResult({ ok: false, code: servable.code, reasons: servable.reasons, packId: pack.id, revisionId });
      }
      const criteria = revisionId ? await listRevisionCriteria(pack.id, revisionId) : [];
      const sources = revisionId ? await listRevisionSources(pack.id, revisionId) : [];
      const taskSources = task ? await listTaskSources(task.id) : [];
      const sessionResult = await resolveSession(repository_id, task?.repositoryId);
      if (!sessionResult.ok) return errorResult(sessionResult.error);
      const repository = sessionResult.repository;
      return textResult(
        buildImplementationBrief({
          pack,
          revisionId,
          items,
          criteria,
          task: task ? { id: task.id, objective: task.objective, pathScopes: task.pathScopes } : null,
          mode: mode ?? "brief",
          sources,
          taskSources: taskSources.map((source) => ({
            id: source.id,
            documentId: source.documentId,
            releaseId: source.releaseId,
            required: source.required,
            reason: source.reason,
            sourceRole: source.sourceRole,
          })),
          repository: repository ? { id: repository.id, name: repository.name } : null,
          taskFull: task,
        }),
      );
    },
  );

  server.registerTool(
    "get_related_context",
    {
      title: "Contexto relacionado",
      description: "Rumos que usam uma carta, ou Embarcações de uma Expedição.",
      inputSchema: z.object({
        document_id: z.string().optional(),
        project_id: z.string().uuid().optional(),
      }),
    },
    async ({ document_id, project_id }) => {
      const store = requireWorkspace();
      const packs = document_id ? await listPacksUsingDocument(document_id, store.workspaceId) : [];
      const repos = project_id ? await listProjectRepositories(project_id, store.workspaceId) : [];
      return textResult({ packs, repositories: repos });
    },
  );

  server.registerTool(
    "propose_context_pack",
    {
      title: "Propor rascunho de Rumo",
      description: "Cria Rumo em draft. Não aprova.",
      inputSchema: z.object({
        project_id: z.string().uuid(),
        title: z.string().trim().min(3).max(180),
        objective: z.string().trim().max(8_000).default(""),
        expected_outcome: z.string().trim().max(8_000).default(""),
        scope: z.string().trim().max(8_000).default(""),
        out_of_scope: z.string().trim().max(8_000).default(""),
        document_id: z.string().optional(),
        release_id: z.string().optional(),
      }),
    },
    async ({
      project_id,
      title,
      objective,
      expected_outcome,
      scope,
      out_of_scope,
      document_id,
      release_id,
    }) => {
      if (!project_id) return errorResult("project_id é obrigatório.");
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const action = validateAgentAction({ mode: ready.identity.workMode, action: "propose_context_pack" });
      if (!action.ok) return errorResult(action.error);
      const titleCheck = validateContextPackTitle(title);
      if (!titleCheck.ok) return errorResult(titleCheck.error);
      const project = await getProject(project_id, ready.store.workspaceId);
      if (!project) return errorResult("Expedição não encontrada.");
      const pack = await createContextPack({
        workspaceId: ready.store.workspaceId,
        projectId: project_id,
        title,
        objective,
        expectedOutcome: expected_outcome,
        scope,
        outOfScope: out_of_scope,
        ownerUserId: ready.store.userId,
      });
      if (document_id) {
        const access = await documentAccessContext(ready.store.userId);
        const document = await getDocument(document_id, access);
        if (document && (await getDocumentAccessLevel(document, access))) {
          const sourceCheck = validateContextPackSourceDraft({
            documentId: document.id,
            releaseId: release_id ?? null,
            role: documentSourceRoles[0],
            required: Boolean(release_id),
            reason: "Carta-fonte inicial",
          });
          if (sourceCheck.ok) {
            await addContextPackSource({
              packId: pack.id,
              workspaceId: ready.store.workspaceId,
              documentId: document.id,
              releaseId: release_id ?? null,
              sourceRole: documentSourceRoles[0],
              reason: "Carta-fonte inicial",
              required: Boolean(release_id),
            });
          }
        }
      }
      await audit("propose_context_pack", "context_pack", pack.id);
      return textResult({ packId: pack.id, revisionId: null, status: pack.status });
    },
  );

  server.registerTool(
    "update_context_pack",
    {
      title: "Atualizar Rumo em rascunho",
      description: "Metadados do Rumo (título, objetivo, escopo…) enquanto editável.",
      inputSchema: z.object({
        pack_id: z.string(),
        title: z.string().trim().min(3).max(180).optional(),
        objective: z.string().trim().max(8_000).optional(),
        expected_outcome: z.string().trim().max(8_000).optional(),
        scope: z.string().trim().max(8_000).optional(),
        out_of_scope: z.string().trim().max(8_000).optional(),
      }),
    },
    async ({ pack_id, title, expected_outcome, out_of_scope, objective, scope }) => {
      const ctx = await requireEditablePack(pack_id, "update_context_pack");
      if (!ctx.ok) return errorResult(ctx.error);
      if (title) {
        const titleCheck = validateContextPackTitle(title);
        if (!titleCheck.ok) return errorResult(titleCheck.error);
      }
      const pack = await updateContextPack(ctx.pack.id, ctx.store.workspaceId, {
        ...(title ? { title } : {}),
        ...(objective !== undefined ? { objective } : {}),
        ...(expected_outcome !== undefined ? { expectedOutcome: expected_outcome } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(out_of_scope !== undefined ? { outOfScope: out_of_scope } : {}),
      });
      if (!pack) return errorResult("Rumo não encontrado.");
      await audit("update_context_pack", "context_pack", ctx.pack.id);
      return textResult({ pack });
    },
  );

  server.registerTool(
    "add_context_pack_item",
    {
      title: "Adicionar item ao Rumo",
      description: "Item tipado no rascunho ou revisão em edição (RN-108).",
      inputSchema: z.object({
        pack_id: z.string(),
        type: z.enum(contextItemTypes),
        strength: z.enum(contextItemStrengths),
        body: z.string().trim().min(1).max(8_000),
        blocking: z.boolean().optional(),
      }),
    },
    async ({ pack_id, type, strength, body, blocking }) => {
      const ctx = await requireEditablePack(pack_id, "add_context_pack_item");
      if (!ctx.ok) return errorResult(ctx.error);
      const validated = validateContextItem({ type, strength, body, blocking });
      if (!validated.ok) return errorResult(validated.error);
      const item = await addContextPackItem({
        packId: ctx.pack.id,
        workspaceId: ctx.store.workspaceId,
        type,
        strength,
        body,
        blocking,
      });
      await audit("add_context_pack_item", "context_pack", ctx.pack.id);
      return textResult({ item });
    },
  );

  server.registerTool(
    "add_context_pack_source",
    {
      title: "Adicionar Carta-fonte ao Rumo",
      description: "Fonte formal ou de referência no rascunho (release imutável quando required).",
      inputSchema: z.object({
        pack_id: z.string(),
        document_id: z.string(),
        release_id: z.string().optional().nullable(),
        source_role: z.enum(documentSourceRoles),
        section: z.string().optional().nullable(),
        reason: z.string().trim().min(1),
        required: z.boolean().optional(),
      }),
    },
    async ({ pack_id, document_id, release_id, source_role, section, reason, required }) => {
      const ctx = await requireEditablePack(pack_id, "add_context_pack_source");
      if (!ctx.ok) return errorResult(ctx.error);
      const sourceCheck = validateContextPackSourceDraft({
        documentId: document_id,
        releaseId: release_id ?? null,
        role: source_role,
        required: required ?? true,
        reason,
      });
      if (!sourceCheck.ok) return errorResult(sourceCheck.error);
      if (release_id) {
        const release = await getDocumentRelease(release_id);
        if (!release || release.documentId !== document_id) {
          return errorResult("A edição escolhida não pertence a esta Carta.");
        }
      }
      const source = await addContextPackSource({
        packId: ctx.pack.id,
        workspaceId: ctx.store.workspaceId,
        documentId: document_id,
        releaseId: release_id ?? null,
        sourceRole: source_role,
        section: section ?? null,
        reason,
        required: required ?? true,
      });
      await audit("add_context_pack_source", "context_pack", ctx.pack.id);
      return textResult({ source });
    },
  );

  server.registerTool(
    "delete_context_pack_item",
    {
      title: "Remover item do Rumo",
      inputSchema: z.object({
        pack_id: z.string(),
        item_id: z.string(),
      }),
    },
    async ({ pack_id, item_id }) => {
      const ctx = await requireEditablePack(pack_id, "delete_context_pack_item");
      if (!ctx.ok) return errorResult(ctx.error);
      const itemId = (await resolveBoardId(ctx.store.workspaceId, item_id, "item")) ?? item_id;
      await deleteContextPackItem(itemId, ctx.pack.id);
      await audit("delete_context_pack_item", "context_pack", ctx.pack.id);
      return textResult({ ok: true });
    },
  );

  server.registerTool(
    "delete_context_pack_source",
    {
      title: "Remover Carta-fonte do Rumo",
      inputSchema: z.object({
        pack_id: z.string(),
        source_id: z.string(),
      }),
    },
    async ({ pack_id, source_id }) => {
      const ctx = await requireEditablePack(pack_id, "delete_context_pack_source");
      if (!ctx.ok) return errorResult(ctx.error);
      const sourceId = (await resolveBoardId(ctx.store.workspaceId, source_id, "source")) ?? source_id;
      await deleteContextPackSource(sourceId, ctx.pack.id);
      await audit("delete_context_pack_source", "context_pack", ctx.pack.id);
      return textResult({ ok: true });
    },
  );

  server.registerTool(
    "add_implementation_task_source",
    {
      title: "Adicionar Carta-fonte à Manobra ou Lance",
      description: "Vincula carta-fonte à linha de trabalho. Tripulação do porto (RN-118).",
      inputSchema: z.object({
        task_id: z.string(),
        document_id: z.string(),
        release_id: z.string().optional().nullable(),
        source_role: z.enum(documentSourceRoles),
        section: z.string().optional().nullable(),
        reason: z.string().trim().min(1),
        required: z.boolean().optional(),
      }),
    },
    async ({ task_id, document_id, release_id, source_role, section, reason, required }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const taskId = (await resolveBoardId(ready.store.workspaceId, task_id, "task")) ?? task_id;
      const task = await getImplementationTask(taskId, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const sourceCheck = validateContextPackSourceDraft({
        documentId: document_id,
        releaseId: release_id ?? null,
        role: source_role,
        required: required ?? false,
        reason,
      });
      if (!sourceCheck.ok) return errorResult(sourceCheck.error);
      if (release_id) {
        const release = await getDocumentRelease(release_id);
        if (!release || release.documentId !== document_id) {
          return errorResult("A edição escolhida não pertence a esta Carta.");
        }
      }
      const source = await addImplementationTaskSource({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        documentId: document_id,
        releaseId: release_id ?? null,
        sourceRole: source_role,
        section: section ?? null,
        reason,
        required: required ?? false,
      });
      await audit("add_implementation_task_source", "task", task.id);
      return textResult({ source });
    },
  );

  server.registerTool(
    "delete_implementation_task_source",
    {
      title: "Remover Carta-fonte da Manobra ou Lance",
      inputSchema: z.object({
        task_id: z.string(),
        source_id: z.string(),
      }),
    },
    async ({ task_id, source_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const taskId = (await resolveBoardId(ready.store.workspaceId, task_id, "task")) ?? task_id;
      const task = await getImplementationTask(taskId, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const sourceId = (await resolveBoardId(ready.store.workspaceId, source_id, "source")) ?? source_id;
      await deleteImplementationTaskSource(sourceId, task.id);
      await audit("delete_implementation_task_source", "task", task.id);
      return textResult({ ok: true });
    },
  );

  server.registerTool(
    "add_acceptance_criterion",
    {
      title: "Adicionar Marco de chegada",
      inputSchema: z.object({
        pack_id: z.string(),
        description: z.string().trim().min(1),
      }),
    },
    async ({ pack_id, description }) => {
      const ctx = await requireEditablePack(pack_id, "add_acceptance_criterion");
      if (!ctx.ok) return errorResult(ctx.error);
      const validated = validateAcceptanceCriterion(description);
      if (!validated.ok) return errorResult(validated.error);
      const criterion = await addAcceptanceCriterion({
        packId: ctx.pack.id,
        workspaceId: ctx.store.workspaceId,
        description,
      });
      await audit("add_acceptance_criterion", "context_pack", ctx.pack.id);
      return textResult({ criterion });
    },
  );

  server.registerTool(
    "delete_acceptance_criterion",
    {
      title: "Remover Marco de chegada",
      inputSchema: z.object({
        pack_id: z.string(),
        criterion_id: z.string(),
      }),
    },
    async ({ pack_id, criterion_id }) => {
      const ctx = await requireEditablePack(pack_id, "delete_acceptance_criterion");
      if (!ctx.ok) return errorResult(ctx.error);
      const criterionId = (await resolveBoardId(ctx.store.workspaceId, criterion_id, "criterion")) ?? criterion_id;
      await deleteAcceptanceCriterion(criterionId, ctx.pack.id);
      await audit("delete_acceptance_criterion", "context_pack", ctx.pack.id);
      return textResult({ ok: true });
    },
  );

  server.registerTool(
    "save_implementation_plan",
    {
      title: "Salvar plano de navegação",
      description: "Plano opcional do Rumo em rascunho.",
      inputSchema: z.object({
        pack_id: z.string(),
        summary: z.string().max(8_000),
      }),
    },
    async ({ pack_id, summary }) => {
      const ctx = await requireEditablePack(pack_id, "save_implementation_plan");
      if (!ctx.ok) return errorResult(ctx.error);
      const plan = await upsertDraftPlan({
        packId: ctx.pack.id,
        workspaceId: ctx.store.workspaceId,
        summary,
      });
      await audit("save_implementation_plan", "context_pack", ctx.pack.id);
      return textResult({ plan });
    },
  );

  server.registerTool(
    "create_implementation_task",
    {
      title: "Criar Manobra",
      description: "Manobra no rascunho do Rumo. Código exige repository_id.",
      inputSchema: z.object({
        pack_id: z.string(),
        objective: z.string().trim().min(1),
        repository_id: z.string().uuid().optional().nullable(),
        path_scopes: z.array(z.string()).optional(),
        parent_task_id: z.string().optional().nullable(),
      }),
    },
    async ({ pack_id, objective, repository_id, path_scopes, parent_task_id }) => {
      const ctx = await requireEditablePack(pack_id, "create_implementation_task");
      if (!ctx.ok) return errorResult(ctx.error);
      const packId = ctx.pack.id;
      const parentTaskId = parent_task_id
        ? ((await resolveBoardId(ctx.store.workspaceId, parent_task_id, "task")) ?? parent_task_id)
        : null;
      const validated = parentTaskId ? validateLanceObjective(objective) : validateTaskObjective(objective);
      if (!validated.ok) return errorResult(validated.error);
      if (parentTaskId) {
        const parent = await getImplementationTask(parentTaskId, ctx.store.workspaceId);
        const parentCheck = validateParentTask({
          parent: parent ? { id: parent.id, parentTaskId: parent.parentTaskId, packId: parent.packId } : null,
          packId,
        });
        if (!parentCheck.ok) return errorResult(parentCheck.error);
      }
      if (repository_id) {
        const repository = await getRepository(repository_id, ctx.store.workspaceId);
        if (!repository) return errorResult("Embarcação não encontrada neste porto.");
      }
      const task = await addImplementationTask({
        packId,
        workspaceId: ctx.store.workspaceId,
        objective,
        repositoryId: repository_id ?? null,
        pathScopes: path_scopes,
        parentTaskId,
      });
      await audit("create_implementation_task", "task", task.id);
      return textResult({ task });
    },
  );

  server.registerTool(
    "assign_implementation_task",
    {
      title: "Delegar Manobra ou Lance",
      description: "Atribui responsável (tripulante ou agente). Não cria lease. RN-115.",
      inputSchema: z.object({
        task_id: z.string(),
        assignee_user_id: z.string().uuid().optional().nullable(),
        assignee_agent_identity_id: z.string().uuid().optional().nullable(),
      }),
    },
    async ({ task_id, assignee_user_id, assignee_agent_identity_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "assign_implementation_task",
      });
      if (!check.ok) return errorResult(check.error);
      const taskId = (await resolveBoardId(ready.store.workspaceId, task_id, "task")) ?? task_id;
      const current = await getImplementationTask(taskId, ready.store.workspaceId);
      if (!current) return errorResult("Manobra não encontrada.");
      const assigned = validateAssignTaskOnTask({
        status: current.status,
        assigneeUserId: assignee_user_id,
        assigneeAgentIdentityId: assignee_agent_identity_id,
      });
      if (!assigned.ok) return errorResult(assigned.error);
      const task = await assignImplementationTask({
        taskId,
        workspaceId: ready.store.workspaceId,
        assigneeUserId: assignee_user_id ?? null,
        assigneeAgentIdentityId: assignee_agent_identity_id ?? null,
      });
      if (!task) return errorResult("Manobra não encontrada.");
      await audit("assign_implementation_task", "task", task.id);
      return textResult({ task });
    },
  );

  server.registerTool(
    "submit_context_pack_review",
    {
      title: "Enviar Rumo para revisão",
      inputSchema: z.object({ pack_id: z.string() }),
    },
    async ({ pack_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "submit_context_pack_review",
      });
      if (!check.ok) return errorResult(check.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const pack = await getContextPack(pack_id, ready.store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      if (
        pack.ownerUserId !== ready.store.userId &&
        membership.role !== "owner" &&
        membership.role !== "admin"
      ) {
        return errorResult("Só o responsável envia o Rumo para revisão.");
      }
      await updateContextPack(pack.id, ready.store.workspaceId, { status: "review" });
      await audit("submit_context_pack_review", "context_pack", pack.id);
      return textResult({ packId: pack.id, status: "review" });
    },
  );

  server.registerTool(
    "approve_context_pack",
    {
      title: "Aprovar Rumo",
      description: "Gera revisão imutável (RN-99). Exige confirmação implícita ao chamar.",
      inputSchema: z.object({ pack_id: z.string() }),
    },
    async ({ pack_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "approve_context_pack",
      });
      if (!check.ok) return errorResult(check.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const pack = await getContextPack(pack_id, ready.store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      const items = await listDraftItems(pack.id);
      const sources = await listDraftSources(pack.id);
      const validated = validateContextPackApproval({
        actorId: ready.store.userId,
        ownerUserId: pack.ownerUserId,
        role: membership.role,
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
      if (!validated.ok) return errorResult(validated.error);
      const criteria = await listDraftCriteria(pack.id);
      const tasks = await listDraftTasks(pack.id);
      const result = await approveContextPack({
        pack,
        approvedBy: ready.store.userId,
        snapshot: { pack, items, sources, criteria, tasks },
      });
      await audit("approve_context_pack", "context_pack", pack.id);
      return textResult({
        packId: result.pack.id,
        revisionId: result.revision.id,
        status: result.pack.status,
      });
    },
  );

  server.registerTool(
    "start_new_context_pack_revision",
    {
      title: "Nova revisão do Rumo",
      description: "Copia Rumo aprovado para rascunho (RN-99).",
      inputSchema: z.object({ pack_id: z.string() }),
    },
    async ({ pack_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "start_new_context_pack_revision",
      });
      if (!check.ok) return errorResult(check.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const pack = await getContextPack(pack_id, ready.store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      const validated = validateStartNewRevision({
        actorId: ready.store.userId,
        ownerUserId: pack.ownerUserId,
        role: membership.role,
        status: pack.status,
      });
      if (!validated.ok) return errorResult(validated.error);
      const next = await startNewContextPackRevision(pack);
      await audit("start_new_context_pack_revision", "context_pack", pack.id);
      return textResult({
        packId: next.id,
        status: next.status,
        note: existingManeuverRevisionNote(),
      });
    },
  );

  server.registerTool(
    "accept_implementation_task_result",
    {
      title: "Aceitar resultado da Manobra",
      description: "Aceite humano do registro de bordo (RN-103).",
      inputSchema: z.object({ task_id: z.string() }),
    },
    async ({ task_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "accept_task_result",
      });
      if (!check.ok) return errorResult(check.error);
      const membership = await requireMembership();
      if (!membership.ok) return errorResult(membership.error);
      const task = await getImplementationTask(task_id, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const pack = await getContextPack(task.packId, ready.store.workspaceId);
      if (!pack) return errorResult("Rumo não encontrado.");
      const canAccept = canApproveContextPack({
        actorId: ready.store.userId,
        ownerUserId: pack.ownerUserId,
        role: membership.role,
      });
      const validated = validateAcceptTaskResult({ status: task.status, canAccept });
      if (!validated.ok) return errorResult(validated.error);
      if (!task.parentTaskId) {
        const children = await listChildTasks(task.id, ready.store.workspaceId);
        const parentResult = validateParentResult({ children });
        if (!parentResult.ok) return errorResult(parentResult.error);
        await acceptReportedChildren(task.id, ready.store.workspaceId);
      }
      await setTaskStatus(task.id, ready.store.workspaceId, "accepted");
      await audit("accept_implementation_task_result", "task", task.id);
      return textResult({ taskId: task.id, status: "accepted" });
    },
  );

  server.registerTool(
    "list_available_implementation_tasks",
    {
      title: "Listar Manobras disponíveis",
      description: "Manobras e Lances compatíveis com o modo do Agente de Bordo e a Embarcação da sessão.",
      inputSchema: z.object({
        pack_id: z.string().optional(),
        repository_id: z.string().uuid().optional(),
      }),
    },
    async ({ pack_id, repository_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const sessionResult = await resolveSession(repository_id);
      if (!sessionResult.ok) return errorResult(sessionResult.error);
      const session = sessionResult.session;
      let tasks = await listAvailableTasks(ready.store.workspaceId);
      if (pack_id) {
        const pack = await getContextPack(pack_id, ready.store.workspaceId);
        if (pack) tasks = tasks.filter((task) => task.packId === pack.id);
        else tasks = [];
      }
      const compatible = (
        await Promise.all(
          tasks.map(async (task) => {
            const servable = await packIsServable(task.packId, task.packRevisionId);
            if (!servable.ok) return null;
            const check = validateAgentAction({
              mode: ready.identity.workMode,
              action: isCodeTask(task.repositoryId) ? "claim_code_task" : "claim_non_code_task",
              session,
              isCodeTask: isCodeTask(task.repositoryId),
            });
            return check.ok ? task : null;
          }),
        )
      ).filter((task) => task !== null);
      return textResult({
        tasks: compatible.map((task) => ({
          id: task.id,
          number: task.boardNumber,
          parentTaskId: task.parentTaskId,
          packId: task.packId,
          packRevisionId: task.packRevisionId,
          objective: task.objective,
          isCode: isCodeTask(task.repositoryId),
        })),
      });
    },
  );

  server.registerTool(
    "claim_implementation_task",
    {
      title: "Assumir o comando da Manobra",
      description: "Lease atômico na linha (Manobra ou Lance). Manobra com Lances também se assume. RN-103, RN-113.",
      inputSchema: z.object({
        task_id: z.string(),
        repository_id: z.string().uuid().optional(),
        accept_revision_id: z.string().uuid().optional(),
      }),
    },
    async ({ task_id, repository_id, accept_revision_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const resolvedTaskId = (await resolveBoardId(ready.store.workspaceId, task_id, "task")) ?? task_id;
      const task = await getImplementationTask(resolvedTaskId, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const servable = await packIsServable(task.packId, task.packRevisionId);
      if (!servable.ok) {
        return textResult({
          ok: false,
          code: "pack_not_servable",
          reasons: servable.reasons,
          packId: task.packId,
          revisionId: task.packRevisionId,
        });
      }
      const sessionResult = await resolveSession(repository_id, task.repositoryId);
      if (!sessionResult.ok) return errorResult(sessionResult.error);
      const session = sessionResult.session;
      const actionName: AgentAction = isCodeTask(task.repositoryId) ? "claim_code_task" : "claim_non_code_task";
      const capability = validateAgentAction({
        mode: ready.identity.workMode,
        action: actionName,
        session,
        isCodeTask: isCodeTask(task.repositoryId),
      });
      if (!capability.ok) return errorResult(capability.error);
      const pack = await getContextPack(task.packId, ready.store.workspaceId);
      if (pack?.currentRevisionId && task.packRevisionId) {
        const revisionChoice = validateTaskRevisionChoice({
          taskRevisionId: task.packRevisionId,
          currentApprovedRevisionId: pack.currentRevisionId,
          explicitChoice: Boolean(accept_revision_id),
        });
        if (!revisionChoice.ok) return errorResult(revisionChoice.error);
      }
      const claimCheck = validateClaimTask({
        task: {
          status: task.status,
          leaseHolderTokenId: task.leaseHolderTokenId,
          leaseExpiresAt: task.leaseExpiresAt,
          packRevisionId: task.packRevisionId ?? "",
          repositoryId: task.repositoryId,
        },
        actorTokenId: ready.store.tokenId,
      });
      if (!claimCheck.ok) return errorResult(claimCheck.error);
      const claimed = await claimImplementationTask({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        tokenId: ready.store.tokenId,
        identityId: ready.identity.id,
        userId: ready.store.userId,
      });
      if (!claimed) return errorResult("Não foi possível assumir o comando (corrida de lease).");
      await audit("claim_implementation_task", "task", claimed.id);
      return textResult({
        packId: claimed.packId,
        revisionId: claimed.packRevisionId,
        task: claimed,
      });
    },
  );

  server.registerTool(
    "renew_implementation_task_lease",
    {
      title: "Renovar lease da Manobra",
      description: "Exige atividade explícita do mesmo agente.",
      inputSchema: z.object({ task_id: z.string() }),
    },
    async ({ task_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const task = await getImplementationTask(task_id, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const check = validateRenewLease({
        task: {
          status: task.status,
          leaseHolderTokenId: task.leaseHolderTokenId,
          leaseExpiresAt: task.leaseExpiresAt,
          packRevisionId: task.packRevisionId ?? "",
          repositoryId: task.repositoryId,
        },
        actorTokenId: ready.store.tokenId,
      });
      if (!check.ok) return errorResult(check.error);
      const renewed = await renewImplementationTaskLease({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        tokenId: ready.store.tokenId,
      });
      if (!renewed) return errorResult("Não foi possível renovar o lease.");
      await audit("renew_implementation_task_lease", "task", task.id);
      return textResult({ packId: renewed.packId, revisionId: renewed.packRevisionId, task: renewed });
    },
  );

  server.registerTool(
    "release_implementation_task",
    {
      title: "Soltar o comando da Manobra",
      description: "Libera o lease para outro agente.",
      inputSchema: z.object({ task_id: z.string() }),
    },
    async ({ task_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const task = await getImplementationTask(task_id, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const check = validateReleaseTask({
        task: {
          status: task.status,
          leaseHolderTokenId: task.leaseHolderTokenId,
          leaseExpiresAt: task.leaseExpiresAt,
          packRevisionId: task.packRevisionId ?? "",
          repositoryId: task.repositoryId,
        },
        actorTokenId: ready.store.tokenId,
      });
      if (!check.ok) return errorResult(check.error);
      await releaseImplementationTask({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        tokenId: ready.store.tokenId,
      });
      await audit("release_implementation_task", "task", task.id);
      return textResult({ released: true, packId: task.packId, revisionId: task.packRevisionId });
    },
  );

  server.registerTool(
    "report_implementation_progress",
    {
      title: "Registrar progresso",
      description: "Registro de bordo intermediário. Não aceita o resultado.",
      inputSchema: z.object({
        task_id: z.string(),
        summary: z.string().trim().min(1).max(8_000),
        changed_scopes: z.array(z.string()).optional(),
        evidence: z.string().optional(),
      }),
    },
    async ({ task_id, summary, changed_scopes, evidence }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const task = await getImplementationTask(task_id, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      const leaseCheck = validateRegisterProgress({
        task: {
          status: task.status,
          leaseHolderTokenId: task.leaseHolderTokenId,
          leaseExpiresAt: task.leaseExpiresAt,
          packRevisionId: task.packRevisionId ?? "",
          repositoryId: task.repositoryId,
        },
        actorTokenId: ready.store.tokenId,
      });
      if (!leaseCheck.ok) return errorResult(leaseCheck.error);
      const registered = await registerAuthorizedProgress({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        tokenId: ready.store.tokenId,
        packRevisionId: task.packRevisionId,
        kind: "progress",
        summary,
        changedScopes: changed_scopes,
        evidence,
        userId: ready.store.userId,
        agentIdentityId: ready.identity.id,
      });
      if (!registered.ok) return errorResult(registered.error);
      await audit("report_implementation_progress", "task", task.id);
      return textResult({ packId: task.packId, revisionId: task.packRevisionId, report: registered.report });
    },
  );

  server.registerTool(
    "report_implementation_result",
    {
      title: "Registrar resultado",
      description: "Fecha o Registro de bordo. Não aceita sozinho. Teste local e commit/PR só no modo local_implementation.",
      inputSchema: z.object({
        task_id: z.string(),
        summary: z.string().trim().min(1).max(8_000),
        changed_scopes: z.array(z.string()).optional(),
        evidence: z.string().optional(),
        commit_ref: z.string().optional(),
        pull_request_ref: z.string().optional(),
        covered_criterion_ids: z.array(z.string().uuid()).optional(),
        gaps: z.string().optional(),
        claims_local_test: z.boolean().optional(),
      }),
    },
    async (args) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      if (args.claims_local_test) {
        const check = validateAgentAction({ mode: ready.identity.workMode, action: "report_local_test" });
        if (!check.ok) return errorResult(check.error);
      }
      if (args.commit_ref || args.pull_request_ref) {
        const check = validateAgentAction({ mode: ready.identity.workMode, action: "report_own_commit" });
        if (!check.ok) return errorResult(check.error);
      }
      const task = await getImplementationTask(args.task_id, ready.store.workspaceId);
      if (!task) return errorResult("Manobra não encontrada.");
      if (!task.parentTaskId) {
        const children = await listChildTasks(task.id, ready.store.workspaceId);
        const parentResult = validateParentResult({ children });
        if (!parentResult.ok) return errorResult(parentResult.error);
      }
      const leaseCheck = validateRegisterResult({
        task: {
          status: task.status,
          leaseHolderTokenId: task.leaseHolderTokenId,
          leaseExpiresAt: task.leaseExpiresAt,
          packRevisionId: task.packRevisionId ?? "",
          repositoryId: task.repositoryId,
        },
        actorTokenId: ready.store.tokenId,
      });
      if (!leaseCheck.ok) return errorResult(leaseCheck.error);
      const registered = await registerAuthorizedProgress({
        taskId: task.id,
        workspaceId: ready.store.workspaceId,
        tokenId: ready.store.tokenId,
        packRevisionId: task.packRevisionId,
        kind: "result",
        summary: args.summary,
        changedScopes: args.changed_scopes,
        evidence: args.evidence,
        commitRef: args.commit_ref,
        pullRequestRef: args.pull_request_ref,
        coveredCriterionIds: args.covered_criterion_ids,
        gaps: args.gaps,
        userId: ready.store.userId,
        agentIdentityId: ready.identity.id,
      });
      if (!registered.ok) return errorResult(registered.error);
      await audit("report_implementation_result", "task", task.id);
      return textResult({
        packId: task.packId,
        revisionId: task.packRevisionId,
        report: registered.report,
        accepted: false,
        note: "Done — o aceite humano é separado.",
      });
    },
  );

  server.registerTool(
    "list_coordination_threads",
    {
      title: "Listar Conversas de bordo",
      description: "Fios de coordenação, separados dos comentários de carta.",
      inputSchema: z.object({
        subject_type: z.enum(["pack", "task", "item", "criterion"]).optional(),
        subject_id: z.string().optional(),
      }),
    },
    async ({ subject_type, subject_id }) => {
      const store = requireWorkspace();
      const subjectId = subject_id
        ? ((await resolveBoardId(store.workspaceId, subject_id)) ?? subject_id)
        : undefined;
      const threads = await listCoordinationThreads(store.workspaceId, {
        subjectType: subject_type,
        subjectId,
      });
      const withMessages = await Promise.all(
        threads.map(async (thread) => {
          const messages = await listCoordinationMessages(thread.id, store.workspaceId);
          const enriched = await Promise.all(
            messages.map(async (message) => {
              const user = await getUserById(message.userId);
              const agent = message.agentIdentityId
                ? await getAgentIdentity(message.agentIdentityId, store.workspaceId)
                : null;
              return {
                id: message.id,
                body: message.body,
                createdAt: message.createdAt,
                userId: message.userId,
                userName: user?.name?.trim() || user?.login || "Tripulante",
                agentIdentityId: message.agentIdentityId,
                agentName: agent?.name ?? null,
              };
            }),
          );
          return { ...thread, messages: enriched };
        }),
      );
      return textResult({ threads: withMessages });
    },
  );

  server.registerTool(
    "create_coordination_message",
    {
      title: "Mensagem na Conversa de bordo",
      description: "Cria fio ou responde. is_blocker marca Maré contrária.",
      inputSchema: z.object({
        thread_id: z.string().optional(),
        subject_type: z.enum(["pack", "task", "item", "criterion"]).optional(),
        subject_id: z.string().optional(),
        body: z.string().trim().min(1).max(2_000),
        is_blocker: z.boolean().optional(),
        mentioned_user_ids: z.array(z.string().uuid()).optional(),
        mentioned_agent_identity_ids: z.array(z.string().uuid()).optional(),
      }),
    },
    async (args) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const check = validateAgentAction({
        mode: ready.identity.workMode,
        action: "create_coordination_message",
      });
      if (!check.ok) return errorResult(check.error);
      if (args.thread_id) {
        const thread = await getCoordinationThread(args.thread_id, ready.store.workspaceId);
        const scoped = validateCoordinationThreadScope({
          threadWorkspaceId: thread?.workspaceId,
          actorWorkspaceId: ready.store.workspaceId,
        });
        if (!scoped.ok) return errorResult(scoped.error);
        const message = await addCoordinationMessage({
          threadId: thread!.id,
          workspaceId: ready.store.workspaceId,
          userId: ready.store.userId,
          agentIdentityId: ready.identity.id,
          body: args.body,
          mentionedUserIds: args.mentioned_user_ids,
          mentionedAgentIdentityIds: args.mentioned_agent_identity_ids,
        });
        if (!message) return errorResult("Conversa de bordo não encontrada neste porto.");
        return textResult({ message });
      }
      if (!args.subject_type || !args.subject_id) return errorResult("Informe thread_id ou subject_type + subject_id.");
      const subjectKind =
        args.subject_type === "pack"
          ? "pack"
          : args.subject_type === "task"
            ? "task"
            : args.subject_type === "item"
              ? "item"
              : "criterion";
      const subjectId = (await resolveBoardId(ready.store.workspaceId, args.subject_id, subjectKind)) ?? args.subject_id;
      const created = await createCoordinationThread({
        workspaceId: ready.store.workspaceId,
        subjectType: args.subject_type,
        subjectId,
        isBlocker: args.is_blocker,
        createdBy: ready.store.userId,
        body: args.body,
        agentIdentityId: ready.identity.id,
        mentionedUserIds: args.mentioned_user_ids,
        mentionedAgentIdentityIds: args.mentioned_agent_identity_ids,
      });
      if (args.is_blocker && args.subject_type === "task") {
        await setTaskStatus(subjectId, ready.store.workspaceId, "blocked");
      }
      await audit("create_coordination_message", args.subject_type, subjectId);
      return textResult(created);
    },
  );

  server.registerTool(
    "resolve_coordination_thread",
    {
      title: "Resolver Conversa de bordo",
      description: "Marca o fio como resolvido ou reabre.",
      inputSchema: z.object({
        thread_id: z.string(),
        resolved: z.boolean().default(true),
      }),
    },
    async ({ thread_id, resolved }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const thread = await resolveCoordinationThread(thread_id, ready.store.workspaceId, resolved ?? true);
      if (!thread) return errorResult("Conversa de bordo não encontrada.");
      if (thread.subjectType === "task") {
        const openBlockers = await countOpenBlockerThreads(
          ready.store.workspaceId,
          "task",
          thread.subjectId,
        );
        const task = await getImplementationTask(thread.subjectId, ready.store.workspaceId);
        if (task) {
          if (openBlockers > 0) {
            if (task.status !== "accepted" && task.status !== "reported") {
              await setTaskStatus(task.id, ready.store.workspaceId, "blocked");
            }
          } else if (task.status === "blocked") {
            await setTaskStatus(
              task.id,
              ready.store.workspaceId,
              nextStatusAfterLastBlockerResolved({
                status: task.status,
                leaseHolderTokenId: task.leaseHolderTokenId,
                leaseExpiresAt: task.leaseExpiresAt,
              }),
            );
          }
        }
      }
      return textResult({ thread });
    },
  );
}
