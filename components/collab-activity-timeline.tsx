"use client";

import { collabIntentionLabel, type CollabActivityEventView } from "@/lib/collab-activity-labels";
import { formatRelativeDate } from "@/lib/utils";

export function CollabActivityTimeline({
  events,
  loading,
  className,
  filter,
}: {
  events: CollabActivityEventView[];
  loading?: boolean;
  className?: string;
  filter?: "all" | "human" | "agent" | "commands";
}) {
  const filtered = events.filter((event) => {
    if (!filter || filter === "all") return true;
    if (filter === "human") return event.kind === "human";
    if (filter === "agent") return event.kind === "agent";
    if (filter === "commands") return event.type === "command.applied";
    return true;
  });

  if (!filtered.length && !loading) {
    return (
      <p className={`collab-activity-empty${className ? ` ${className}` : ""}`}>
        Nenhuma atividade ao vivo neste artefato ainda.
      </p>
    );
  }

  return (
    <ol className={`collab-activity-timeline${className ? ` ${className}` : ""}`}>
      {filtered.map((event) => {
        const actor =
          event.kind === "agent" && event.viaAgent
            ? `${event.viaAgent} via ${event.displayName}`
            : event.displayName;
        const intention = collabIntentionLabel(event.intention);
        return (
          <li key={event.id} className={`collab-activity-item collab-activity-item--${event.kind}`}>
            <div className="collab-activity-item__head">
              <span className="collab-activity-item__actor">{actor}</span>
              {intention ? (
                <span className="collab-activity-item__intention">{intention}</span>
              ) : null}
              <time className="collab-activity-item__time" dateTime={event.createdAt}>
                {formatRelativeDate(event.createdAt)}
              </time>
            </div>
            <p className="collab-activity-item__summary">{event.summary}</p>
            {event.correlationId ? (
              <span className="collab-activity-item__correlation" title="Correlação com o Diário">
                #{event.correlationId.slice(0, 8)}
              </span>
            ) : null}
          </li>
        );
      })}
      {loading ? <li className="collab-activity-item collab-activity-item--loading">Carregando…</li> : null}
    </ol>
  );
}
