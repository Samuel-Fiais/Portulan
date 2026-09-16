"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateImplementationTaskStatusAction } from "@/app/dev-context-actions";
import { TaskStatusBadge } from "@/components/dev-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_LABELS, type ImplementationTaskStatus } from "@/lib/dev-context";
import { manualTaskStatusOptions } from "@/lib/implementation-task-policy";

export function TaskStatusSelect({
  taskId,
  status,
  canEdit,
}: {
  taskId: string;
  status: ImplementationTaskStatus;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const options = manualTaskStatusOptions(status);

  if (!canEdit || options.length === 0 || status === "blocked") {
    return <TaskStatusBadge status={status} />;
  }

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        start(async () => {
          const result = await updateImplementationTaskStatusAction(taskId, next as ImplementationTaskStatus);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Estado atualizado");
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger className="task-status-select" aria-label="Estado">
        <SelectValue placeholder={TASK_STATUS_LABELS[status]} />
      </SelectTrigger>
      <SelectContent>
        {options.map((value) => (
          <SelectItem key={value} value={value}>
            {TASK_STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
