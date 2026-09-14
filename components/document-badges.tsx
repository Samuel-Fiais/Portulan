import { Anchor, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusMeta, type DocumentStatus } from "@/lib/documents";
import { documentVisibilityMeta, type DocumentVisibility } from "@/lib/workspaces";
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

const visibilityTone: Record<DocumentVisibility, string> = {
  private: "status-private",
  workspace: "status-workspace",
  public: "status-public",
};

export function VisibilityIcon({ visibility }: { visibility: DocumentVisibility }) {
  if (visibility === "public") return <Globe />;
  if (visibility === "workspace") return <Anchor />;
  return <Lock />;
}

export function VisibilityBadge({ visibility }: { visibility: DocumentVisibility }) {
  return (
    <Badge variant="outline" className={cn("status-badge", visibilityTone[visibility])}>
      {documentVisibilityMeta[visibility].shortLabel}
    </Badge>
  );
}

export function ExternalBadge() {
  return (
    <Badge variant="outline" className={cn("status-badge", "status-external")}>
      Externo
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
