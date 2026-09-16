"use client";

import "./dev-workspace.css";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProjectAction } from "@/app/dev-context-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_NAME_MAX, PROJECT_NAME_MIN } from "@/lib/dev-context";
import type { ProjectRecord } from "@/lib/db/projects";

function rumoCountLabel(count: number) {
  if (count === 0) return "Nenhum rumo";
  if (count === 1) return "1 rumo";
  return `${count} rumos`;
}

export function ExpeditionsPanel({
  projects,
  packCounts,
}: {
  projects: ProjectRecord[];
  packCounts: Record<string, number>;
}) {
  return (
    <main className="page-wrap workspace-page workspace-page--dev">
      <section className="doc-section">
        <header className="page-heading dev-masthead">
          <div className="workspace-heading">
            <h1 className="fp-h1">Expedições</h1>
            <div className="dev-masthead__bar">
              <p className="dev-meta">
                <span className="dev-meta__label">Porto</span>
                <span>
                  {projects.length === 1 ? "1 expedição" : `${projects.length} expedições`}
                </span>
              </p>
              <div className="split-row__actions dev-masthead__actions">
                <CreateProjectDialog />
              </div>
            </div>
            <p className="workspace-lead">
              Agrupe o trabalho de um produto ou iniciativa. Cada Expedição reúne Embarcações e Rumos.
            </p>
          </div>
        </header>
        <div className="workspace-page-body">
          {projects.length === 0 ? (
            <p className="dev-empty">Nenhuma Expedição neste porto. Crie a primeira para ligar Embarcações e abrir Rumos.</p>
          ) : (
            <ul className="dev-index-list">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="dev-index-link">
                    <p className="dev-index-kicker">{rumoCountLabel(packCounts[project.id] ?? 0)}</p>
                    <h2 className="dev-card-title">{project.name}</h2>
                    {project.objective ? <p className="dev-card-meta">{project.objective}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar expedição</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar expedição</DialogTitle>
          <DialogDescription>
            Dê um nome. Depois você liga as Embarcações e abre Rumos.
          </DialogDescription>
        </DialogHeader>
        <form
          className="dev-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < PROJECT_NAME_MIN) return;
            start(async () => {
              const result = await createProjectAction({ name, objective });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Expedição criada");
              setOpen(false);
              router.push(`/projects/${result.project.id}`);
            });
          }}
        >
          <div className="dev-field">
            <Label htmlFor="expedition-name">Nome</Label>
            <Input
              id="expedition-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={PROJECT_NAME_MIN}
              maxLength={PROJECT_NAME_MAX}
            />
          </div>
          <div className="dev-field">
            <Label htmlFor="expedition-objective">Objetivo</Label>
            <Textarea
              id="expedition-objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="O que esta Expedição cobre"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || name.trim().length < PROJECT_NAME_MIN}>
              Criar expedição
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
