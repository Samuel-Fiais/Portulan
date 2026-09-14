"use client";

import { cn } from "@/lib/utils";
import type { DocumentCollaborator } from "@/lib/documents";
import { UserAvatar } from "@/components/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const roleLabels: Record<DocumentCollaborator["role"], string> = {
  owner: "Cartógrafo",
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
    <div className={cn("document-collaborator-avatars", className)}>
      {visible.map((person) => {
        const name = collaboratorName(person);
        const avatar = (
          <UserAvatar
            name={person.name}
            login={person.login}
            email={person.email}
            imageUrl={person.avatarUrl}
            size="md"
          />
        );

        return (
          <Tooltip key={person.id}>
            <TooltipTrigger asChild>
              {onClick ? (
                <button
                  type="button"
                  className="document-collaborator-avatar-trigger"
                  onClick={onClick}
                  aria-label={`${name} · ${roleLabels[person.role]}`}
                >
                  {avatar}
                </button>
              ) : (
                <span className="document-collaborator-avatar-slot">{avatar}</span>
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
            <span className="document-collaborator-avatar-slot document-collaborator-avatar-overflow">
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
