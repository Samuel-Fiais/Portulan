"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Anchor, Check, LoaderCircle, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { createWorkspaceAction, switchWorkspaceAction } from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { workspaceInitials, workspaceRoleMeta, type WorkspaceMembership } from "@/lib/workspaces";

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  variant = "rail",
}: {
  workspaces: WorkspaceMembership[];
  activeWorkspaceId: string | null;
  variant?: "rail" | "drawer";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  function switchTo(workspaceId: string) {
    if (workspaceId === active?.id) return;
    startTransition(async () => {
      const result = await switchWorkspaceAction(workspaceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Atracado em ${result.workspace.name}`);
      router.refresh();
    });
  }

  function create() {
    startTransition(async () => {
      const result = await createWorkspaceAction({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreateOpen(false);
      setName("");
      toast.success(`Porto ${result.workspace.name} fundado`);
      router.push("/porto");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "workspace-porto-trigger",
            variant === "drawer" && "workspace-porto-trigger--drawer",
          )}
          aria-label={active ? `Porto ativo: ${active.name}. Trocar de porto.` : "Escolher porto"}
          title={active?.name ?? "Portos"}
        >
          <span className="workspace-porto-mark" aria-hidden="true">
            {active ? workspaceInitials(active.name) : <Anchor />}
          </span>
          <span className="workspace-porto-label">
            <strong>{active?.name ?? "Sem porto"}</strong>
            <span>{active ? workspaceRoleMeta[active.role].label : "—"}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side={variant === "drawer" ? "bottom" : "right"}
          sideOffset={8}
          className="workspace-porto-menu"
        >
          <DropdownMenuLabel>Portos</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="workspace-porto-item"
              data-active={workspace.id === active?.id ? "true" : undefined}
              aria-current={workspace.id === active?.id ? "true" : undefined}
              onSelect={() => switchTo(workspace.id)}
              disabled={pending}
            >
              <span className="workspace-porto-mark" aria-hidden="true">
                {workspaceInitials(workspace.name)}
              </span>
              <span className="workspace-porto-item-text">
                <strong>{workspace.name}</strong>
                <span>
                  {workspaceRoleMeta[workspace.role].label} · {workspace.memberCount}{" "}
                  {workspace.memberCount === 1 ? "pessoa" : "pessoas"}
                </span>
              </span>
              {workspace.id === active?.id ? <Check className="workspace-porto-check" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="workspace-porto-action" onSelect={() => setCreateOpen(true)}>
            <Plus />
            Fundar porto
          </DropdownMenuItem>
          <DropdownMenuItem className="workspace-porto-action" onSelect={() => router.push("/porto")}>
            <Settings2 />
            Administrar porto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fundar porto</DialogTitle>
            <DialogDescription>
              Um porto reúne tripulação, cartas e gabaritos. Você entra como capitão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome do porto</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Companhia das Índias"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim().length >= 2) create();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={create} disabled={pending || name.trim().length < 2}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Anchor />}
              Fundar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
