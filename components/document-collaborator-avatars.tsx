import { cn } from "@/lib/utils";
import type { DocumentCollaborator } from "@/lib/documents";
import { UserAvatar } from "@/components/user-avatar";

const roleLabels: Record<DocumentCollaborator["role"], string> = {
  owner: "Responsável",
  editor: "Editor",
  viewer: "Leitor",
};

export function DocumentCollaboratorAvatars({
  collaborators,
  className,
  max = 5,
}: {
  collaborators: DocumentCollaborator[];
  className?: string;
  max?: number;
}) {
  if (!collaborators.length) return null;

  const visible = collaborators.slice(0, max);
  const overflow = collaborators.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((person) => (
        <UserAvatar
          key={person.id}
          name={person.name}
          login={person.login}
          email={person.email}
          imageUrl={person.avatarUrl}
          title={`${person.name ?? person.login ?? person.email ?? "Colaborador"} · ${roleLabels[person.role]}`}
          className="ring-2 ring-background"
        />
      ))}
      {overflow > 0 ? (
        <span className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-muted font-mono text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
