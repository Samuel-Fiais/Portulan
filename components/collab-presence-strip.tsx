"use client";

import "./collab-presence-strip.css";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  COLLAB_INTENTION_LABELS,
  type CollabIntention,
} from "@/lib/collab-presence";
import type { CollabPresenceParticipant } from "@/lib/collab-presence-client";

function participantLabel(person: CollabPresenceParticipant) {
  if (person.kind === "agent" && person.viaAgent) {
    return `${person.displayName} via ${person.viaAgent}`;
  }
  return person.displayName;
}

function intentionLabel(intention: CollabIntention) {
  return COLLAB_INTENTION_LABELS[intention] ?? intention;
}

export function CollabPresenceStrip({
  participants,
  className,
  max = 6,
}: {
  participants: CollabPresenceParticipant[];
  className?: string;
  max?: number;
}) {
  if (!participants.length) return null;

  const visible = participants.slice(0, max);
  const overflow = participants.length - visible.length;

  return (
    <div className={cn("collab-presence-strip", className)} aria-label="Quem está neste assunto agora">
      {visible.map((person) => {
        const name = participantLabel(person);
        const avatar =
          person.kind === "agent" ? (
            <span className="collab-presence-strip__agent-badge" aria-hidden>
              <Bot className="size-3.5" />
            </span>
          ) : (
            <UserAvatar name={person.displayName} imageUrl={person.avatarUrl} size="sm" />
          );

        return (
          <Tooltip key={person.id}>
            <TooltipTrigger asChild>
              <span className="collab-presence-strip__slot">{avatar}</span>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              {name}
              <span className="text-background/70"> · {intentionLabel(person.intention)}</span>
              {person.kind === "agent" ? (
                <span className="text-background/70"> · Agente</span>
              ) : null}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="collab-presence-strip__overflow">+{overflow}</span>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            {participants.slice(max).map(participantLabel).join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
