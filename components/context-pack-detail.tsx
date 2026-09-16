"use client";

import "./dev-workspace.css";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addAcceptanceCriterionAction,
  addContextPackItemAction,
  addContextPackSourceAction,
  addImplementationTaskAction,
  approveContextPackAction,
  createCoordinationMessageAction,
  deleteAcceptanceCriterionAction,
  deleteContextPackItemAction,
  deleteContextPackSourceAction,
  resolveCoordinationThreadAction,
  savePlanAction,
  startNewContextPackRevisionAction,
  submitContextPackReviewAction,
} from "@/app/dev-context-actions";
import { PackStatusBadge, PackValidityBadge, TaskStatusBadge } from "@/components/dev-status-badge";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
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
  CONTEXT_ITEM_STRENGTH_LABELS,
  CONTEXT_ITEM_TYPE_LABELS,
  COORDINATION_MESSAGE_MAX,
  DOCUMENT_SOURCE_ROLE_LABELS,
  contextItemStrengths,
  contextItemTypes,
  documentSourceRoles,
  type ContextItemStrength,
  type ContextItemType,
} from "@/lib/dev-context";
import { CoordinationKindStamps } from "@/components/coordination-kind-stamps";
import { actorDisplayName } from "@/lib/audit-policy";
import type {
  AcceptanceCriterionRecord,
  ContextPackItemRecord,
  ContextPackRecord,
  ContextPackRevisionRecord,
  ContextPackSourceRecord,
} from "@/lib/db/context-packs";
import type { ImplementationTaskRecord } from "@/lib/db/implementation-tasks";
import type { CoordinationMessageRecord, CoordinationThreadRecord } from "@/lib/db/coordination";
import type { RepositoryRecord } from "@/lib/db/projects";

export type CartaReleaseOption = {
  id: string;
  version: number;
  publishedAt: string;
  disabled: boolean;
};

export type CartaOption = {
  id: string;
  title: string;
  slug: string;
  releases: CartaReleaseOption[];
};

const ITEM_GROUP_LABELS: Record<ContextItemType, string> = {
  decision: "Decisões",
  rule: "Regras",
  contract: "Contratos",
  risk: "Riscos",
  assumption: "Suposições",
  question: "Perguntas",
};

function groupContextItems(items: ContextPackItemRecord[]) {
  const visible = items.filter((item) => item.body.trim());
  return contextItemTypes.flatMap((type) => {
    const group = visible.filter((item) => item.type === type);
    return group.length === 0 ? [] : [{ type, items: group }];
  });
}

function RemoveRumoEntry({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={label} onClick={onClick}>
      <Trash2 />
    </Button>
  );
}

