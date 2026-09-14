"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import {
  scrollToCommentTarget,
  useDocumentComments,
  useOptionalDocumentComments,
} from "@/components/document-comments-context";
import { CommentComposeForm, CommentThreadCard } from "@/components/comment-thread-card";
import { Button } from "@/components/ui/button";

function selectionQuoteWithin(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (!text) return null;
  const node = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
  const target = node?.closest("[data-comment-target]");
  return {
    text: text.slice(0, 280),
    targetId: target?.getAttribute("data-comment-target") ?? null,
  };
}

export function PreviewCommentsHost({ children }: { children: ReactNode }) {
  const comments = useOptionalDocumentComments();
  const rootRef = useRef<HTMLDivElement>(null);
  const [chip, setChip] = useState<{ x: number; y: number; quotedText: string; anchor: string | null } | null>(null);

  useEffect(() => {
    if (!chip) return;
    const hide = () => setChip(null);
    const root = rootRef.current;
    root?.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      root?.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [chip]);

  if (!comments) {
    return <div className="preview-scroll">{children}</div>;
  }

  return (
    <div
      ref={rootRef}
      className="preview-scroll preview-comments-host"
      onMouseUp={() => {
        const root = rootRef.current;
        if (!root) return;
        const quote = selectionQuoteWithin(root);
        if (!quote) {
          setChip(null);
          return;
        }
        const range = window.getSelection()?.getRangeAt(0);
        if (!range) return;
        const rect = range.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        setChip({
          x: rect.left + rect.width / 2 - rootRect.left + root.scrollLeft,
          y: rect.top - rootRect.top + root.scrollTop,
          quotedText: quote.text,
          anchor: quote.targetId,
        });
      }}
    >
      {children}
      {chip ? (
        <button
          type="button"
          className="preview-comment-chip no-print"
          style={{ left: chip.x, top: chip.y }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            comments.openCreate({ anchor: chip.anchor, quotedText: chip.quotedText });
            if (chip.anchor) scrollToCommentTarget(chip.anchor);
            setChip(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          <MessageSquarePlus />
          Comentar
        </button>
      ) : null}
    </div>
  );
}

export function PreviewCommentRail() {
  const comments = useDocumentComments();
  const { composer } = comments;

  if (composer.mode === "closed") return null;

  const thread = composer.mode === "thread"
    ? comments.threads.find((item) => item.root.id === composer.rootId)
    : null;
  const anchorThreads = composer.mode === "anchor"
    ? comments.threadsForAnchor(composer.anchor)
    : composer.mode === "thread" && thread?.root.sectionAnchor
      ? comments.threadsForAnchor(thread.root.sectionAnchor)
      : [];
  const listedThreads = composer.mode === "anchor"
    ? anchorThreads
    : thread
      ? (anchorThreads.length > 1 ? anchorThreads : [thread])
      : [];
  const createLabel = composer.mode === "create" ? comments.targetLabel(composer.anchor) : null;
  const listLabel = composer.mode === "anchor"
    ? comments.targetLabel(composer.anchor)
    : thread
      ? comments.targetLabel(thread.root.sectionAnchor)
      : null;
  const heading = composer.mode === "create"
    ? "Novo comentário"
    : listedThreads.length > 1
      ? `${listedThreads.length} fios`
      : "Fio";

  return (
    <aside className="preview-comment-rail no-print">
      <div className="preview-comment-rail-head">
        <strong>{heading}</strong>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Fechar comentários" onClick={comments.closeComposer}>
          <X />
        </Button>
      </div>
      {composer.mode === "create" ? (
        <div className="preview-comment-rail-body">
          {createLabel ? <span className="review-comment-section">§ {createLabel}</span> : <p>Comentário na carta inteira.</p>}
          <CommentComposeForm
            id="preview-comment-create"
            placeholder="Escreva o comentário…"
            submitLabel="Comentar"
            quotedText={composer.quotedText || null}
            onSubmit={(body) => comments.submitRoot(body)}
          />
        </div>
      ) : listedThreads.length ? (
        <div className="preview-comment-rail-body">
          {listLabel ? <span className="review-comment-section">§ {listLabel}</span> : null}
          {listedThreads.map((item) => (
            <CommentThreadCard
              key={item.root.id}
              thread={item}
              replyId={`preview-comment-reply-${item.root.id}`}
              hideSectionLabel
            />
          ))}
          {composer.mode === "anchor" ? (
            <CommentComposeForm
              id="preview-comment-create-on-block"
              compact
              placeholder="Novo comentário neste bloco…"
              submitLabel="Comentar"
              onSubmit={(body) => comments.submitRoot(body)}
            />
          ) : null}
        </div>
      ) : (
        <p className="preview-comment-rail-body">Este fio não está mais disponível.</p>
      )}
    </aside>
  );
}
