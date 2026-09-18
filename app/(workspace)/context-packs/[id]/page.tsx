import { auth } from "@/auth";
import { ContextPackDetail } from "@/components/context-pack-detail";
import {
  getAgentIdentity,
  getContextPack,
  ensureDraftImplementationPlan,
  getDraftPlan,
  getProject,
  listAgentIdentities,
  listCoordinationMessages,
  listCoordinationThreads,
  listDocumentReleases,
  listDocuments,
  listDraftCriteria,
  listDraftItems,
  listDraftSources,
  listDraftTasks,
  listRepositories,
  listRevisionCriteria,
  listRevisionItems,
  listRevisionSources,
  listRevisionTasks,
  listRevisions,
  listWorkspaceMembers,
} from "@/lib/db";
import { getUserById } from "@/lib/users";
import { documentAccessContext } from "@/lib/access-context";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { buildWorkspaceRoster } from "@/lib/workspace-roster";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  const pack = await getContextPack(id, active.id);
  if (!pack) notFound();
  const revisionId = pack.currentRevisionId;
  const useRevision = pack.status === "approved" && revisionId;
  const canEditPack = pack.status === "draft" || pack.status === "review";
  const access = await documentAccessContext(userId);
  const [items, sources, criteria, tasks, allThreads, revisions, repositories, plan, project, documents, members, agents] =
    await Promise.all([
      useRevision ? listRevisionItems(pack.id, revisionId) : listDraftItems(pack.id),
      useRevision ? listRevisionSources(pack.id, revisionId) : listDraftSources(pack.id),
      useRevision ? listRevisionCriteria(pack.id, revisionId) : listDraftCriteria(pack.id),
      useRevision ? listRevisionTasks(pack.id, revisionId) : listDraftTasks(pack.id),
      listCoordinationThreads(active.id),
      listRevisions(pack.id),
      listRepositories(active.id),
      canEditPack
        ? ensureDraftImplementationPlan({ packId: pack.id, workspaceId: active.id })
        : getDraftPlan(pack.id),
      getProject(pack.projectId, active.id),
      listDocuments(undefined, access),
      listWorkspaceMembers(active.id),
      listAgentIdentities(active.id),
    ]);
  const subjectIds = new Set([pack.id, ...items.map((item) => item.id), ...criteria.map((item) => item.id), ...tasks.map((task) => task.id)]);
  const threads = allThreads.filter((thread) => subjectIds.has(thread.subjectId));
  const messagesByThread: Record<string, Awaited<ReturnType<typeof listCoordinationMessages>>> = {};
  await Promise.all(
    threads.map(async (thread) => {
      messagesByThread[thread.id] = await listCoordinationMessages(thread.id, active.id);
    }),
  );
  const userIds = new Set(
    Object.values(messagesByThread).flatMap((messages) => messages.map((message) => message.userId)),
  );
  const userNames: Record<string, string> = {};
  await Promise.all(
    [...userIds].map(async (idValue) => {
      const user = await getUserById(idValue);
      userNames[idValue] = user?.name?.trim() || user?.login || "Tripulante";
    }),
  );
  const agentIds = new Set(
    Object.values(messagesByThread)
      .flatMap((messages) => messages.map((message) => message.agentIdentityId))
      .filter(Boolean) as string[],
  );
  const agentNames: Record<string, string> = {};
  await Promise.all(
    [...agentIds].map(async (agentId) => {
      const identity = await getAgentIdentity(agentId, active.id);
      if (identity) agentNames[agentId] = identity.name;
    }),
  );
  const ownerIds = [...new Set(agents.map((agent) => agent.ownerUserId))];
  const ownerNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async (idValue) => {
      const owner = await getUserById(idValue);
      ownerNames[idValue] = owner?.name?.trim() || owner?.login || "Tripulante";
    }),
  );
  const roster = buildWorkspaceRoster({ members, agents, ownerNames });
  return (
    <ContextPackDetail
      pack={pack}
      projectName={project?.name ?? "Expedição"}
      items={items}
      sources={sources}
      criteria={criteria}
      tasks={tasks}
      threads={threads}
      messagesByThread={messagesByThread}
      userNames={userNames}
      agentNames={agentNames}
      revisions={revisions}
      repositories={repositories}
      documents={await Promise.all(
        documents.map(async (document) => ({
          id: document.id,
          title: document.title,
          slug: document.slug,
          releases: (await listDocumentReleases(document.id)).map((release) => ({
            id: release.id,
            version: release.version,
            publishedAt: release.publishedAt,
            disabled: release.disabled,
          })),
        })),
      )}
      planSummary={plan?.summary ?? ""}
      draftPlan={canEditPack && plan ? { id: plan.id, draftVersion: plan.draftVersion } : null}
      roster={roster}
    />
  );
}