export function ContextPackDetail({
  pack,
  projectName,
  items,
  sources,
  criteria,
  tasks,
  threads,
  messagesByThread,
  userNames,
  agentNames,
  revisions,
  repositories,
  documents,
  planSummary,
}: {
  pack: ContextPackRecord;
  projectName: string;
  items: ContextPackItemRecord[];
  sources: ContextPackSourceRecord[];
  criteria: AcceptanceCriterionRecord[];
  tasks: ImplementationTaskRecord[];
  threads: CoordinationThreadRecord[];
  messagesByThread: Record<string, CoordinationMessageRecord[]>;
  userNames: Record<string, string>;
  agentNames: Record<string, string>;
  revisions: ContextPackRevisionRecord[];
  repositories: RepositoryRecord[];
  documents: CartaOption[];
  planSummary: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cartaById = new Map(documents.map((document) => [document.id, document]));
  const canEditPack = pack.status === "draft" || pack.status === "review";
  const briefing = (
    [
      ["Resultado esperado", pack.expectedOutcome],
      ["Escopo", pack.scope],
      ["Fora de escopo", pack.outOfScope],
    ] as const
  ).filter(([, value]) => value);
  const itemGroups = groupContextItems(items);
  const latestRevision = revisions[0];
  const hasContext = itemGroups.length > 0 || sources.length > 0;
  const hasRecorte = briefing.length > 0 || Boolean(planSummary);
  const outcome = briefing.find(([label]) => label === "Resultado esperado");
  const scope = briefing.find(([label]) => label === "Escopo");
  const outOfScope = briefing.find(([label]) => label === "Fora de escopo");

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id.startsWith("conversa-")) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: "nearest" });
    }
  }, [threads]);

  return (
    <main className="page-wrap workspace-page workspace-page--dev workspace-page--rumo">
      <section className="doc-section">
        <header className="page-heading rumo-masthead">
          <div className="workspace-heading">
            <span className="eyebrow">Rumo</span>
            <h1 className="fp-h1">{pack.title}</h1>
            <div className="rumo-masthead__bar">
              <div className="dev-badge-row">
                <PackStatusBadge status={pack.status} />
                <PackValidityBadge validity={pack.validity} />
              </div>
              <div className="split-row__actions rumo-masthead__actions">
                {pack.status === "draft" ? (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await submitContextPackReviewAction(pack.id);
                        if (!result.ok) toast.error(result.error);
                        else {
                          toast.success("Rumo em revisão");
                          router.refresh();
                        }
                      })
                    }
                  >
                    Enviar para revisão
                  </Button>
                ) : null}
                {pack.status === "approved" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Criar nova revisão</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Criar nova revisão deste rumo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A revisão aprovada permanece. O conteúdo vira rascunho para correção. Manobras já
                          criadas continuam na revisão anterior.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            start(async () => {
                              const result = await startNewContextPackRevisionAction(pack.id);
                              if (!result.ok) toast.error(result.error);
                              else {
                                toast.success(result.note ?? "Nova revisão em rascunho");
                                router.refresh();
                              }
                            })
                          }
                        >
                          Criar nova revisão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
                {pack.status === "draft" || pack.status === "review" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button>Aprovar rumo</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Aprovar este rumo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A versão aprovada fica registrada. Cartas-fonte formais precisam estar publicadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            start(async () => {
                              const result = await approveContextPackAction(pack.id);
                              if (!result.ok) toast.error(result.error);
                              else {
                                toast.success("Rumo aprovado");
                                router.refresh();
                              }
                            })
                          }
                        >
                          Aprovar rumo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>
            <p className="dev-meta">
              <span className="dev-meta__label">Expedição</span>
              <Link href={`/projects/${pack.projectId}`}>{projectName}</Link>
              {latestRevision ? (
                <span>
                  Revisão {latestRevision.revisionNumber} ·{" "}
                  {new Date(latestRevision.approvedAt).toLocaleDateString("pt-BR")}
                </span>
              ) : null}
            </p>
            {pack.objective ? <p className="workspace-lead">{pack.objective}</p> : null}
          </div>
        </header>

        <div className="workspace-page-body">
          {pack.validity === "needs_review" ? (
            <aside className="fp-alert warning" role="status">
              <p className="alert-body">
                Uma carta-fonte ganhou edição nova. Crie uma nova revisão para corrigir itens, fontes ou Marcos.
              </p>
            </aside>
          ) : null}

          {hasRecorte ? (
            <section className="rumo-recorte">
              <div className="rumo-recorte__header">
                <h2>Recorte</h2>
                {canEditPack ? <PlanDialog packId={pack.id} initial={planSummary} /> : null}
              </div>
              {outcome ? (
                <div className="rumo-recorte__outcome">
                  <p className="rumo-recorte__label">Resultado esperado</p>
                  <p className="rumo-recorte__body">{outcome[1]}</p>
                </div>
              ) : null}
              {scope || outOfScope ? (
                <div className="rumo-recorte__pair">
                  {scope ? (
                    <div>
                      <p className="rumo-recorte__label">Escopo</p>
                      <p className="rumo-recorte__body">{scope[1]}</p>
                    </div>
                  ) : null}
                  {outOfScope ? (
                    <div className="rumo-recorte__out">
                      <p className="rumo-recorte__label">Fora de escopo</p>
                      <p className="rumo-recorte__body">{outOfScope[1]}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {planSummary ? (
                <div className="rumo-plan">
                  <p className="rumo-plan__label">Plano de navegação</p>
                  <p className="dev-item-body">{planSummary}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <ol className="integration-rumos">
            <li className="integration-step">
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Contexto</h2>
                  {canEditPack ? (
                    <div className="split-row__actions rumo-section-actions">
                      {!hasRecorte ? <PlanDialog packId={pack.id} initial={planSummary} /> : null}
                      <AddItemDialog packId={pack.id} />
                      <AddSourceDialog packId={pack.id} documents={documents} />
                    </div>
                  ) : null}
                </div>
                {hasContext ? (
                  <div className="rumo-context">
                    {itemGroups.map((group) => (
                      <section key={group.type} className={`dev-subsection rumo-item-group rumo-item-group--${group.type}`}>
                        <h3>{ITEM_GROUP_LABELS[group.type]}</h3>
                        <ul className="rumo-item-list">
                          {group.items.map((item) => (
                            <li key={item.id} className={`rumo-item rumo-item--${item.type}`}>
                              <div className="rumo-entry__body">
                                {item.strength !== "required" || item.blocking ? (
                                  <p className="dev-item-meta">
                                    {item.strength !== "required"
                                      ? CONTEXT_ITEM_STRENGTH_LABELS[item.strength]
                                      : null}
                                    {item.blocking ? (
                                      <>
                                        {item.strength !== "required" ? " · " : null}
                                        bloqueadora
                                      </>
                                    ) : null}
                                  </p>
                                ) : null}
                                <p className="dev-item-body">{item.body}</p>
                              </div>
                              {canEditPack ? (
                                <RemoveRumoEntry
                                  label={`Remover ${ITEM_GROUP_LABELS[item.type].toLowerCase()}`}
                                  disabled={pending}
                                  onClick={() =>
                                    start(async () => {
                                      const result = await deleteContextPackItemAction(pack.id, item.id);
                                      if (!result.ok) toast.error(result.error);
                                    })
                                  }
                                />
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                    {sources.length > 0 ? (
                      <section className="dev-subsection">
                        <h3>Cartas-fonte</h3>
                        <ul className="dev-rows">
                          {sources.map((source) => {
                            const carta = cartaById.get(source.documentId);
                            const release = carta?.releases.find((item) => item.id === source.releaseId);
                            return (
                              <li key={source.id} className="rumo-entry">
                                <div className="rumo-entry__body">
                                  <p className="dev-item-meta">
                                    {DOCUMENT_SOURCE_ROLE_LABELS[source.sourceRole]}
                                    {source.required ? " · obrigatória" : ""}
                                    {release ? ` · edição ${release.version}` : source.releaseId ? " · edição fixada" : " · sem edição"}
                                  </p>
                                  <p className="dev-item-title">
                                    {source.releaseId ? (
                                      <Link href={`/p/${source.releaseId}`}>
                                        {carta?.title ?? "Carta"} — edição fixada
                                      </Link>
                                    ) : (
                                      <Link
                                        href={carta ? `/documents/${carta.slug}` : `/documents/${source.documentId}`}
                                      >
                                        {carta?.title ?? "Carta"}
                                      </Link>
                                    )}
                                  </p>
                                  <p className="dev-item-body">
                                    <Link href={carta ? `/documents/${carta.slug}` : `/documents/${source.documentId}`}>
                                      Carta viva
                                    </Link>
                                    {source.releaseId ? (
                                      <>
                                        {" · "}
                                        <Link href={`/p/${source.releaseId}`}>Snapshot da edição</Link>
                                      </>
                                    ) : (
                                      " · escolha uma edição publicada para fonte obrigatória"
                                    )}
                                  </p>
                                  {source.reason ? <p className="dev-item-body">{source.reason}</p> : null}
                                </div>
                                {canEditPack ? (
                                  <RemoveRumoEntry
                                    label={`Remover carta-fonte ${carta?.title ?? ""}`.trim()}
                                    disabled={pending}
                                    onClick={() =>
                                      start(async () => {
                                        const result = await deleteContextPackSourceAction(pack.id, source.id);
                                        if (!result.ok) toast.error(result.error);
                                      })
                                    }
                                  />
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <p className="dev-empty">Nenhum item ou carta-fonte ainda.</p>
                )}
              </div>
            </li>

            <li className="integration-step">
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Manobras</h2>
                  <div className="split-row__actions rumo-section-actions">
                    {canEditPack ? <AddCriterionDialog packId={pack.id} /> : null}
                    <AddTaskDialog packId={pack.id} repositories={repositories} />
                  </div>
                </div>
                {criteria.length > 0 ? (
                  <section className="dev-subsection">
                    <h3>Marcos de chegada</h3>
                    <ul className="dev-ticks">
                      {criteria.map((criterion) => (
                        <li key={criterion.id} className={canEditPack ? "rumo-tick-row" : undefined}>
                          {canEditPack ? <span>{criterion.description}</span> : criterion.description}
                          {canEditPack ? (
                            <RemoveRumoEntry
                              label="Remover marco"
                              disabled={pending}
                              onClick={() =>
                                start(async () => {
                                  const result = await deleteAcceptanceCriterionAction(pack.id, criterion.id);
                                  if (!result.ok) toast.error(result.error);
                                })
                              }
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {tasks.length === 0 ? (
                  <p className="dev-empty">Nenhuma manobra ainda.</p>
                ) : (
                  <ul className="rumo-task-list">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        <Link href={`/context-packs/${pack.id}/tasks/${task.id}`} className="rumo-task">
                          <p className="dev-item-title">{task.objective}</p>
                          <p className="dev-item-meta">
                            <TaskStatusBadge status={task.status} />
                            {task.packRevisionId && latestRevision && task.packRevisionId === latestRevision.id
                              ? ` · revisão ${latestRevision.revisionNumber}`
                              : task.packRevisionId
                                ? ` · revisão ${revisions.find((revision) => revision.id === task.packRevisionId)?.revisionNumber ?? ""}`
                                : " · rascunho"}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>

            <li className="integration-step" id="conversas">
              <span className="section-number" aria-hidden="true">
                03
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Conversas de bordo</h2>
                  <div className="split-row__actions rumo-section-actions">
                    <AddThreadDialog packId={pack.id} />
                  </div>
                </div>
                {threads.length === 0 ? (
                  <p className="dev-empty">Nenhuma conversa neste rumo.</p>
                ) : (
                  <ul className="rumo-thread-list">
                    {threads.map((thread) => (
                      <li key={thread.id}>
                        <PackThread
                          packId={pack.id}
                          thread={thread}
                          messages={messagesByThread[thread.id] ?? []}
                          userNames={userNames}
                          agentNames={agentNames}
                        />
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

function AddItemDialog({ packId }: { packId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Adicionar item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar item</DialogTitle>
        </DialogHeader>
        <AddItemForm
          packId={packId}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddSourceDialog({ packId, documents }: { packId: string; documents: CartaOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Vincular carta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular carta</DialogTitle>
        </DialogHeader>
        <AddSourceForm
          packId={packId}
          documents={documents}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlanDialog({ packId, initial }: { packId: string; initial: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{initial ? "Editar plano" : "Registrar plano"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar plano" : "Registrar plano"}</DialogTitle>
        </DialogHeader>
        <PlanForm
          packId={packId}
          initial={initial}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddCriterionDialog({ packId }: { packId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Adicionar marco</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar marco</DialogTitle>
        </DialogHeader>
        <AddCriterionForm
          packId={packId}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddTaskDialog({ packId, repositories }: { packId: string; repositories: RepositoryRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Nova manobra</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova manobra</DialogTitle>
        </DialogHeader>
        <AddTaskForm
          packId={packId}
          repositories={repositories}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddThreadDialog({ packId }: { packId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isBlocker, setIsBlocker] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setIsBlocker(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Nova conversa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBlocker ? "Maré contrária" : "Nova conversa"}</DialogTitle>
        </DialogHeader>
        <AddThreadForm
          packId={packId}
          isBlocker={isBlocker}
          onBlockerChange={setIsBlocker}
          onSuccess={(threadId) => {
            setOpen(false);
            setIsBlocker(false);
            if (threadId) window.location.hash = `conversa-${threadId}`;
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PackThread({
  packId,
  thread,
  messages,
  userNames,
  agentNames,
}: {
  packId: string;
  thread: CoordinationThreadRecord;
  messages: CoordinationMessageRecord[];
  userNames: Record<string, string>;
  agentNames: Record<string, string>;
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const preview = messages[0]?.body ?? (thread.isBlocker ? "Maré contrária" : "Conversa");
  const resolved = Boolean(thread.resolvedAt);
  const statusLabel = `${thread.isBlocker ? "Maré contrária" : "Conversa"} · ${resolved ? "Resolvida" : "Aberta"}`;

  function resolveThread() {
    start(async () => {
      const result = await resolveCoordinationThreadAction(thread.id, !resolved);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(resolved ? "Conversa reaberta" : "Conversa resolvida");
        router.refresh();
      }
    });
  }

  return (
    <details
      className={`rumo-thread${thread.isBlocker ? " rumo-thread--blocker" : ""}`}
      id={`conversa-${thread.id}`}
    >
      <summary>
        <p className="rumo-thread__status">{statusLabel}</p>
        <p className="rumo-thread__preview">{preview}</p>
      </summary>
      <div className="rumo-thread-bar">
        <button
          type="button"
          className="rumo-thread__status"
          onClick={(event) => {
            const root = event.currentTarget.closest("details");
            if (root instanceof HTMLDetailsElement) root.open = false;
          }}
        >
          {statusLabel}
        </button>
        <div className="rumo-thread__resolve">
          <Button type="button" variant="outline" disabled={pending} onClick={resolveThread}>
            {resolved ? "Reabrir" : "Resolver"}
          </Button>
        </div>
      </div>
      <div className="rumo-thread__body">
        <ol className="rumo-message-list">
          {messages.map((message) => (
            <li key={message.id} className="rumo-message">
              <p className="rumo-message__meta">
                {actorDisplayName({
                  userName: userNames[message.userId] ?? "Tripulante",
                  agentName: message.agentIdentityId ? agentNames[message.agentIdentityId] : null,
                })}
                {" · "}
                {new Date(message.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="rumo-message__body">{message.body}</p>
            </li>
          ))}
        </ol>
        {resolved ? null : (
          <form
            className="rumo-thread__composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (!reply.trim()) return;
              start(async () => {
                const result = await createCoordinationMessageAction({
                  threadId: thread.id,
                  subjectType: "pack",
                  subjectId: packId,
                  body: reply,
                });
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Mensagem enviada");
                  setReply("");
                  router.refresh();
                }
              });
            }}
          >
            <label className="sr-only" htmlFor={`reply-${thread.id}`}>
              Responder
            </label>
            <Textarea
              id={`reply-${thread.id}`}
              className="rumo-thread__reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Continuar o fio"
              rows={2}
              required
              maxLength={COORDINATION_MESSAGE_MAX}
            />
            <Button type="submit" disabled={pending || !reply.trim()}>
              Enviar
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}

function AddItemForm({ packId, onSuccess }: { packId: string; onSuccess?: () => void }) {
  const [body, setBody] = useState("");
  const [type, setType] = useState<ContextItemType>("decision");
  const [strength, setStrength] = useState<ContextItemStrength>("required");
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        start(async () => {
          const result = await addContextPackItemAction(packId, {
            type,
            strength,
            body,
            blocking: type === "question",
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Item adicionado");
            setBody("");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-form-row">
        <div className="dev-field">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(value) => setType(value as ContextItemType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contextItemTypes.map((value) => (
                <SelectItem key={value} value={value}>
                  {CONTEXT_ITEM_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="dev-field">
          <Label>Força</Label>
          <Select value={strength} onValueChange={(value) => setStrength(value as ContextItemStrength)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contextItemStrengths.map((value) => (
                <SelectItem key={value} value={value}>
                  {CONTEXT_ITEM_STRENGTH_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="dev-field">
        <Label htmlFor={`item-body-${packId}`}>Texto</Label>
        <Textarea
          id={`item-body-${packId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Decisão, regra ou pergunta"
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !body.trim()}>
          Adicionar
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddSourceForm({
  packId,
  documents,
  onSuccess,
}: {
  packId: string;
  documents: CartaOption[];
  onSuccess?: () => void;
}) {
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [releaseId, setReleaseId] = useState(documents[0]?.releases.find((release) => !release.disabled)?.id ?? "");
  const [required, setRequired] = useState(true);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const selected = documents.find((document) => document.id === documentId);
  const published = selected?.releases.filter((release) => !release.disabled) ?? [];
  const canSubmit = Boolean(documentId) && (!required || Boolean(releaseId));

  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        start(async () => {
          const result = await addContextPackSourceAction(packId, {
            documentId,
            releaseId: releaseId || null,
            sourceRole: documentSourceRoles[0],
            reason,
            required,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Carta-fonte vinculada");
            setReason("");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label>Carta</Label>
        {documents.length === 0 ? (
          <p className="dev-empty">Abra uma Carta na Cartoteca para usá-la como fonte.</p>
        ) : (
          <Select
            value={documentId}
            onValueChange={(value) => {
              setDocumentId(value);
              const next = documents.find((document) => document.id === value);
              setReleaseId(next?.releases.find((release) => !release.disabled)?.id ?? "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma Carta" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((document) => (
                <SelectItem key={document.id} value={document.id}>
                  {document.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="dev-field">
        <Label>Edição publicada</Label>
        {published.length === 0 ? (
          <p className="dev-empty">
            Esta Carta ainda não tem edição publicada. Publique-a para usá-la como fonte obrigatória.
          </p>
        ) : (
          <Select value={releaseId} onValueChange={setReleaseId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha a edição" />
            </SelectTrigger>
            <SelectContent>
              {published.map((release) => (
                <SelectItem key={release.id} value={release.id}>
                  Edição {release.version} · {new Date(release.publishedAt).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <CheckboxField
        className="dev-item-body"
        checked={required}
        onCheckedChange={(value) => setRequired(value === true)}
        label="Fonte formal (exige edição imutável)"
      />
      <div className="dev-field">
        <Label htmlFor={`source-reason-${packId}`}>Por que entra neste Rumo</Label>
        <Input
          id={`source-reason-${packId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !canSubmit}>
          Vincular
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddCriterionForm({ packId, onSuccess }: { packId: string; onSuccess?: () => void }) {
  const [description, setDescription] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        const text = description.trim();
        if (!text) return;
        start(async () => {
          const result = await addAcceptanceCriterionAction(packId, text);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Marco adicionado");
            setDescription("");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label htmlFor={`criterion-${packId}`}>Marco verificável</Label>
        <Input
          id={`criterion-${packId}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !description.trim()}>
          Adicionar
        </Button>
      </DialogFooter>
    </form>
  );
}

function PlanForm({
  packId,
  initial,
  onSuccess,
}: {
  packId: string;
  initial: string;
  onSuccess?: () => void;
}) {
  const [summary, setSummary] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await savePlanAction(packId, summary);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Plano gravado");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label htmlFor={`plan-${packId}`}>Plano de navegação</Label>
        <Textarea
          id={`plan-${packId}`}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Como se chega ao resultado, se quiser registrar"
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Gravar
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddTaskForm({
  packId,
  repositories,
  onSuccess,
}: {
  packId: string;
  repositories: RepositoryRecord[];
  onSuccess?: () => void;
}) {
  const [objective, setObjective] = useState("");
  const [repositoryId, setRepositoryId] = useState<string>("none");
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        const text = objective.trim();
        if (!text) return;
        start(async () => {
          const result = await addImplementationTaskAction(packId, {
            objective: text,
            repositoryId: repositoryId === "none" ? null : repositoryId,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Manobra criada");
            setObjective("");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label htmlFor={`task-${packId}`}>Objetivo da Manobra</Label>
        <Input
          id={`task-${packId}`}
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          required
        />
      </div>
      <div className="dev-field">
        <Label>Embarcação</Label>
        <Select value={repositoryId} onValueChange={setRepositoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Embarcação (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem código</SelectItem>
            {repositories.map((repository) => (
              <SelectItem key={repository.id} value={repository.id}>
                {repository.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !objective.trim()}>
          Criar
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddThreadForm({
  packId,
  isBlocker,
  onBlockerChange,
  onSuccess,
}: {
  packId: string;
  isBlocker: boolean;
  onBlockerChange: (value: boolean) => void;
  onSuccess?: (threadId?: string) => void;
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        const text = body.trim();
        if (!text) return;
        start(async () => {
          const result = await createCoordinationMessageAction({
            subjectType: "pack",
            subjectId: packId,
            body: text,
            isBlocker,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success(isBlocker ? "Maré contrária registrada" : "Conversa aberta");
            setBody("");
            onBlockerChange(false);
            onSuccess?.(result.thread?.id);
          }
        });
      }}
    >
      <CoordinationKindStamps
        value={isBlocker}
        onChange={onBlockerChange}
        blockerHint="O fio entra como bloqueio do bordo — não é só um comentário."
      />
      <div className="dev-field">
        <Label htmlFor={`thread-${packId}`}>{isBlocker ? "Maré contrária" : "Nova conversa"}</Label>
        <Textarea
          id={`thread-${packId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={isBlocker ? "O que impede o bordo de seguir" : "Pergunta ou alinhamento para o bordo"}
          required
          maxLength={COORDINATION_MESSAGE_MAX}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !body.trim()}>
          {isBlocker ? "Registrar maré" : "Enviar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
