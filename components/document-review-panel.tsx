"use client";

import { LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  scrollToCommentTarget,
  useDocumentComments,
} from "@/components/document-comments-context";
import { CommentComposeForm, CommentThreadCard } from "@/components/comment-thread-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterCommentThreads, type CommentThreadFilter } from "@/lib/comment-threads";

export function DocumentReviewPanel() {
  const comments = useDocumentComments();
  const [filter, setFilter] = useState<CommentThreadFilter>("open");
  const visibleThreads = useMemo(
    () => filterCommentThreads(comments.threads, filter),
    [comments.threads, filter],
  );

  return (
    <div className="review-panel">
      <div className="review-panel-heading split-row">
        <div className="split-row__main">
          <span>Revisão</span>
          <p>Comente na prévia ou aqui. Os fios ficam visíveis para quem tem acesso à carta, não em links públicos (/d ou /p).</p>
        </div>
        <div className="review-panel-meta">
          <label className="review-thread-filter">
            <span>Fios</span>
            <Select value={filter} onValueChange={(value) => setFilter(value as CommentThreadFilter)}>
              <SelectTrigger aria-label="Filtrar fios">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <strong>{visibleThreads.length} {visibleThreads.length === 1 ? "fio" : "fios"}</strong>
        </div>
      </div>

      <CommentComposeForm
        id="review-comment-body"
        placeholder="Comentário geral sobre o rascunho…"
        submitLabel="Enviar comentário"
        onSubmit={(body) => comments.submitRoot(body, { anchor: null, quotedText: "" })}
      />

      <div className="review-thread">
        {comments.loading ? (
          <div className="review-thread-empty">
            <LoaderCircle className="animate-spin" />
            Carregando comentários…
          </div>
        ) : visibleThreads.length ? (
          <ol className="review-comment-list">
            {visibleThreads.map((thread) => {
              const active = (comments.composer.mode === "thread" && comments.composer.rootId === thread.root.id)
                || (comments.composer.mode === "anchor" && comments.composer.anchor === thread.root.sectionAnchor);
              return (
                <li key={thread.root.id} className={active ? "review-thread-active" : undefined}>
                  <CommentThreadCard
                    thread={thread}
                    replyId={`review-reply-${thread.root.id}`}
                    onOpenPreview={() => {
                      if (thread.root.sectionAnchor) {
                        comments.openAnchor(thread.root.sectionAnchor);
                      } else {
                        comments.openThread(thread.root.id);
                      }
                      scrollToCommentTarget(thread.root.sectionAnchor);
                    }}
                  />
                </li>
              );
            })}
          </ol>
        ) : comments.threads.length ? (
          <div className="review-thread-empty">
            Nenhum fio {filter === "open" ? "aberto" : filter === "resolved" ? "resolvido" : ""} neste filtro.
          </div>
        ) : (
          <div className="review-thread-empty">
            Nenhum comentário ainda. Selecione um trecho na prévia ou escreva um comentário geral acima.
          </div>
        )}
      </div>
    </div>
  );
}
