"use client";

import { MessageSquarePlus } from "lucide-react";
import type { ReactNode } from "react";
import {
  scrollToCommentTarget,
  useOptionalDocumentComments,
} from "@/components/document-comments-context";
import { threadCommentCount } from "@/lib/comment-threads";
import { cn } from "@/lib/utils";

export function CommentAnchor({
  targetId,
  className,
  children,
}: {
  targetId: string;
  className?: string;
  children: ReactNode;
}) {
  const comments = useOptionalDocumentComments();
  if (!comments) {
    return className ? <div className={className}>{children}</div> : children;
  }

  const threads = comments.threadsForAnchor(targetId);
  const count = threads.reduce((total, thread) => total + threadCommentCount(thread), 0);
  const composer = comments.composer;
  const active =
    ((composer.mode === "create" || composer.mode === "anchor") && composer.anchor === targetId)
    || (composer.mode === "thread" && threads.some((thread) => thread.root.id === composer.rootId));

  return (
    <div
      className={cn("comment-anchor", className)}
      data-comment-target={targetId}
      data-has-comments={count > 0 || undefined}
      data-comment-active={active || undefined}
    >
      <div className="comment-anchor-body">{children}</div>
      <button
        type="button"
        className="comment-anchor-btn no-print"
        aria-label={count ? `${count} ${count === 1 ? "comentário" : "comentários"} neste trecho` : "Comentar neste trecho"}
        onClick={() => {
          if (threads.length) {
            comments.openAnchor(targetId);
          } else {
            comments.openCreate({ anchor: targetId });
          }
          scrollToCommentTarget(targetId);
        }}
      >
        {count ? <span>{count}</span> : <MessageSquarePlus />}
      </button>
    </div>
  );
}
