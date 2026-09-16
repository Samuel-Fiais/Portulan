"use client";

import "./dev-workspace.css";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createContextPackAction,
  linkRepositoryAction,
} from "@/app/dev-context-actions";
import { CreateRepositoryDialog } from "@/components/create-repository-dialog";
import { PackStatusBadge, PackValidityBadge } from "@/components/dev-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTEXT_PACK_TITLE_MAX,
  CONTEXT_PACK_TITLE_MIN,
  PROJECT_REPOSITORY_ROLE_LABELS,
  REPOSITORY_KIND_LABELS,
  type ProjectRepositoryRole,
} from "@/lib/dev-context";
import { WorkspaceBackLink } from "@/components/workspace-back-link";
import type { ContextPackRecord } from "@/lib/db/context-packs";
import type { ProjectRecord, ProjectRepositoryRecord, RepositoryRecord } from "@/lib/db/projects";

export function ExpeditionDetail({
  project,
  links,
  repositories,
  packs,
}: {
  project: ProjectRecord;
  links: ProjectRepositoryRecord[];
  repositories: RepositoryRecord[];
  packs: ContextPackRecord[];
}) {
  const linkedIds = new Set(links.map((link) => link.repositoryId));
  const availableRepositories = repositories.filter((repository) => !linkedIds.has(repository.id));

  return (
    <main className="page-wrap workspace-page workspace-page--dev">
      <section className="doc-section">
        <header className="page-heading dev-masthead">
          <WorkspaceBackLink href="/projects" label="Voltar às Expedições" />
          <div className="workspace-heading">
            <span className="eyebrow">Expedição</span>
            <h1 className="fp-h1">{project.name}</h1>
            <div className="dev-masthead__bar">
              <p className="dev-meta">
                <span className="dev-meta__label">Frota</span>
                <span>
                  {links.length === 1 ? "1 embarcação" : `${links.length} embarcações`}
                  {" · "}
                  {packs.length === 1 ? "1 rumo" : `${packs.length} rumos`}
                </span>
              </p>
            </div>
            {project.objective ? <p className="workspace-lead">{project.objective}</p> : null}
          </div>
        </header>
        <div className="workspace-page-body">
          <ol className="integration-rumos">
            <li className="integration-step">
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Embarcações</h2>
                  <div className="split-row__actions dev-section-actions">
                    <CreateRepositoryDialog projectId={project.id} triggerLabel="Registrar" />
                    <LinkRepositoryDialog projectId={project.id} repositories={availableRepositories} />
                  </div>
                </div>
                {links.length === 0 ? (
                  <p className="dev-empty">Nenhuma Embarcação vinculada.</p>
                ) : (
                  <ul className="dev-index-list">
                    {links.map((link) => (
                      <li key={link.id}>
                        <Link href={`/repositories/${link.repositoryId}`} className="dev-index-link">
                          <p
                            className={`dev-index-kicker${
                              link.repository ? ` dev-index-kicker--${link.repository.kind}` : ""
                            }`}
                          >
                            {PROJECT_REPOSITORY_ROLE_LABELS[link.role]}
                            {link.repository
                              ? ` · ${REPOSITORY_KIND_LABELS[link.repository.kind]}`
                              : ""}
                          </p>
                          <h2 className="dev-card-title">{link.repository?.name ?? "Embarcação"}</h2>
                          {link.pathScopes.length ? (
                            <p className="dev-card-meta">{link.pathScopes.join(", ")}</p>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            <li className="integration-step">
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Rumos</h2>
                  <div className="split-row__actions dev-section-actions">
                    <CreatePackDialog projectId={project.id} />
                  </div>
                </div>
                {packs.length === 0 ? (
                  <p className="dev-empty">Nenhum Rumo nesta Expedição.</p>
                ) : (
                  <ul className="dev-index-list">
                    {packs.map((pack) => (
                      <li key={pack.id}>
                        <Link href={`/context-packs/${pack.id}`} className="dev-index-link">
                          <div className="dev-badge-row">
                            <PackStatusBadge status={pack.status} />
                            <PackValidityBadge validity={pack.validity} />
                          </div>
                          <h2 className="dev-card-title">{pack.title}</h2>
                          {pack.objective ? <p className="dev-card-meta">{pack.objective}</p> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}

function LinkRepositoryDialog({
  projectId,
  repositories,
}: {
  projectId: string;
  repositories: RepositoryRecord[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [repositoryId, setRepositoryId] = useState(repositories[0]?.id ?? "");
  const [role, setRole] = useState<ProjectRepositoryRole>("primary");
  const [paths, setPaths] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={repositories.length === 0}>
          Vincular existente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular embarcação</DialogTitle>
        </DialogHeader>
        <div className="dev-form">
          <div className="dev-field">
            <Label>Embarcação</Label>
            <Select value={repositoryId} onValueChange={setRepositoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Embarcação" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repository) => (
                  <SelectItem key={repository.id} value={repository.id}>
                    {repository.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="dev-field">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(value) => setRole(value as ProjectRepositoryRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_REPOSITORY_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="dev-field">
            <Label htmlFor="link-paths">Paths relativos</Label>
            <Input
              id="link-paths"
              value={paths}
              onChange={(event) => setPaths(event.target.value)}
              placeholder="packages/api, apps/web"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !repositoryId}
            onClick={() =>
              start(async () => {
                const result = await linkRepositoryAction(projectId, {
                  repositoryId,
                  role,
                  pathScopes: paths
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                });
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Embarcação vinculada");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePackDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Criar rumo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar rumo</DialogTitle>
        </DialogHeader>
        <form
          className="dev-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim().length < CONTEXT_PACK_TITLE_MIN) return;
            start(async () => {
              const result = await createContextPackAction({ projectId, title, objective });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Rumo criado");
                setOpen(false);
                router.push(`/context-packs/${result.pack.id}`);
              }
            });
          }}
        >
          <div className="dev-field">
            <Label htmlFor="pack-title">Título</Label>
            <Input
              id="pack-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={CONTEXT_PACK_TITLE_MIN}
              maxLength={CONTEXT_PACK_TITLE_MAX}
            />
          </div>
          <div className="dev-field">
            <Label htmlFor="pack-objective">Objetivo</Label>
            <Textarea
              id="pack-objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || title.trim().length < CONTEXT_PACK_TITLE_MIN}>
              Criar rumo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
