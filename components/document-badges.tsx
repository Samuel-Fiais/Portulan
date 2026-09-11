import { Badge } from "@/components/ui/badge";
import { statusMeta, type DocumentStatus } from "@/lib/documents";
import { cn } from "@/lib/utils";

export function TemplateBadge({
  name,
  primaryColor,
  secondaryColor,
}: {
  name: string;
  primaryColor: string;
  secondaryColor?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("template-badge")}
      style={
        {
          "--template-primary": primaryColor,
          "--template-secondary": secondaryColor ?? primaryColor,
        } as React.CSSProperties
      }
    >
      <span className="template-badge-dot" />
      {name}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={cn("status-badge", `status-${status}`)}>
      {statusMeta[status].label}
    </Badge>
  );
}

export function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <Badge variant="outline" className={cn("status-badge", isPublic ? "status-public" : "status-private")}>
      {isPublic ? "Público" : "Privado"}
    </Badge>
  );
}

export function DisabledBadge() {
  return (
    <Badge variant="outline" className={cn("status-badge", "status-disabled")}>
      Desativado
    </Badge>
  );
}

export function OwnershipBadge({ isOwner }: { isOwner: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn("status-badge", isOwner ? "ownership-mine" : "ownership-shared")}
    >
      {isOwner ? "Meu" : "Compartilhado"}
    </Badge>
  );
}
