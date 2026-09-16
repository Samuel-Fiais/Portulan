"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCoordinationMessageAction, resolveCoordinationThreadAction } from "@/app/dev-context-actions";
import { BoardId } from "@/components/board-id";
import { CoordinationKindStamps } from "@/components/coordination-kind-stamps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { actorDisplayName } from "@/lib/audit-policy";
import { COORDINATION_MESSAGE_MAX } from "@/lib/dev-context";
import { parseMentions } from "@/lib/rumo-work";
import type { CoordinationMessageRecord, CoordinationThreadRecord } from "@/lib/db/coordination";
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";

function stampTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BordoFeed({
  subjectType,
  subjectId,
  threads,
  messagesByThread,
  userNames,
  agentNames,
  roster = [],
  emptyLabel,
}: {
  subjectType: "pack" | "task" | "item" | "criterion";
  subjectId: string;
  threads: CoordinationThreadRecord[];
  messagesByThread: Record<string, CoordinationMessageRecord[]>;
  userNames: Record<string, string>;
  agentNames: Record<string, string>;
  roster?: WorkspaceRosterEntry[];
  emptyLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [isBlocker, setIsBlocker] = useState(false);
  const entries = threads
    .flatMap((thread) =>
      (messagesByThread[thread.id] ?? [])
        .filter((message) => message.body.trim())
        .map((message) => ({ thread, message })),
    )
    .sort((a, b) => a.message.createdAt.localeCompare(b.message.createdAt));

  return (
    <div className="bordo-feed">
      {entries.length === 0 ? (
        <p className="dev-empty">{emptyLabel}</p>
      ) : (
        <ol className="rumo-message-list bordo-feed__list">
          {entries.map(({ thread, message }) => (
            <li
              key={message.id}
              id={`conversa-${thread.id}`}
              className={`rumo-message${thread.isBlocker ? " rumo-message--blocker" : ""}`}
            >
              <div className="rumo-message__meta">
                <BoardId number={message.boardNumber} />
                <span>
                  {actorDisplayName({
                    userName: userNames[message.userId] ?? "Tripulante",
                    agentName: message.agentIdentityId ? agentNames[message.agentIdentityId] : null,
                  })}
                </span>
                <time dateTime={message.createdAt}>{stampTime(message.createdAt)}</time>
                {thread.isBlocker ? <span>Maré contrária</span> : null}
                {thread.resolvedAt ? <span>Resolvida</span> : null}
              </div>
              <p className="rumo-message__body">{message.body}</p>
              {thread.isBlocker && !thread.resolvedAt ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = await resolveCoordinationThreadAction(thread.id, true);
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success("Maré resolvida");
                        router.refresh();
                      }
                    })
                  }
                >
                  Resolver maré
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <form
        className={`rumo-open-composer${isBlocker ? " rumo-open-composer--blocker" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          const mentions = parseMentions(body, roster);
          start(async () => {
            const result = await createCoordinationMessageAction({
              subjectType,
              subjectId,
              body,
              isBlocker,
              mentionedUserIds: mentions.mentionedUserIds,
              mentionedAgentIdentityIds: mentions.mentionedAgentIdentityIds,
            });
            if (!result.ok) toast.error(result.error);
            else {
              toast.success(isBlocker ? "Maré contrária registrada" : "Mensagem enviada");
              setBody("");
              setIsBlocker(false);
              router.refresh();
            }
          });
        }}
      >
        <CoordinationKindStamps
          value={isBlocker}
          onChange={setIsBlocker}
          blockerHint="Maré contrária abre fio próprio e bloqueia a Manobra até ser resolvida."
        />
        <label className="sr-only" htmlFor={`bordo-${subjectId}`}>
          {isBlocker ? "Maré contrária" : "Recado de bordo"}
        </label>
        <div className="rumo-open-composer__row">
          <Textarea
            id={`bordo-${subjectId}`}
            className="rumo-thread__reply"
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              isBlocker
                ? "O que impede o bordo de seguir"
                : roster.length
                  ? "Recado para o bordo. Use @nome para mencionar."
                  : "Recado para o bordo"
            }
            rows={2}
            maxLength={COORDINATION_MESSAGE_MAX}
          />
          <Button type="submit" disabled={pending || !body.trim()}>
            {isBlocker ? "Registrar maré" : "Enviar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
