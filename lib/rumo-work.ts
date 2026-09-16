import type { ImplementationTaskStatus } from "@/lib/dev-context";
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";

export type WorkTask = {
  id: string;
  parentTaskId: string | null;
  status: ImplementationTaskStatus;
  boardNumber?: number;
  sortOrder?: number;
  createdAt?: string;
};

/** Ordem estável de cartões: sortOrder → boardNumber → createdAt → id. */
export function compareWorkTasks(a: WorkTask, b: WorkTask): number {
  const sortA = a.sortOrder ?? 0;
  const sortB = b.sortOrder ?? 0;
  if (sortA !== sortB) return sortA - sortB;

  const boardA = a.boardNumber ?? 0;
  const boardB = b.boardNumber ?? 0;
  if (boardA !== boardB) return boardA - boardB;

  if (a.createdAt && b.createdAt) {
    const byCreated = a.createdAt.localeCompare(b.createdAt);
    if (byCreated !== 0) return byCreated;
  }

  return a.id.localeCompare(b.id);
}

export function sortWorkTasks<T extends WorkTask>(tasks: readonly T[]): T[] {
  return [...tasks].sort(compareWorkTasks);
}

export type WorkItem = {
  id: string;
  type: string;
  body: string;
  blocking: boolean;
};

export type ManobraTree<T extends WorkTask = WorkTask> = {
  parent: T;
  children: T[];
};

export function groupManobras<T extends WorkTask>(tasks: T[]): ManobraTree<T>[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map<string, T[]>();
  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const list = children.get(task.parentTaskId) ?? [];
    list.push(task);
    children.set(task.parentTaskId, list);
  }
  for (const [parentId, list] of children) {
    children.set(parentId, sortWorkTasks(list));
  }
  const roots = sortWorkTasks(
    tasks.filter((task) => !task.parentTaskId || !byId.has(task.parentTaskId)),
  );
  return roots.map((parent) => ({
    parent,
    children: children.get(parent.id) ?? [],
  }));
}

export const KANBAN_COLUMNS = [
  { id: "available", label: "To do", statuses: ["available"] as const },
  { id: "active", label: "In progress", statuses: ["claimed", "in_progress"] as const },
  { id: "blocked", label: "Blocked", statuses: ["blocked"] as const },
  { id: "reported", label: "Done", statuses: ["reported"] as const },
  { id: "accepted", label: "Accepted", statuses: ["accepted"] as const },
] as const;

export type KanbanColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

export function taskColumnId(status: ImplementationTaskStatus): KanbanColumnId {
  if (status === "claimed" || status === "in_progress") return "active";
  if (status === "blocked") return "blocked";
  if (status === "reported") return "reported";
  if (status === "accepted") return "accepted";
  return "available";
}

export function cardsForColumn<T extends WorkTask>(tree: ManobraTree<T>, columnId: KanbanColumnId): T[] {
  if (tree.children.length === 0) {
    return taskColumnId(tree.parent.status) === columnId ? [tree.parent] : [];
  }
  return tree.children.filter((child) => taskColumnId(child.status) === columnId);
}

/** Cartões de Manobra no Kanban: só raízes, independente de ter Lances. */
export function kanbanManobras<T extends WorkTask>(trees: ManobraTree<T>[]): T[] {
  return trees.map((tree) => tree.parent);
}

/** Cartões de Lance no Kanban: todos os filhos, achatados. */
export function kanbanLances<T extends WorkTask>(trees: ManobraTree<T>[]): T[] {
  return trees.flatMap((tree) => tree.children);
}

export type LanceKanbanLane<T extends WorkTask = WorkTask> = {
  parent: T;
  lances: T[];
};

/** Faixas do quadro de Lances: uma Manobra-pai por linha, só se tiver filhos. */
export function kanbanLanceLanes<T extends WorkTask>(trees: ManobraTree<T>[]): LanceKanbanLane<T>[] {
  return trees
    .filter((tree) => tree.children.length > 0)
    .map((tree) => ({ parent: tree.parent, lances: tree.children }));
}

export function lancesInColumn<T extends WorkTask>(lances: T[], columnId: KanbanColumnId): T[] {
  return lances.filter((lance) => taskColumnId(lance.status) === columnId);
}

/** Total de cartões de Lance numa coluna (para contagem no cabeçalho). */
export function kanbanLanceCountForColumn<T extends WorkTask>(
  trees: ManobraTree<T>[],
  columnId: KanbanColumnId,
): number {
  return trees.reduce(
    (sum, tree) => sum + lancesInColumn(tree.children, columnId).length,
    0,
  );
}

const LANCE_DONE_STATUSES = new Set<ImplementationTaskStatus>(["reported", "accepted"]);

/** Lance concluído para progresso e checklist do cartão de Manobra. */
export function lanceIsComplete(status: ImplementationTaskStatus): boolean {
  return LANCE_DONE_STATUSES.has(status);
}

export function lanceProgress<T extends WorkTask>(children: T[]): { done: number; total: number } {
  return {
    done: children.filter((child) => lanceIsComplete(child.status)).length,
    total: children.length,
  };
}

export function manobraTreeById<T extends WorkTask>(
  trees: ManobraTree<T>[],
  taskId: string,
): ManobraTree<T> | undefined {
  return trees.find((tree) => tree.parent.id === taskId);
}

export function blockingQuestions<T extends WorkItem>(items: T[]) {
  return items.filter((item) => item.type === "question" && item.blocking && item.body.trim());
}

export function itemsMatchingType<T extends WorkItem>(items: T[], type: string | "all") {
  const visible = items.filter((item) => item.body.trim());
  if (type === "all") return visible;
  return visible.filter((item) => item.type === type);
}

export function acceptedCount(tasks: WorkTask[]) {
  const roots = tasks.filter((task) => !task.parentTaskId);
  if (roots.length === 0) return { accepted: 0, total: 0 };
  return {
    accepted: roots.filter((task) => task.status === "accepted").length,
    total: roots.length,
  };
}

export function parseMentions(
  body: string,
  roster: WorkspaceRosterEntry[],
): { mentionedUserIds: string[]; mentionedAgentIdentityIds: string[] } {
  const mentionedUserIds: string[] = [];
  const mentionedAgentIdentityIds: string[] = [];
  const haystack = body.toLowerCase();
  for (const entry of roster) {
    if (entry.kind === "human") {
      const names = [entry.member.name, entry.member.login].filter(Boolean) as string[];
      if (names.some((name) => haystack.includes(`@${name.toLowerCase()}`))) {
        mentionedUserIds.push(entry.member.userId);
      }
    } else if (haystack.includes(`@${entry.agent.name.toLowerCase()}`)) {
      mentionedAgentIdentityIds.push(entry.agent.id);
    }
  }
  return { mentionedUserIds, mentionedAgentIdentityIds };
}
