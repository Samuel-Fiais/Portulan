import { z } from "zod";
import {
  addCoordinationMessage,
  claimImplementationTask,
  countOpenBlockerThreads,
  createContextPack,
  createCoordinationThread,
  createProject,
  createRepository,
  getAgentIdentity,
  getContextPack,
  getCoordinationThread,
  getImplementationTask,
  getProject,
  getRepository,
  listAvailableTasks,
  listClaimedTasksForToken,
  listContextPacks,
  listCoordinationMessages,
  listCoordinationThreads,
  listDraftItems,
  listDraftSources,
  listPacksUsingDocument,
  listProjectRepositories,
  linkProjectRepository,
  listProjects,
  listProjectsForRepository,
  listRevisionCriteria,
  listRevisionItems,
  listRevisionSources,
  recordAuditEvent,
  registerAuthorizedProgress,
  releaseImplementationTask,
  renewImplementationTaskLease,
  resolveCoordinationThread,
  setTaskStatus,
} from "@/lib/db";
import { getWorkspaceMembership } from "@/lib/db/workspaces";
import { getUserById } from "@/lib/users";
import { validateProjectMutation, validateRepositoryMutation } from "@/lib/project-policy";
import { defaultAgentAllowedTools, disabledAgentTools } from "@/lib/agent-tool-policy";
import {
  bootstrapActionLists,
  sessionFromRecognizedRepository,
  validateAgentAction,
  validateSessionRepository,
} from "@/lib/agent-capability-policy";
import { isPackServable, untrustedContentNote } from "@/lib/context-pack-policy";
import { validateCoordinationThreadScope } from "@/lib/coordination-policy";
import { buildImplementationBrief } from "@/lib/implementation-brief";
import {
  nextStatusAfterLastBlockerResolved,
  validateClaimTask,
  validateRegisterProgress,
  validateRegisterResult,
  validateReleaseTask,
  validateRenewLease,
  validateTaskRevisionChoice,
} from "@/lib/implementation-task-policy";
import { isCodeTask, type AgentAction, type AgentWorkMode } from "@/lib/dev-context";
import { getMcpServerVersion } from "@/lib/system-guide";

type ToolServer = {
  registerTool: (
    name: string,
    config: Record<string, unknown>,
    handler: (args: ToolArgs) => Promise<unknown>,
  ) => void;
};

