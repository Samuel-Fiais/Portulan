import { Badge } from "@/components/ui/badge";
import {
  CONTEXT_PACK_STATUS_LABELS,
  CONTEXT_PACK_VALIDITY_LABELS,
  TASK_STATUS_LABELS,
  type ContextPackStatus,
  type ContextPackValidity,
  type ImplementationTaskStatus,
} from "@/lib/dev-context";
import { cn } from "@/lib/utils";

const PACK_STATUS_TONE: Record<ContextPackStatus, string> = {
  draft: "status-draft",
  review: "status-review",
  approved: "status-published",
  superseded: "status-archived",
};

const PACK_VALIDITY_TONE: Record<ContextPackValidity, string> = {
  current: "status-workspace",
  needs_review: "status-external",
  expired: "status-disabled",
};

const TASK_STATUS_TONE: Record<ImplementationTaskStatus, string> = {
  available: "status-draft",
  claimed: "status-review",
  in_progress: "status-workspace",
  blocked: "status-disabled",
  reported: "status-external",
  accepted: "status-published",
};

export function PackStatusBadge({ status }: { status: ContextPackStatus }) {
  return (
    <Badge variant="outline" className={cn("status-badge", PACK_STATUS_TONE[status])}>
      {CONTEXT_PACK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PackValidityBadge({ validity }: { validity: ContextPackValidity }) {
  return (
    <Badge variant="outline" className={cn("status-badge", PACK_VALIDITY_TONE[validity])}>
      {CONTEXT_PACK_VALIDITY_LABELS[validity]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: ImplementationTaskStatus }) {
  return (
    <Badge variant="outline" className={cn("status-badge", TASK_STATUS_TONE[status])}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
