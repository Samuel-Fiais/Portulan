"use client";

import "./dev-workspace.css";

import Link from "next/link";
import { CreateRepositoryDialog } from "@/components/create-repository-dialog";
import { REPOSITORY_KIND_LABELS } from "@/lib/dev-context";
import type { RepositoryRecord } from "@/lib/db/projects";

export function VesselsPanel({ repositories }: { repositories: RepositoryRecord[] }) {
  return (
    <main className="page-wrap workspace-page workspace-page--dev">
      <section className="doc-section">
        <header className="page-heading dev-masthead">
          <div className="workspace-heading">
            <h1 className="fp-h1">Embarcações</h1>
            <div className="dev-masthead__bar">
              <p className="dev-meta">
                <span className="dev-meta__label">Porto</span>
                <span>
                  {repositories.length === 1
                    ? "1 embarcação"
                    : `${repositories.length} embarcações`}
                </span>
              </p>
              <div className="split-row__actions dev-masthead__actions">
                <CreateRepositoryDialog />
              </div>
            </div>
            <p className="workspace-lead">
              Repositórios deste porto. Uma Embarcação pode servir a várias Expedições.
            </p>
          </div>
        </header>
        <div className="workspace-page-body">
          {repositories.length === 0 ? (
            <p className="dev-empty">
              Nenhuma Embarcação neste porto. Registre um repositório Git, local ou ambos.
            </p>
          ) : (
            <ul className="dev-index-list">
              {repositories.map((repository) => (
                <li key={repository.id}>
                  <Link href={`/repositories/${repository.id}`} className="dev-index-link">
                    <p className={`dev-index-kicker dev-index-kicker--${repository.kind}`}>
                      {REPOSITORY_KIND_LABELS[repository.kind]}
                    </p>
                    <h2 className="dev-card-title">{repository.name}</h2>
                    {repository.remoteUrl ? (
                      <p className="dev-card-meta">{repository.remoteUrl}</p>
                    ) : repository.notes ? (
                      <p className="dev-card-meta">{repository.notes}</p>
                    ) : null}
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
