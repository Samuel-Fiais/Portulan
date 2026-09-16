"use client";

import "./dev-workspace.css";

import Link from "next/link";
import { PackStatusBadge, PackValidityBadge } from "@/components/dev-status-badge";
import { BoardId } from "@/components/board-id";
import type { ContextPackRecord } from "@/lib/db/context-packs";

export function RumosPanel({ packs }: { packs: ContextPackRecord[] }) {
  return (
    <main className="page-wrap workspace-page workspace-page--dev">
      <section className="doc-section">
        <header className="page-heading dev-masthead">
          <div className="workspace-heading">
            <h1 className="fp-h1">Rumos</h1>
            <div className="dev-masthead__bar">
              <p className="dev-meta">
                <span className="dev-meta__label">Porto</span>
                <span>{packs.length === 1 ? "1 rumo" : `${packs.length} rumos`}</span>
              </p>
            </div>
            <p className="workspace-lead">
              O recorte que um agente segue para implementar. Abra um Rumo numa Expedição ou a partir de uma Carta.
            </p>
          </div>
        </header>
        <div className="workspace-page-body">
          {packs.length === 0 ? (
            <p className="dev-empty">
              Nenhum Rumo neste porto. Comece por uma <Link href="/projects">Expedição</Link>.
            </p>
          ) : (
            <ul className="dev-index-list">
              {packs.map((pack) => (
                <li key={pack.id} className="rumo-index-item">
                  <BoardId number={pack.boardNumber} />
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
      </section>
    </main>
  );
}
