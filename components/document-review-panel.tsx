"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addDocumentCommentAction,
  deleteDocumentCommentAction,
  listDocumentCommentsAction,
} from "@/app/actions";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentCommentRecord } from "@/lib/documents";
import { extractSectionHeadings } from "@/lib/markdown-toc";
import { cn, formatRelativeDate } from "@/lib/utils";

function personLabel(comment: Pick<DocumentCommentRecord, "userName" | "userLogin">) {
  return comment.userName ?? comment.userLogin ?? "Colaborador";
}

export function DocumentReviewPanel({
  documentId,
  content,
  currentUserId,
}: {
  documentId: string;
  content: string;
  currentUserId: string;
}) {
  const [comments, setComments] = useState<DocumentCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sectionAnchor, setSectionAnchor] = useState<string>("none");

  const sections = useMemo(() => extractSectionHeadings(content), [content]);
  const sectionTitleById = useMemo(
    () => new Map(sections.map((section) => [section.id, section.title])),
    [sections],
  );

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

  async function submitComment() {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Escreva um comentário antes de enviar.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await addDocumentCommentAction(documentId, {
        body: trimmed,
        sectionAnchor: sectionAnchor === "none" ? null : sectionAnchor,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setComments((current) => [...current, result.comment]);
      setBody("");
      setSectionAnchor("none");
      toast.success("Comentário adicionado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeComment(commentId: string) {
    setDeletingId(commentId);
    try {
      const result = await deleteDocumentCommentAction(documentId, commentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      toast.success("Comentário removido.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="review-panel">
      <div className="review-panel-heading split-row">
        <div className="split-row__main">
          <span>Revisão</span>
          <p>Comentários visíveis para quem tem acesso ao documento. Não aparecem em links públicos (/d ou /p).</p>
        </div>
        <strong>{comments.length} {comments.length === 1 ? "comentário" : "comentários"}</strong>
      </div>

      <form
        className="review-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void submitComment();
        }}
      >
        <Label htmlFor="review-comment-body">Novo comentário</Label>
        <Textarea
          id="review-comment-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Deixe um feedback sobre o rascunho…"
          rows={4}
          maxLength={2_000}
        />
        {sections.length ? (
          <div className="review-section-picker">
            <Label htmlFor="review-section-anchor">Seção (opcional)</Label>
            <Select value={sectionAnchor} onValueChange={setSectionAnchor}>
              <SelectTrigger id="review-section-anchor">
                <SelectValue placeholder="Documento inteiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Documento inteiro</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button type="submit" disabled={submitting || !body.trim()}>
          {submitting ? <LoaderCircle className="animate-spin" /> : <MessageSquare />}
          Enviar comentário
        </Button>
      </form>

      <div className="review-thread">
        {loading ? (
          <div className="review-thread-empty">
            <LoaderCircle className="animate-spin" />
            Carregando comentários…
          </div>
        ) : comments.length ? (
          <ol className="review-comment-list">
            {comments.map((comment) => {
              const sectionTitle = comment.sectionAnchor
                ? sectionTitleById.get(comment.sectionAnchor) ?? comment.sectionAnchor
                : null;

              return (
                <li key={comment.id} className="review-comment-item">
                  <div className="review-comment-header">
                    <UserAvatar
                      name={comment.userName}
                      login={comment.userLogin}
                      imageUrl={comment.userAvatarUrl}
                      size="md"
                      className="review-comment-avatar"
                      title={personLabel(comment)}
                    />
                    <div className="review-comment-meta">
                      <strong>{personLabel(comment)}</strong>
                      <span>{formatRelativeDate(comment.createdAt)}</span>
                      {sectionTitle ? (
                        <span className="review-comment-section">§ {sectionTitle}</span>
                      ) : null}
                    </div>
                    {comment.userId === currentUserId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="review-comment-delete"
                        aria-label="Remover comentário"
                        disabled={deletingId === comment.id}
                        onClick={() => void removeComment(comment.id)}
                      >
                        {deletingId === comment.id ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
                    ) : null}
                  </div>
                  <p className={cn("review-comment-body", deletingId === comment.id && "opacity-50")}>
                    {comment.body}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="review-thread-empty">
            Nenhum comentário ainda. Use este painel para alinhar feedback durante a revisão.
          </div>
        )}
      </div>
    </div>
  );
}
