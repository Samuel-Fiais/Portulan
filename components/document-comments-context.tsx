"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  addDocumentCommentAction,
  deleteDocumentCommentAction,
  listDocumentCommentsAction,
  setDocumentCommentResolvedAction,
} from "@/app/actions";
import { commentTargetLabel } from "@/lib/comment-targets";
import { groupCommentThreads, type CommentThread } from "@/lib/comment-threads";
import type { DocumentCommentRecord } from "@/lib/documents";

export type CommentComposer =
  | { mode: "closed" }
  | { mode: "create"; anchor: string | null; quotedText: string }
  | { mode: "anchor"; anchor: string }
  | { mode: "thread"; rootId: string };

type DocumentCommentsContextValue = {
  documentId: string;
  currentUserId: string;
  content: string;
  comments: DocumentCommentRecord[];
  threads: CommentThread[];
  loading: boolean;
  composer: CommentComposer;
  targetLabel: (anchor: string | null | undefined) => string | null;
  threadsForAnchor: (anchor: string) => CommentThread[];
  openCreate: (input?: { anchor?: string | null; quotedText?: string }) => void;
  openAnchor: (anchor: string) => void;
  openThread: (rootId: string) => void;
  closeComposer: () => void;
  submitRoot: (body: string, input?: { anchor?: string | null; quotedText?: string }) => Promise<boolean>;
  submitReply: (rootId: string, body: string) => Promise<boolean>;
  removeComment: (commentId: string) => Promise<boolean>;
  setThreadResolved: (rootId: string, resolved: boolean) => Promise<boolean>;
};

const DocumentCommentsContext = createContext<DocumentCommentsContextValue | null>(null);

export function useOptionalDocumentComments() {
  return useContext(DocumentCommentsContext);
}

export function useDocumentComments() {
  const context = useContext(DocumentCommentsContext);
  if (!context) {
    throw new Error("useDocumentComments precisa do provedor de comentários.");
  }
  return context;
}

export function DocumentCommentsBoundary({
  documentId,
  currentUserId,
  content,
  children,
}: {
  documentId: string;
  currentUserId?: string | null;
  content: string;
  children: ReactNode;
}) {
  if (!currentUserId) return children;
  return (
    <DocumentCommentsProvider documentId={documentId} currentUserId={currentUserId} content={content}>
      {children}
    </DocumentCommentsProvider>
  );
}