type ToolArgs = {
  repository_id?: string;
  query?: string;
  project_id: string;
  pack_id: string;
  task_id: string;
  document_id?: string;
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

  async function audit(action: string, targetType: string, targetId: string) {
    const store = getStore();
    if (!store.workspaceId) return;
    await recordAuditEvent({
      workspaceId: store.workspaceId,
      userId: store.userId,
      agentIdentityId: store.agentIdentityId,
      mcpTokenId: store.tokenId,
      action,
      targetType,
      targetId,
      clientInfo: store.clientInfo,
    });
  }

  server.registerTool(
    "get_agent_bootstrap",
    {
      title: "Bootstrap do Agente de Bordo",
      description:
        "Primeiro passo canônico. Devolve identidade, modo, clientInfo observado, Embarcação da sessão, Expedições, Manobras e o protocolo. RN-104, RN-105.",
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
        claimedTasks: claimed.map((task) => ({ id: task.id, objective: task.objective, packId: task.packId })),
        availableTasks: available.map((task) => ({
          id: task.id,
          objective: task.objective,
          packId: task.packId,
          packRevisionId: task.packRevisionId,
          isCode: isCodeTask(task.repositoryId),
        })),
        alerts,
        protocol: [
          "Chame get_agent_bootstrap no início de cada sessão.",
          "Consulte um Rumo aprovado e válido antes de assumir Manobra.",
          "Assuma o comando com claim_implementation_task e renove o lease com atividade explícita.",
          "Registre Maré contrária numa Conversa de bordo.",
          "Reporte o resultado; aceite humano é separado.",
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
      inputSchema: z.object({ pack_id: z.string().uuid() }),
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
        pack_id: z.string().uuid().optional(),
        task_id: z.string().uuid().optional(),
        repository_id: z.string().uuid().optional(),
        mode: z.enum(["brief", "full"]).default("brief"),
      }),
    },
    async ({ pack_id, task_id, repository_id, mode }) => {
      const store = requireWorkspace();
      const task = task_id ? await getImplementationTask(task_id, store.workspaceId) : null;
      const packId = pack_id ?? task?.packId;
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
      }),
    },
    async ({ project_id, title, objective }) => {
      if (!project_id) return errorResult("project_id é obrigatório.");
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const action = validateAgentAction({ mode: ready.identity.workMode, action: "propose_context_pack" });
      if (!action.ok) return errorResult(action.error);
      const project = await getProject(project_id, ready.store.workspaceId);
      if (!project) return errorResult("Expedição não encontrada.");
      const pack = await createContextPack({
        workspaceId: ready.store.workspaceId,
        projectId: project_id,
        title,
        objective,
        ownerUserId: ready.store.userId,
      });
      await audit("propose_context_pack", "context_pack", pack.id);
      return textResult({ packId: pack.id, revisionId: null, status: pack.status });
    },
  );

  server.registerTool(
    "list_available_implementation_tasks",
    {
      title: "Listar Manobras disponíveis",
      description: "Manobras compatíveis com o modo do Agente de Bordo e a Embarcação da sessão.",
      inputSchema: z.object({
        pack_id: z.string().uuid().optional(),
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
      if (pack_id) tasks = tasks.filter((task) => task.packId === pack_id);
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
      description: "Lease atômico. Um único comando ativo. RN-103, RN-105.",
      inputSchema: z.object({
        task_id: z.string().uuid(),
        repository_id: z.string().uuid().optional(),
        accept_revision_id: z.string().uuid().optional(),
      }),
    },
    async ({ task_id, repository_id, accept_revision_id }) => {
      const ready = await requireIdentity();
      if (!ready.ok) return errorResult(ready.error);
      const task = await getImplementationTask(task_id, ready.store.workspaceId);
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
      inputSchema: z.object({ task_id: z.string().uuid() }),
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
      inputSchema: z.object({ task_id: z.string().uuid() }),
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
        task_id: z.string().uuid(),
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
        task_id: z.string().uuid(),
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
        note: "Registrada — o aceite humano é separado.",
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
      const threads = await listCoordinationThreads(store.workspaceId, {
        subjectType: subject_type,
        subjectId: subject_id,
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
        thread_id: z.string().uuid().optional(),
        subject_type: z.enum(["pack", "task", "item", "criterion"]).optional(),
        subject_id: z.string().optional(),
        body: z.string().trim().min(1).max(2_000),
        is_blocker: z.boolean().optional(),
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
          threadId: args.thread_id,
          workspaceId: ready.store.workspaceId,
          userId: ready.store.userId,
          agentIdentityId: ready.identity.id,
          body: args.body,
        });
        if (!message) return errorResult("Conversa de bordo não encontrada neste porto.");
        return textResult({ message });
      }
      if (!args.subject_type || !args.subject_id) return errorResult("Informe thread_id ou subject_type + subject_id.");
      const created = await createCoordinationThread({
        workspaceId: ready.store.workspaceId,
        subjectType: args.subject_type,
        subjectId: args.subject_id,
        isBlocker: args.is_blocker,
        createdBy: ready.store.userId,
        body: args.body,
        agentIdentityId: ready.identity.id,
      });
      if (args.is_blocker && args.subject_type === "task") {
        await setTaskStatus(args.subject_id, ready.store.workspaceId, "blocked");
      }
      await audit("create_coordination_message", args.subject_type, args.subject_id);
      return textResult(created);
    },
  );

  server.registerTool(
    "resolve_coordination_thread",
    {
      title: "Resolver Conversa de bordo",
      description: "Marca o fio como resolvido ou reabre.",
      inputSchema: z.object({
        thread_id: z.string().uuid(),
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
