import { Badge } from "@/components/ui/badge";
import { statusMeta, typeMeta, type DocumentStatus, type DocumentType } from "@/lib/documents";
import { cn } from "@/lib/utils";

export function TypeBadge({ type }: { type: DocumentType }) {
  return (
    <Badge variant="outline" className={cn("type-badge", `type-${type}`)}>
      <span className="size-1.5 rounded-full bg-current" />
      {typeMeta[type].short}
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
