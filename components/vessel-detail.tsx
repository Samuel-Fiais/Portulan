"use client";

import "./dev-workspace.css";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { linkRepositoryAction, updateRepositoryAction } from "@/app/dev-context-actions";
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
  PROJECT_REPOSITORY_ROLE_LABELS,
  REPOSITORY_KIND_LABELS,
  REPOSITORY_NAME_MAX,
  REPOSITORY_NAME_MIN,
  type ProjectRepositoryRole,
  type RepositoryKind,
} from "@/lib/dev-context";
import { WorkspaceBackLink } from "@/components/workspace-back-link";
import type { ProjectRecord, RepositoryRecord } from "@/lib/db/projects";

type LinkedExpedition = ProjectRecord & {
  linkRole: ProjectRepositoryRole;
  pathScopes: string[];
};

export function VesselDetail({
  repository,
  expeditions,
  projects,
}: {
  repository: RepositoryRecord;
  expeditions: LinkedExpedition[];
  projects: ProjectRecord[];
}) {
  const linkedIds = new Set(expeditions.map((item) => item.id));
  const availableProjects = projects.filter((project) => !linkedIds.has(project.id));

  const hasIdentity = Boolean(repository.remoteUrl || repository.notes);

  return (
    <main className="page-wrap workspace-page workspace-page--dev">
      <section className="doc-section">
        <header className="page-heading dev-masthead">
          <WorkspaceBackLink href="/repositories" label="Voltar às Embarcações" />
          <div className="workspace-heading">
            <span className="eyebrow">Embarcação</span>
            <h1 className="fp-h1">{repository.name}</h1>
            <div className="dev-masthead__bar">
              <p className="dev-meta">
                <span className="dev-meta__label">Tipo</span>
                <span>{REPOSITORY_KIND_LABELS[repository.kind]}</span>
              </p>
              <div className="split-row__actions dev-masthead__actions">
                <EditVesselDialog repository={repository} />
              </div>
            </div>
          </div>
        </header>
        <div className="workspace-page-body">
          {hasIdentity ? (
            <section className="dev-identity">
              <h2>Identidade</h2>
              <dl className="dev-kv">
                {repository.remoteUrl ? (
                  <div>
                    <dt>URL remota</dt>
                    <dd>
                      <a href={repository.remoteUrl} target="_blank" rel="noreferrer">
                        {repository.remoteUrl}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {repository.notes ? (
                  <div>
                    <dt>Notas</dt>
                    <dd>{repository.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
          <ol className="integration-rumos">
            <li className="integration-step">
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Expedições</h2>
                  <div className="split-row__actions dev-section-actions">
                    <LinkExpeditionDialog
                      repositoryId={repository.id}
                      projects={availableProjects}
                    />
                  </div>
                </div>
                {expeditions.length === 0 ? (
                  <p className="dev-empty">Esta Embarcação ainda não está em nenhuma Expedição.</p>
                ) : (
                  <ul className="dev-index-list">
                    {expeditions.map((expedition) => (
                      <li key={expedition.id}>
                        <Link href={`/projects/${expedition.id}`} className="dev-index-link">
                          <p className="dev-index-kicker">
                            {PROJECT_REPOSITORY_ROLE_LABELS[expedition.linkRole]}
                          </p>
                          <h2 className="dev-card-title">{expedition.name}</h2>
                          {expedition.pathScopes.length ? (
                            <p className="dev-card-meta">{expedition.pathScopes.join(", ")}</p>
                          ) : null}
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

function EditVesselDialog({ repository }: { repository: RepositoryRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(repository.name);
  const [kind, setKind] = useState<RepositoryKind>(repository.kind);
  const [remoteUrl, setRemoteUrl] = useState(repository.remoteUrl ?? "");
  const [notes, setNotes] = useState(repository.notes);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar embarcação</DialogTitle>
        </DialogHeader>
        <form
          className="dev-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < REPOSITORY_NAME_MIN) return;
            start(async () => {
              const result = await updateRepositoryAction(repository.id, {
                name,
                kind,
                remoteUrl,
                notes,
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Embarcação atualizada");
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <div className="dev-field">
            <Label htmlFor="edit-vessel-name">Nome</Label>
            <Input
              id="edit-vessel-name"
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
            <Label htmlFor="edit-vessel-remote">URL remota</Label>
            <Input
              id="edit-vessel-remote"
              value={remoteUrl}
              onChange={(event) => setRemoteUrl(event.target.value)}
            />
          </div>
          <div className="dev-field">
            <Label htmlFor="edit-vessel-notes">Notas</Label>
            <Textarea
              id="edit-vessel-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || name.trim().length < REPOSITORY_NAME_MIN}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LinkExpeditionDialog({
  repositoryId,
  projects,
}: {
  repositoryId: string;
  projects: ProjectRecord[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [role, setRole] = useState<ProjectRepositoryRole>("primary");
  const [paths, setPaths] = useState("");
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={projects.length === 0}>Vincular expedição</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular a uma expedição</DialogTitle>
        </DialogHeader>
        <div className="dev-form">
          <div className="dev-field">
            <Label>Expedição</Label>
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
            <Label htmlFor="vessel-paths">Paths relativos</Label>
            <Input
              id="vessel-paths"
              value={paths}
              onChange={(event) => setPaths(event.target.value)}
              placeholder="packages/api, apps/web"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || !projectId}
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
                  toast.success("Expedição vinculada");
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
