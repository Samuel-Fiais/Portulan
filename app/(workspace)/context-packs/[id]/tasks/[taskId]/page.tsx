import { auth } from "@/auth";
import { TaskDetail } from "@/components/task-detail";
import {
  getAgentIdentity,
  getContextPack,
  getImplementationTask,
  getRepository,
  getRevision,
  listCoordinationMessages,
  listCoordinationThreads,
  listDraftCriteria,
  listDraftItems,
  listProgressReports,
  listRevisionCriteria,
  listRevisionItems,
} from "@/lib/db";
import { getUserById } from "@/lib/users";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
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
  const [reports, threads, items, criteria, repository, revision] = await Promise.all([
    listProgressReports(task.id),
    listCoordinationThreads(active.id, { subjectType: "task", subjectId: task.id }),
    revisionId ? listRevisionItems(pack.id, revisionId) : listDraftItems(pack.id),
    revisionId ? listRevisionCriteria(pack.id, revisionId) : listDraftCriteria(pack.id),
    task.repositoryId ? getRepository(task.repositoryId, active.id) : Promise.resolve(null),
    revisionId ? getRevision(revisionId) : Promise.resolve(null),
  ]);
  const messagesByThread: Record<string, Awaited<ReturnType<typeof listCoordinationMessages>>> = {};
  for (const thread of threads) {
    messagesByThread[thread.id] = await listCoordinationMessages(thread.id, active.id);
  }
  const userIds = new Set<string>([
    ...reports.map((item) => item.userId),
    ...Object.values(messagesByThread).flatMap((messages) => messages.map((message) => message.userId)),
    ...(task.leaseHolderUserId ? [task.leaseHolderUserId] : []),
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
    ].filter(Boolean) as string[],
  );
  const agentNames: Record<string, string> = {};
  for (const agentId of agentIds) {
    const identity = await getAgentIdentity(agentId, active.id);
    if (identity) agentNames[agentId] = identity.name;
  }
  return (
    <TaskDetail
      packId={pack.id}
      packTitle={pack.title}
      task={task}
      reports={reports}
      threads={threads}
      messagesByThread={messagesByThread}
      userNames={userNames}
      agentNames={agentNames}
      repositoryName={repository?.name ?? null}
      revisionNumber={revision?.revisionNumber ?? null}
      requiredItems={items.filter((item) => task.requiredItemIds.includes(item.id) || item.strength === "required")}
      criteria={criteria.filter((criterion) => task.criterionIds.includes(criterion.id) || task.criterionIds.length === 0)}
    />
  );
}
