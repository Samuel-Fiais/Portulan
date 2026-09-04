"use client";

import { cn } from "@/lib/utils";
import type { DocumentCollaborator } from "@/lib/documents";
import { UserAvatar } from "@/components/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const roleLabels: Record<DocumentCollaborator["role"], string> = {
  owner: "Responsável",
  editor: "Editor",
  viewer: "Leitor",
};

function collaboratorName(person: DocumentCollaborator) {
  return person.name ?? person.login ?? person.email ?? "Colaborador";
}

export function DocumentCollaboratorAvatars({
  collaborators,
  className,
  max = 5,
  onClick,
}: {
  collaborators: DocumentCollaborator[];
  className?: string;
  max?: number;
  onClick?: () => void;
}) {
  if (!collaborators.length) return null;

  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((person) => {
        const name = collaboratorName(person);
        const avatar = (
          <UserAvatar
            name={person.name}
            login={person.login}
            email={person.email}
            imageUrl={person.avatarUrl}
            className="ring-2 ring-background"
          />
        );

        return (
          <Tooltip key={person.id}>
            <TooltipTrigger asChild>
              {onClick ? (
                <button type="button" className="rounded-none" onClick={onClick} aria-label={`${name} · ${roleLabels[person.role]}`}>
                  {avatar}
                </button>
              ) : (
                <span className="inline-flex rounded-none">{avatar}</span>
              )}
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
              {name}
              <span className="text-background/70"> · {roleLabels[person.role]}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex size-7 items-center justify-center rounded-none bg-muted font-mono text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
              +{overflow}
            </span>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            {collaborators.slice(max).map(collaboratorName).join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
