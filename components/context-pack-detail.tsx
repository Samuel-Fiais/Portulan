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
  deleteAcceptanceCriterionAction,
  deleteContextPackItemAction,
  deleteContextPackSourceAction,
  saveContextPackRecorteAction,
  startNewContextPackRevisionAction,
  submitContextPackReviewAction,
} from "@/app/dev-context-actions";
import { PackStatusBadge, PackValidityBadge } from "@/components/dev-status-badge";
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
  DOCUMENT_SOURCE_ROLE_LABELS,
  contextItemStrengths,
  contextItemTypes,
  documentSourceRoles,
  type ContextItemStrength,
  type ContextItemType,
} from "@/lib/dev-context";
import { BoardId } from "@/components/board-id";
import { WorkspaceBackLink } from "@/components/workspace-back-link";
import { BordoFeed } from "@/components/bordo-feed";
import { RumoWorkBoard } from "@/components/rumo-work-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";
import { acceptedCount, blockingQuestions, itemsMatchingType } from "@/lib/rumo-work";

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
  roster,
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
  roster: WorkspaceRosterEntry[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [workView, setWorkView] = useState<"lista" | "kanban">("lista");
  const [itemFilter, setItemFilter] = useState<ContextItemType | "all">("all");
  const cartaById = new Map(documents.map((document) => [document.id, document]));
  const canEditPack = pack.status === "draft" || pack.status === "review";
  const defaultView = pack.status === "approved" ? "trabalho" : "contexto";
  const latestRevision = revisions[0];
  const progress = acceptedCount(tasks);
  const blockers = blockingQuestions(items);
  const filteredItems = itemsMatchingType(items, itemFilter).filter(
    (item) => !blockers.some((blocker) => blocker.id === item.id),
  );
  const packThreads = threads.filter((thread) => thread.subjectType === "pack" && thread.subjectId === pack.id);
  const taskBlockers = threads.filter((thread) => thread.subjectType === "task" && thread.isBlocker && !thread.resolvedAt);
  const itemThreadOpen = new Set(
    threads.filter((thread) => !thread.resolvedAt && (thread.subjectType === "item" || thread.subjectType === "criterion")).map((thread) => thread.subjectId),
  );

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id.startsWith("conversa-")) return;
    document.getElementById(id)?.scrollIntoView({ block: "nearest" });
  }, [threads]);

  return (
    <main className="page-wrap workspace-page workspace-page--dev workspace-page--rumo">
      <section className="doc-section">
        <header className="page-heading rumo-masthead">
          <WorkspaceBackLink href={`/projects/${pack.projectId}`} label="Voltar à Expedição" />
          <div className="workspace-heading">
            <span className="eyebrow">Rumo</span>
            <h1 className="fp-h1">
              <BoardId number={pack.boardNumber} className="board-id--heading" />
              <span>{pack.title}</span>
            </h1>
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
              {progress.total > 0 ? (
                <span>
                  {progress.accepted}/{progress.total} Manobras aceitas
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

          <Tabs defaultValue={defaultView} className="rumo-views">
            <TabsList variant="line" className="rumo-views__list">
              <TabsTrigger value="trabalho">Trabalho</TabsTrigger>
              <TabsTrigger value="contexto">Contexto</TabsTrigger>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
            </TabsList>

            <TabsContent value="trabalho" className="rumo-views__pane">
              <div className="section-header split-row">
                <div className="rumo-work-toggle" role="group" aria-label="Vista de trabalho">
                  <Button
                    type="button"
                    variant={workView === "lista" ? "default" : "outline"}
                    onClick={() => setWorkView("lista")}
                  >
                    Lista
                  </Button>
                  <Button
                    type="button"
                    variant={workView === "kanban" ? "default" : "outline"}
                    onClick={() => setWorkView("kanban")}
                  >
                    Kanban
                  </Button>
                </div>
                <div className="split-row__actions rumo-section-actions">
                  <AddTaskDialog packId={pack.id} repositories={repositories} />
                </div>
              </div>
              <RumoWorkBoard
                packId={pack.id}
                tasks={tasks}
                roster={roster}
                canEdit={canEditPack}
                view={workView}
              />
            </TabsContent>

            <TabsContent value="contexto" className="rumo-views__pane rumo-context">
              <section className="rumo-recorte">
                <div className="rumo-recorte__header">
                  <h2>Contrato</h2>
                </div>
                {canEditPack ? (
                  <RecorteForm
                    packId={pack.id}
                    initial={{
                      expectedOutcome: pack.expectedOutcome,
                      scope: pack.scope,
                      outOfScope: pack.outOfScope,
                      planSummary,
                    }}
                    onSuccess={() => router.refresh()}
                  />
                ) : (
                  <div className="rumo-contrato-read">
                    {pack.expectedOutcome ? (
                      <div>
                        <p className="rumo-recorte__label">Resultado esperado</p>
                        <p className="rumo-recorte__body">{pack.expectedOutcome}</p>
                      </div>
                    ) : null}
                    {pack.scope ? (
                      <div>
                        <p className="rumo-recorte__label">Escopo</p>
                        <p className="rumo-recorte__body">{pack.scope}</p>
                      </div>
                    ) : null}
                    {pack.outOfScope ? (
                      <div>
                        <p className="rumo-recorte__label">Fora de escopo</p>
                        <p className="rumo-recorte__body">{pack.outOfScope}</p>
                      </div>
                    ) : null}
                    {planSummary ? (
                      <div>
                        <p className="rumo-recorte__label">Plano de navegação</p>
                        <p className="dev-item-body">{planSummary}</p>
                      </div>
                    ) : (
                      <p className="dev-empty">Contrato ainda não definido.</p>
                    )}
                  </div>
                )}
              </section>

              <section className="dev-subsection">
                <div className="section-header split-row">
                  <h2>Marcos de chegada</h2>
                  {canEditPack ? <AddCriterionDialog packId={pack.id} /> : null}
                </div>
                {criteria.length === 0 ? (
                  <p className="dev-empty">Nenhum marco ainda.{canEditPack ? " Adicione o primeiro." : ""}</p>
                ) : (
                  <ul className="rumo-dense-list">
                    {criteria.map((criterion) => {
                      const covering = tasks.filter((task) => task.criterionIds.includes(criterion.id)).length;
                      return (
                        <li key={criterion.id} className="rumo-dense-row">
                          <BoardId number={criterion.boardNumber} />
                          <span>{criterion.description}</span>
                          {covering > 0 ? (
                            <span className="dev-item-meta">
                              {covering} {covering === 1 ? "Manobra" : "Manobras"}
                            </span>
                          ) : null}
                          {itemThreadOpen.has(criterion.id) ? <span className="dev-item-meta">fio aberto</span> : null}
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
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="dev-subsection">
                <div className="section-header split-row">
                  <h2>Itens</h2>
                  {canEditPack ? <AddItemDialog packId={pack.id} /> : null}
                </div>
                <div className="rumo-item-filters" role="group" aria-label="Filtrar itens">
                  <Button type="button" variant={itemFilter === "all" ? "default" : "outline"} onClick={() => setItemFilter("all")}>
                    Todos
                  </Button>
                  {contextItemTypes.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={itemFilter === type ? "default" : "outline"}
                      onClick={() => setItemFilter(type)}
                    >
                      {CONTEXT_ITEM_TYPE_LABELS[type]}
                    </Button>
                  ))}
                </div>
                {blockers.length > 0 ? (
                  <aside className="fp-alert warning rumo-blocking" role="status">
                    <p className="alert-body">Perguntas bloqueadoras</p>
                    <ul className="rumo-dense-list">
                      {blockers.map((item) => (
                        <li key={item.id} className="rumo-dense-row rumo-item--question">
                          <BoardId number={item.boardNumber} />
                          <span className="rumo-type-chip">Pergunta</span>
                          <span>{item.body}</span>
                          {itemThreadOpen.has(item.id) ? <span className="dev-item-meta">fio aberto</span> : null}
                        </li>
                      ))}
                    </ul>
                  </aside>
                ) : null}
                {filteredItems.length === 0 && blockers.length === 0 ? (
                  <p className="dev-empty">Nenhum item ainda.{canEditPack ? " Adicione o primeiro." : ""}</p>
                ) : (
                  <ul className="rumo-dense-list">
                    {filteredItems.map((item) => (
                      <li key={item.id} className={`rumo-dense-row rumo-item--${item.type}`}>
                        <BoardId number={item.boardNumber} />
                        <span className="rumo-type-chip">{CONTEXT_ITEM_TYPE_LABELS[item.type]}</span>
                        <span>{item.body}</span>
                        {item.strength !== "required" ? (
                          <span className="dev-item-meta">{CONTEXT_ITEM_STRENGTH_LABELS[item.strength]}</span>
                        ) : null}
                        {itemThreadOpen.has(item.id) ? <span className="dev-item-meta">fio aberto</span> : null}
                        {canEditPack ? (
                          <RemoveRumoEntry
                            label={`Remover ${CONTEXT_ITEM_TYPE_LABELS[item.type].toLowerCase()}`}
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
                )}
              </section>

              <section className="dev-subsection">
                <div className="section-header split-row">
                  <h2>Cartas-fonte</h2>
                  {canEditPack ? <AddSourceDialog packId={pack.id} documents={documents} /> : null}
                </div>
                {sources.length === 0 ? (
                  <p className="dev-empty">Nenhuma carta-fonte.{canEditPack ? " Vincule a primeira." : ""}</p>
                ) : (
                  <ul className="rumo-dense-list">
                    {sources.map((source) => {
                      const carta = cartaById.get(source.documentId);
                      const release = carta?.releases.find((item) => item.id === source.releaseId);
                      return (
                        <li key={source.id} className="rumo-dense-row">
                          <BoardId number={source.boardNumber} />
                          <span className="rumo-type-chip">{DOCUMENT_SOURCE_ROLE_LABELS[source.sourceRole]}</span>
                          {source.releaseId ? (
                            <Link href={`/p/${source.releaseId}`}>{carta?.title ?? "Carta"}</Link>
                          ) : (
                            <Link href={carta ? `/documents/${carta.slug}` : `/documents/${source.documentId}`}>
                              {carta?.title ?? "Carta"}
                            </Link>
                          )}
                          <span className="dev-item-meta">
                            {release ? `edição ${release.version}` : source.releaseId ? "edição fixada" : "carta viva"}
                            {pack.validity === "needs_review" ? " · revisar" : ""}
                          </span>
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
                )}
              </section>
            </TabsContent>

            <TabsContent value="atividade" className="rumo-views__pane">
              {taskBlockers.length > 0 ? (
                <p className="dev-item-meta">
                  {taskBlockers.length} Maré{taskBlockers.length === 1 ? "" : "s"} nas Manobras.{" "}
                  <Link href={`/context-packs/${pack.id}/tasks/${taskBlockers[0]?.subjectId}`}>
                    Abrir Manobra
                  </Link>
                </p>
              ) : null}
              <BordoFeed
                subjectType="pack"
                subjectId={pack.id}
                threads={packThreads}
                messagesByThread={messagesByThread}
                userNames={userNames}
                agentNames={agentNames}
                roster={roster}
                emptyLabel="Nenhum recado neste Rumo."
              />
            </TabsContent>
          </Tabs>
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

function RecorteForm({
  packId,
  initial,
  onSuccess,
}: {
  packId: string;
  initial: { expectedOutcome: string; scope: string; outOfScope: string; planSummary: string };
  onSuccess?: () => void;
}) {
  const [expectedOutcome, setExpectedOutcome] = useState(initial.expectedOutcome);
  const [scope, setScope] = useState(initial.scope);
  const [outOfScope, setOutOfScope] = useState(initial.outOfScope);
  const [planSummary, setPlanSummary] = useState(initial.planSummary);
  const [pending, start] = useTransition();
  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveContextPackRecorteAction(packId, {
            expectedOutcome,
            scope,
            outOfScope,
            planSummary,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Contrato gravado");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label htmlFor={`outcome-${packId}`}>Resultado esperado</Label>
        <Textarea
          id={`outcome-${packId}`}
          value={expectedOutcome}
          onChange={(event) => setExpectedOutcome(event.target.value)}
          placeholder="Qual resultado este Rumo deve alcançar"
        />
      </div>
      <div className="dev-field">
        <Label htmlFor={`scope-${packId}`}>Escopo</Label>
        <Textarea
          id={`scope-${packId}`}
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          placeholder="O que este Rumo cobre"
        />
      </div>
      <div className="dev-field">
        <Label htmlFor={`out-of-scope-${packId}`}>Fora de escopo</Label>
        <Textarea
          id={`out-of-scope-${packId}`}
          value={outOfScope}
          onChange={(event) => setOutOfScope(event.target.value)}
          placeholder="O que fica deliberadamente de fora"
        />
      </div>
      <div className="dev-field">
        <Label htmlFor={`plan-${packId}`}>Plano de navegação</Label>
        <Textarea
          id={`plan-${packId}`}
          value={planSummary}
          onChange={(event) => setPlanSummary(event.target.value)}
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
