import { auth } from "@/auth";
import { TaskDetail } from "@/components/task-detail";
import {
  getAgentIdentity,
  getContextPack,
  getImplementationTask,
  getRepository,
  getRevision,
  listAgentIdentities,
  listChildTasks,
  listCoordinationMessages,
  listCoordinationThreads,
  listDraftCriteria,
  listDocumentReleases,
  listDocuments,
  listDraftItems,
  listProgressReports,
  listTaskSources,
  listRevisionCriteria,
  listRevisionItems,
  listWorkspaceMembers,
} from "@/lib/db";
import { getUserById } from "@/lib/users";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { documentAccessContext } from "@/lib/access-context";
import { buildWorkspaceRoster } from "@/lib/workspace-roster";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManobraPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  const pack = await getContextPack(id, active.id);
  const task = await getImplementationTask(taskId, active.id);
  if (!pack || !task || task.packId !== pack.id) notFound();
  const revisionId = task.packRevisionId;
  const access = await documentAccessContext(userId);
  const [reports, threads, items, criteria, repository, revision, children, members, agents, parent, sources, documents] =
    await Promise.all([
      listProgressReports(task.id),
      listCoordinationThreads(active.id, { subjectType: "task", subjectId: task.id }),
      revisionId ? listRevisionItems(pack.id, revisionId) : listDraftItems(pack.id),
      revisionId ? listRevisionCriteria(pack.id, revisionId) : listDraftCriteria(pack.id),
      task.repositoryId ? getRepository(task.repositoryId, active.id) : Promise.resolve(null),
      revisionId ? getRevision(revisionId) : Promise.resolve(null),
      listChildTasks(task.id, active.id),
      listWorkspaceMembers(active.id),
      listAgentIdentities(active.id),
      task.parentTaskId ? getImplementationTask(task.parentTaskId, active.id) : Promise.resolve(null),
      listTaskSources(task.id),
      listDocuments(undefined, access),
    ]);
  const messagesByThread: Record<string, Awaited<ReturnType<typeof listCoordinationMessages>>> = {};
  for (const thread of threads) {
    messagesByThread[thread.id] = await listCoordinationMessages(thread.id, active.id);
  }
  const userIds = new Set<string>([
    ...reports.map((item) => item.userId),
    ...Object.values(messagesByThread).flatMap((messages) => messages.map((message) => message.userId)),
    ...(task.leaseHolderUserId ? [task.leaseHolderUserId] : []),
    ...(task.assigneeUserId ? [task.assigneeUserId] : []),
  ]);
  const userNames: Record<string, string> = {};
  for (const idValue of userIds) {
    const user = await getUserById(idValue);
    userNames[idValue] = user?.name?.trim() || user?.login || "Tripulante";
  }
  const agentIds = new Set(
    [
      ...reports.map((item) => item.agentIdentityId),
      ...Object.values(messagesByThread).flatMap((messages) => messages.map((message) => message.agentIdentityId)),
      task.leaseHolderIdentityId,
      task.assigneeAgentIdentityId,
    ].filter(Boolean) as string[],
  );
  const agentNames: Record<string, string> = {};
  for (const agentId of agentIds) {
    const identity = await getAgentIdentity(agentId, active.id);
    if (identity) agentNames[agentId] = identity.name;
  }
  const ownerIds = [...new Set(agents.map((agent) => agent.ownerUserId))];
  const ownerNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const owner = await getUserById(ownerId);
      ownerNames[ownerId] = owner?.name?.trim() || owner?.login || "Tripulante";
    }),
  );
  return (
    <TaskDetail
      packId={pack.id}
      packTitle={pack.title}
      packBoardNumber={pack.boardNumber}
      packStatus={pack.status}
      task={task}
      parent={parent}
      children={children}
      reports={reports}
      threads={threads}
      messagesByThread={messagesByThread}
      userNames={userNames}
      agentNames={agentNames}
      roster={buildWorkspaceRoster({ members, agents, ownerNames })}
      repositoryName={repository?.name ?? null}
      revisionNumber={revision?.revisionNumber ?? null}
      requiredItems={items.filter((item) => task.requiredItemIds.includes(item.id))}
      criteria={criteria.filter((criterion) => task.criterionIds.includes(criterion.id))}
      sources={sources}
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
    />
  );
}
