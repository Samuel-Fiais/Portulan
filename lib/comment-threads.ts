import type { DocumentCommentRecord } from "./documents.ts";

export type CommentThread = {
  root: DocumentCommentRecord;
  replies: DocumentCommentRecord[];
};

export function groupCommentThreads(comments: DocumentCommentRecord[]): CommentThread[] {
  const repliesByParent = new Map<string, DocumentCommentRecord[]>();

  for (const comment of comments) {
    if (!comment.parentId) continue;
    const replies = repliesByParent.get(comment.parentId) ?? [];
    replies.push(comment);
    repliesByParent.set(comment.parentId, replies);
  }

  return comments
    .filter((comment) => !comment.parentId)
    .map((root) => ({
      root,
      replies: repliesByParent.get(root.id) ?? [],
    }));
}

export function resolveThreadRootId(parent: Pick<DocumentCommentRecord, "id" | "parentId">) {
  return parent.parentId ?? parent.id;
}

export function threadCommentCount(thread: CommentThread) {
  return 1 + thread.replies.length;
}

export type CommentThreadFilter = "open" | "resolved" | "all";

export function isThreadResolved(thread: Pick<CommentThread, "root">) {
  return thread.root.resolvedAt != null;
}

export function filterCommentThreads(threads: CommentThread[], filter: CommentThreadFilter) {
  if (filter === "all") return threads;
  if (filter === "resolved") return threads.filter(isThreadResolved);
  return threads.filter((thread) => !isThreadResolved(thread));
}
