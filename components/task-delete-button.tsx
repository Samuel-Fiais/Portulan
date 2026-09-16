"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteImplementationTaskAction } from "@/app/dev-context-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function TaskDeleteButton({
  taskId,
  label,
  redirectTo,
  disabled,
  variant = "ghost",
  hasChildren = false,
}: {
  taskId: string;
  label: string;
  redirectTo?: string;
  disabled?: boolean;
  variant?: "ghost" | "outline";
  hasChildren?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size="icon" disabled={disabled || pending} aria-label={label}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {label.toLowerCase()}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita.
            {hasChildren ? " Lances ligados também serão removidos." : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const result = await deleteImplementationTaskAction(taskId);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(`${label} removido`);
                  if (redirectTo) router.push(redirectTo);
                  else router.refresh();
                }
              })
            }
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
