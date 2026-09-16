"use client";

import "./dev-workspace.css";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRepositoryAction, linkRepositoryAction } from "@/app/dev-context-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPOSITORY_KIND_LABELS, REPOSITORY_NAME_MAX, REPOSITORY_NAME_MIN, type RepositoryKind } from "@/lib/dev-context";

export function CreateRepositoryDialog({
  projectId,
  triggerLabel = "Registrar embarcação",
}: {
  projectId?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RepositoryKind>("git");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={projectId ? "outline" : "default"}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar embarcação</DialogTitle>
          <DialogDescription>
            Dê um nome ao repositório. O caminho local fica na sua máquina, não no porto.
          </DialogDescription>
        </DialogHeader>
        <form
          className="dev-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < REPOSITORY_NAME_MIN) return;
            start(async () => {
              const result = await createRepositoryAction({ name, kind, remoteUrl });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              if (projectId) {
                const linked = await linkRepositoryAction(projectId, {
                  repositoryId: result.repository.id,
                  role: "primary",
                });
                if (!linked.ok) {
                  toast.error(linked.error);
                  return;
                }
              }
              toast.success("Embarcação registrada");
              setOpen(false);
              setName("");
              setRemoteUrl("");
              if (projectId) router.refresh();
              else router.push(`/repositories/${result.repository.id}`);
            });
          }}
        >
          <div className="dev-field">
            <Label htmlFor="vessel-name">Nome</Label>
            <Input
              id="vessel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={REPOSITORY_NAME_MIN}
              maxLength={REPOSITORY_NAME_MAX}
            />
          </div>
          <div className="dev-field">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as RepositoryKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPOSITORY_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="dev-field">
            <Label htmlFor="vessel-remote">URL remota</Label>
            <Input
              id="vessel-remote"
              value={remoteUrl}
              onChange={(event) => setRemoteUrl(event.target.value)}
              placeholder="https://github.com/…"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || name.trim().length < REPOSITORY_NAME_MIN}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