function DocumentCommentsProvider({
  documentId,
  currentUserId,
  content,
  children,
}: {
  documentId: string;
  currentUserId: string;
  content: string;
  children: ReactNode;
}) {
  const [comments, setComments] = useState<DocumentCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState<CommentComposer>({ mode: "closed" });

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listDocumentCommentsAction(documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setComments(result.comments);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const threads = useMemo(() => groupCommentThreads(comments), [comments]);

  const targetLabel = useCallback(
    (anchor: string | null | undefined) => commentTargetLabel(content, anchor),
    [content],
  );

  const threadsForAnchor = useCallback(
    (anchor: string) => threads.filter((thread) => thread.root.sectionAnchor === anchor),
    [threads],
  );

  const openCreate = useCallback((input?: { anchor?: string | null; quotedText?: string }) => {
    setComposer({
      mode: "create",
      anchor: input?.anchor ?? null,
      quotedText: input?.quotedText?.trim() ?? "",
    });
  }, []);

  const openAnchor = useCallback((anchor: string) => {
    setComposer({ mode: "anchor", anchor });
  }, []);

  const openThread = useCallback((rootId: string) => {
    setComposer({ mode: "thread", rootId });
  }, []);

  const closeComposer = useCallback(() => {
    setComposer({ mode: "closed" });
  }, []);

  const submitRoot = useCallback(async (body: string, input?: { anchor?: string | null; quotedText?: string }) => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Escreva um comentário antes de enviar.");
      return false;
    }
    const anchor = input?.anchor !== undefined
      ? input.anchor
      : composer.mode === "create" || composer.mode === "anchor" ? composer.anchor : null;
    const quotedText = input?.quotedText !== undefined
      ? input.quotedText
      : composer.mode === "create" ? composer.quotedText : "";
    const result = await addDocumentCommentAction(documentId, {
      body: trimmed,
      sectionAnchor: anchor,
      quotedText: quotedText || null,
    });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setComments((current) => [...current, result.comment]);
    const nextAnchor = result.comment.sectionAnchor;
    const siblingCount = nextAnchor
      ? threads.filter((thread) => thread.root.sectionAnchor === nextAnchor).length + 1
      : 1;
    if ((composer.mode === "anchor" && composer.anchor === nextAnchor) || (nextAnchor && siblingCount > 1)) {
      setComposer({ mode: "anchor", anchor: nextAnchor });
    } else {
      setComposer({ mode: "thread", rootId: result.comment.id });
    }
    toast.success("Comentário adicionado.");
    return true;
  }, [composer, documentId, threads]);

  const submitReply = useCallback(async (rootId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Escreva uma resposta antes de enviar.");
      return false;
    }
    const result = await addDocumentCommentAction(documentId, {
      body: trimmed,
      parentId: rootId,
    });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setComments((current) => [...current, result.comment]);
    toast.success("Resposta adicionada.");
    return true;
  }, [documentId]);

  const setThreadResolved = useCallback(async (rootId: string, resolved: boolean) => {
    const result = await setDocumentCommentResolvedAction(documentId, rootId, { resolved });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setComments((current) => current.map((comment) => (
      comment.id === rootId ? result.comment : comment
    )));
    toast.success(resolved ? "Fio resolvido." : "Fio reaberto.");
    return true;
  }, [documentId]);

  const removeComment = useCallback(async (commentId: string) => {
    const result = await deleteDocumentCommentAction(documentId, commentId);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    const removed = comments.find((comment) => comment.id === commentId);
    setComments((current) => current.filter((comment) => {
      if (comment.id === commentId) return false;
      if (removed && !removed.parentId && comment.parentId === commentId) return false;
      return true;
    }));
    if (composer.mode === "thread" && (composer.rootId === commentId || (removed && !removed.parentId && composer.rootId === commentId))) {
      setComposer({ mode: "closed" });
    }
    if (composer.mode === "anchor" && removed && !removed.parentId && removed.sectionAnchor === composer.anchor) {
      const remaining = comments.filter((comment) => (
        comment.id !== commentId
        && !comment.parentId
        && comment.sectionAnchor === composer.anchor
      ));
      if (!remaining.length) setComposer({ mode: "closed" });
    }
    toast.success("Comentário removido.");
    return true;
  }, [comments, composer, documentId]);

  const value = useMemo<DocumentCommentsContextValue>(() => ({
    documentId,
    currentUserId,
    content,
    comments,
    threads,
    loading,
    composer,
    targetLabel,
    threadsForAnchor,
    openCreate,
    openAnchor,
    openThread,
    closeComposer,
    submitRoot,
    submitReply,
    removeComment,
    setThreadResolved,
  }), [
    comments,
    composer,
    content,
    currentUserId,
    documentId,
    loading,
    openCreate,
    openAnchor,
    openThread,
    closeComposer,
    removeComment,
    setThreadResolved,
    submitReply,
    submitRoot,
    targetLabel,
    threads,
    threadsForAnchor,
  ]);

  return (
    <DocumentCommentsContext.Provider value={value}>
      {children}
    </DocumentCommentsContext.Provider>
  );
}

export function scrollToCommentTarget(anchor: string | null | undefined) {
  if (!anchor || typeof document === "undefined") return;
  const node = document.querySelector(`[data-comment-target="${CSS.escape(anchor)}"]`);
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function commentPersonLabel(comment: Pick<DocumentCommentRecord, "userName" | "userLogin">) {
  return comment.userName ?? comment.userLogin ?? "Colaborador";
}
