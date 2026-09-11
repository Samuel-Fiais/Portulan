"use client";

import "./comment-thread.css";

import { CheckCircle2, LoaderCircle, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  commentPersonLabel,
  useDocumentComments,
} from "@/components/document-comments-context";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isThreadResolved, type CommentThread } from "@/lib/comment-threads";
import type { DocumentCommentRecord } from "@/lib/documents";
import { cn, formatRelativeDate } from "@/lib/utils";

export function CommentQuote({ text }: { text: string }) {
  return <blockquote className="comment-quote">{text}</blockquote>;
}

export function CommentComposeForm({
  id,
  placeholder,
  submitLabel,
  quotedText,
  disabled,
  compact = false,
  onSubmit,
}: {
  id: string;
  placeholder: string;
  submitLabel: string;
  quotedText?: string | null;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (body: string) => Promise<boolean>;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className={cn("review-compose", compact && "review-compose-compact")}
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
          const ok = await onSubmit(body);
          if (ok) setBody("");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {quotedText ? <CommentQuote text={quotedText} /> : null}
      <label className="sr-only" htmlFor={id}>{placeholder}</label>
      <Textarea
        id={id}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={2_000}
        disabled={disabled || submitting}
      />
      <Button type="submit" disabled={disabled || submitting || !body.trim()}>
        {submitting ? <LoaderCircle className="animate-spin" /> : <MessageSquare />}
        {submitLabel}
      </Button>
    </form>
  );
}

export function CommentMessage({
  comment,
  currentUserId,
  deletingId,
  onRemove,
}: {
  comment: DocumentCommentRecord;
  currentUserId: string;
  deletingId: string | null;
  onRemove: (commentId: string) => void;
}) {
  return (
    <article className={cn("review-comment-item", deletingId === comment.id && "opacity-50")}>
      <div className="review-comment-header">
        <UserAvatar
          name={comment.userName}
          login={comment.userLogin}
          imageUrl={comment.userAvatarUrl}
          size="md"
          className="review-comment-avatar"
          title={commentPersonLabel(comment)}
        />
        <div className="review-comment-meta">
          <strong>{commentPersonLabel(comment)}</strong>
          <span>{formatRelativeDate(comment.createdAt)}</span>
        </div>
        {comment.userId === currentUserId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="review-comment-delete"
            aria-label="Remover comentário"
            disabled={deletingId === comment.id}
            onClick={() => onRemove(comment.id)}
          >
            {deletingId === comment.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
          </Button>
        ) : null}
      </div>
      <p className="review-comment-body">{comment.body}</p>
    </article>
  );
}

export function CommentThreadCard({
  thread,
  replyId,
  onOpenPreview,
  hideSectionLabel = false,
}: {
  thread: CommentThread;
  replyId: string;
  onOpenPreview?: () => void;
  hideSectionLabel?: boolean;
}) {
  const comments = useDocumentComments();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const resolved = isThreadResolved(thread);
  const label = comments.targetLabel(thread.root.sectionAnchor) ?? "Documento";

  async function remove(commentId: string) {
    setDeletingId(commentId);
    try {
      await comments.removeComment(commentId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn("comment-thread-card", resolved && "comment-thread-card-resolved")}>
      <div className="comment-thread-head">
        {!hideSectionLabel && !thread.root.quotedText ? (
          <span className="review-comment-section">{label}</span>
        ) : null}
        <div className="comment-thread-actions">
          {resolved ? <span className="comment-thread-status">Resolvido</span> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resolving}
            onClick={async () => {
              setResolving(true);
              try {
                await comments.setThreadResolved(thread.root.id, !resolved);
              } finally {
                setResolving(false);
              }
            }}
          >
            {resolving ? <LoaderCircle className="animate-spin" /> : resolved ? <RotateCcw /> : <CheckCircle2 />}
            {resolved ? "Reabrir" : "Resolver"}
          </Button>
          {onOpenPreview ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenPreview}>
              <MessageSquare />
              Ver na prévia
            </Button>
          ) : null}
        </div>
      </div>
      {thread.root.quotedText ? <CommentQuote text={thread.root.quotedText} /> : null}
      <div className="comment-thread-messages">
        <CommentMessage
          comment={thread.root}
          currentUserId={comments.currentUserId}
          deletingId={deletingId}
          onRemove={(commentId) => void remove(commentId)}
        />
        {thread.replies.length ? (
          <ol className="comment-thread-replies">
            {thread.replies.map((reply) => (
              <li key={reply.id}>
                <CommentMessage
                  comment={reply}
                  currentUserId={comments.currentUserId}
                  deletingId={deletingId}
                  onRemove={(commentId) => void remove(commentId)}
                />
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      <CommentComposeForm
        id={replyId}
        compact
        placeholder="Responder…"
        submitLabel="Responder"
        onSubmit={(body) => comments.submitReply(thread.root.id, body)}
      />
    </div>
  );
}
