"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createContextPackAction } from "@/app/dev-context-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CONTEXT_PACK_TITLE_MAX, CONTEXT_PACK_TITLE_MIN } from "@/lib/dev-context";

export function DocumentContextUsage({
  documentId,
  documentTitle,
  releaseId,
  packs,
  projects,
}: {
  documentId: string;
  documentTitle: string;
  releaseId: string | null;
  packs: { id: string; title: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState(`Rumo a partir de ${documentTitle}`);
  const [pending, start] = useTransition();

  return (
    <section className="metadata-action-panel" aria-label="Rumos desta Carta">
      <h3 className="metadata-action-panel__title">Rumos desta Carta</h3>
      {packs.length === 0 ? (
        <p>Nenhum Rumo usa esta Carta.</p>
      ) : (
        <ul>
          {packs.map((pack) => (
            <li key={pack.id}>
              <Link href={`/context-packs/${pack.id}`}>{pack.title}</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="metadata-action-panel__footer">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={projects.length === 0}>
              Iniciar um rumo a partir desta carta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar um rumo a partir desta carta</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!projectId || title.trim().length < CONTEXT_PACK_TITLE_MIN) return;
                start(async () => {
                  const result = await createContextPackAction({
                    projectId,
                    title,
                    documentId,
                    releaseId: releaseId ?? undefined,
                  });
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success("Rumo criado");
                    setOpen(false);
                    router.push(`/context-packs/${result.pack.id}`);
                  }
                });
              }}
            >
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Expedição" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={CONTEXT_PACK_TITLE_MIN}
              maxLength={CONTEXT_PACK_TITLE_MAX}
            />
            {!releaseId ? (
              <p>Publique uma edição para usar esta Carta como fonte formal na aprovação.</p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || !projectId || title.trim().length < CONTEXT_PACK_TITLE_MIN}
              >
                Criar rumo
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
