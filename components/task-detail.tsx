"use client";

import "./dev-workspace.css";

import { useState, useTransition, type TransitionStartFunction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptTaskResultAction,
  addImplementationTaskAction,
  addProgressReportAction,
} from "@/app/dev-context-actions";
import { BoardId } from "@/components/board-id";
import { BordoFeed } from "@/components/bordo-feed";
import { TaskAssigneeSelect } from "@/components/task-assignee-select";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { TaskStatusSelect } from "@/components/task-status-select";
import { TaskSourceSection } from "@/components/task-source-section";
import type { CartaOption } from "@/components/context-pack-detail";
import { WorkspaceBackLink } from "@/components/workspace-back-link";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actorDisplayName } from "@/lib/audit-policy";
import type { ImplementationTaskRecord, ProgressReportRecord } from "@/lib/db/implementation-tasks";
import type { ImplementationTaskSourceRecord } from "@/lib/db/implementation-task-sources";
import type { CoordinationMessageRecord, CoordinationThreadRecord } from "@/lib/db/coordination";
import type { AcceptanceCriterionRecord, ContextPackItemRecord } from "@/lib/db/context-packs";
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";
import {
  canRegisterTaskProgress,
  canRegisterTaskResult,
  isLeaseActive,
} from "@/lib/implementation-task-policy";

const REPORT_KIND_LABELS: Record<string, string> = {
  progress: "Progresso",
  result: "Resultado",
};

function stampTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AcceptResultStamp({
  taskId,
  pending,
  start,
  gaps,
  uncovered,
}: {
  taskId: string;
  pending: boolean;
  start: TransitionStartFunction;
  gaps: string[];
  uncovered: string[];
}) {
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={pending}>
          Aceitar resultado
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aceitar este resultado?</AlertDialogTitle>
          <AlertDialogDescription>
            Manobra reportada não é aceita automaticamente. Links externos são referência, não prova.
            {gaps.length > 0 ? ` Lacunas: ${gaps.join(" · ")}.` : ""}
            {uncovered.length > 0 ? ` Marcos sem cobertura: ${uncovered.join(" · ")}.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const result = await acceptTaskResultAction(taskId);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Manobra aceita");
                  router.refresh();
                }
              })
            }
          >
            Aceitar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TaskDetail({
  packId,
  packTitle,
  packBoardNumber,
  packStatus,
  task,
  parent,
  children,
  reports,
  threads,
  messagesByThread,
  userNames,
  agentNames,
  roster,
  repositoryName,
  revisionNumber,
  requiredItems,
  criteria,
  sources,
  documents,
}: {
  packId: string;
  packTitle: string;
  packBoardNumber: number;
  packStatus: "draft" | "review" | "approved" | "superseded";
  task: ImplementationTaskRecord;
  parent: ImplementationTaskRecord | null;
  children: ImplementationTaskRecord[];
  reports: ProgressReportRecord[];
  threads: CoordinationThreadRecord[];
  messagesByThread: Record<string, CoordinationMessageRecord[]>;
  userNames: Record<string, string>;
  agentNames: Record<string, string>;
  roster: WorkspaceRosterEntry[];
  repositoryName: string | null;
  revisionNumber: number | null;
  requiredItems: ContextPackItemRecord[];
  criteria: AcceptanceCriterionRecord[];
  sources: ImplementationTaskSourceRecord[];
  documents: CartaOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [report, setReport] = useState("");
  const [lance, setLance] = useState("");

  const visibleReports = reports.filter((item) => item.summary.trim());
  const hasOpenBlocker = threads.some((thread) => thread.isBlocker && !thread.resolvedAt);
  const canProgress = canRegisterTaskProgress(task.status);
  const canResult = canRegisterTaskResult(task.status);
  const canAccept = task.status === "reported";
  const hasSummary = Boolean(report.trim());
  const latestResult = visibleReports.find((item) => item.kind === "result");
  const covered = new Set(latestResult?.coveredCriterionIds ?? []);
  const uncovered = criteria.filter((criterion) => !covered.has(criterion.id)).map((criterion) => criterion.description);
  const gaps = [latestResult?.gaps, ...visibleReports.map((item) => item.gaps)].filter(Boolean) as string[];
  const leaseHolder = task.leaseHolderUserId
    ? actorDisplayName({
        userName: userNames[task.leaseHolderUserId] ?? "Tripulante",
        agentName: task.leaseHolderIdentityId ? agentNames[task.leaseHolderIdentityId] : null,
      })
    : null;
  const leaseActive = isLeaseActive(task.leaseExpiresAt);
  const isLance = Boolean(task.parentTaskId);
  const kindLabel = isLance ? "Lance" : "Manobra";
  const canEditPack = packStatus === "draft" || packStatus === "review";

  function submitReport(kind: "progress" | "result") {
    if (!report.trim()) return;
    start(async () => {
      const result = await addProgressReportAction(task.id, { summary: report, kind });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(kind === "result" ? "Resultado registrado — ainda não aceito" : "Progresso registrado");
        setReport("");
        router.refresh();
      }
    });
  }

  return (
    <main
      className={`page-wrap workspace-page workspace-page--dev workspace-page--rumo workspace-page--manobra${isLance ? " workspace-page--lance" : ""}`}
    >
      <section className="doc-section">
        <header className="page-heading rumo-masthead manobra-masthead">
          <WorkspaceBackLink
            href={
              isLance && parent
                ? `/context-packs/${packId}/tasks/${parent.id}`
                : `/context-packs/${packId}`
            }
            label={isLance && parent ? "Voltar à Manobra" : "Voltar ao Rumo"}
          />
          <div className="workspace-heading">
            <span className="eyebrow">{kindLabel}</span>
            <h1 className="fp-h1 manobra-masthead__objective">
              <BoardId number={task.boardNumber} className="board-id--heading" />
              <span>{task.objective}</span>
            </h1>
            <div className="rumo-masthead__bar manobra-masthead__toolbar">
              <TaskStatusSelect taskId={task.id} status={task.status} canEdit={canEditPack} />
              {canEditPack ? (
                <div className="split-row__actions rumo-masthead__actions">
                  <TaskDeleteButton
                    taskId={task.id}
                    label={kindLabel}
                    redirectTo={
                      isLance && parent
                        ? `/context-packs/${packId}/tasks/${parent.id}`
                        : `/context-packs/${packId}`
                    }
                    hasChildren={!isLance && children.length > 0}
                  />
                </div>
              ) : null}
            </div>
            {isLance && parent ? (
              <nav className="manobra-context-trail" aria-label="Contexto">
                <Link href={`/context-packs/${packId}`} className="manobra-context-trail__segment">
                  <BoardId number={packBoardNumber} />
                  <span title={packTitle}>{packTitle}</span>
                </Link>
                <span className="manobra-context-trail__sep" aria-hidden="true">
                  ›
                </span>
                <Link
                  href={`/context-packs/${packId}/tasks/${parent.id}`}
                  className="manobra-context-trail__segment"
                >
                  <BoardId number={parent.boardNumber} />
                  <span title={parent.objective}>{parent.objective}</span>
                </Link>
              </nav>
            ) : null}
            <p className="dev-meta">
              {!isLance ? (
                <>
                  <span className="dev-meta__label">Rumo</span>
                  <BoardId number={packBoardNumber} />
                  <Link href={`/context-packs/${packId}`}>{packTitle}</Link>
                </>
              ) : null}
              {revisionNumber ? <span>Revisão {revisionNumber}</span> : null}
              <span className="dev-meta__label">Embarcação</span>
              <span>{repositoryName ?? "Sem código"}</span>
              {task.pathScopes.length ? (
                <>
                  <span className="dev-meta__label">Recorte</span>
                  <span>{task.pathScopes.join(", ")}</span>
                </>
              ) : null}
            </p>
          </div>
        </header>

        <div className="workspace-page-body manobra-layout">
          <aside className="manobra-rail">
            <section className="rumo-recorte">
              <h2 className="manobra-panel__title">Trilho</h2>
              <dl className="manobra-kv">
                <div>
                  <dt>Responsável</dt>
                  <dd>
                    <TaskAssigneeSelect
                      taskId={task.id}
                      assigneeUserId={task.assigneeUserId}
                      assigneeAgentIdentityId={task.assigneeAgentIdentityId}
                      roster={roster}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Comando</dt>
                  <dd>
                    {leaseHolder
                      ? `${leaseHolder}${task.leaseExpiresAt ? ` · ${leaseActive ? "até" : "expirou"} ${stampTime(task.leaseExpiresAt)}` : ""}`
                      : "Ninguém assumiu"}
                  </dd>
                </div>
              </dl>
              {requiredItems.length > 0 || criteria.length > 0 ? (
                <div>
                  <p className="rumo-recorte__label">
                    Recorte desta {kindLabel} ·{" "}
                    <Link href={`/context-packs/${packId}`}>Contexto do Rumo</Link>
                  </p>
                  {requiredItems.length > 0 ? (
                    <ul className="rumo-dense-list">
                      {requiredItems.map((item) => (
                        <li key={item.id} className="rumo-dense-row">
                          <BoardId number={item.boardNumber} />
                          <span>{item.body}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {criteria.length > 0 ? (
                    <ul className="rumo-dense-list">
                      {criteria.map((criterion) => (
                        <li key={criterion.id} className="rumo-dense-row">
                          <BoardId number={criterion.boardNumber} />
                          <span>{criterion.description}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="dev-item-body">
                  Sem itens ou marcos ligados.{" "}
                  <Link href={`/context-packs/${packId}`}>Ver Contexto do Rumo</Link>
                </p>
              )}
            </section>

            {!isLance ? (
              <section className="manobra-panel manobra-panel--rail">
                <h2 className="manobra-panel__title">Lances</h2>
                {children.length === 0 ? (
                  <p className="dev-empty">Nenhum Lance. Esta Manobra é a folha.</p>
                ) : (
                  <ul className="rumo-dense-list manobra-lance-list">
                    {children.map((child) => (
                      <li key={child.id} className="manobra-lance-row">
                        <BoardId number={child.boardNumber} />
                        <Link href={`/context-packs/${packId}/tasks/${child.id}`} className="manobra-lance-row__title">
                          {child.objective}
                        </Link>
                        <TaskStatusSelect taskId={child.id} status={child.status} canEdit={canEditPack} />
                        {canEditPack ? (
                          <TaskDeleteButton
                            taskId={child.id}
                            label="Lance"
                            redirectTo={`/context-packs/${packId}/tasks/${task.id}`}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {canEditPack ? (
                  <form
                    className="rumo-lance-form manobra-lance-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const text = lance.trim();
                      if (!text) return;
                      start(async () => {
                        const result = await addImplementationTaskAction(packId, {
                          objective: text,
                          parentTaskId: task.id,
                        });
                        if (!result.ok) toast.error(result.error);
                        else {
                          toast.success("Lance criado");
                          setLance("");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <Input
                      value={lance}
                      onChange={(event) => setLance(event.target.value)}
                      placeholder="Novo Lance"
                      aria-label="Objetivo do Lance"
                    />
                    <Button type="submit" variant="outline" disabled={pending || !lance.trim()}>
                      Lance
                    </Button>
                  </form>
                ) : null}
              </section>
            ) : null}
          </aside>

          <div className="manobra-main">
            {hasOpenBlocker ? (
              <aside className="fp-alert warning" role="status">
                <p className="alert-body">Há uma maré contrária nesta {kindLabel}.</p>
              </aside>
            ) : null}

            <section className="manobra-panel">
              <header className="manobra-panel__header">
                <h2 className="manobra-panel__title">Registros de bordo</h2>
                {visibleReports.length > 0 ? (
                  <span className="manobra-panel__count">{visibleReports.length}</span>
                ) : null}
              </header>
              {visibleReports.length === 0 ? (
                <p className="dev-empty">Nenhum registro ainda.</p>
              ) : (
                <ol className="rumo-message-list manobra-log-list">
                  {visibleReports.map((item) => (
                    <li key={item.id} className="rumo-message manobra-log-entry">
                      <div className="rumo-message__meta">
                        <span>
                          {actorDisplayName({
                            userName: userNames[item.userId] ?? "Tripulante",
                            agentName: item.agentIdentityId ? agentNames[item.agentIdentityId] : null,
                          })}
                        </span>
                        <time dateTime={item.createdAt}>{stampTime(item.createdAt)}</time>
                        <span>{REPORT_KIND_LABELS[item.kind] ?? item.kind}</span>
                      </div>
                      <p className="rumo-message__body">{item.summary}</p>
                      {item.changedScopes.length > 0 ? (
                        <p className="dev-item-meta">Escopos: {item.changedScopes.join(", ")}</p>
                      ) : null}
                      {item.evidence ? <p className="dev-item-body">{item.evidence}</p> : null}
                      {item.commitRef ? <p className="dev-item-meta">Commit (referência): {item.commitRef}</p> : null}
                      {item.pullRequestRef ? (
                        <p className="dev-item-meta">
                          PR (referência, não prova):{" "}
                          {/^https?:\/\//.test(item.pullRequestRef) ? (
                            <a href={item.pullRequestRef} rel="noreferrer">
                              {item.pullRequestRef}
                            </a>
                          ) : (
                            item.pullRequestRef
                          )}
                        </p>
                      ) : null}
                      {item.coveredCriterionIds.length > 0 ? (
                        <p className="dev-item-meta">Marcos cobertos: {item.coveredCriterionIds.length}</p>
                      ) : null}
                      {item.gaps ? <p className="dev-item-body">Lacunas: {item.gaps}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
              {canProgress ? (
                <form
                  className="manobra-log-composer manobra-panel__composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitReport("progress");
                  }}
                >
                  <div className="dev-field">
                    <Label htmlFor={`registro-${task.id}`}>Resumo do Registro de bordo</Label>
                    <Textarea
                      id={`registro-${task.id}`}
                      required
                      value={report}
                      onChange={(event) => setReport(event.target.value)}
                      placeholder="O que avançou, o que falta, evidência"
                      rows={4}
                    />
                  </div>
                  <div className="manobra-stamps">
                    <Button type="submit" variant="default" disabled={pending || !hasSummary}>
                      Registrar progresso
                    </Button>
                    {canResult ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending || !hasSummary}
                        onClick={() => submitReport("result")}
                      >
                        Registrar resultado
                      </Button>
                    ) : null}
                    {canAccept ? (
                      <AcceptResultStamp
                        taskId={task.id}
                        pending={pending}
                        start={start}
                        gaps={gaps}
                        uncovered={uncovered}
                      />
                    ) : null}
                  </div>
                </form>
              ) : (
                <p className="dev-empty manobra-panel__composer">Esta {kindLabel} já foi aceita.</p>
              )}
            </section>

            <TaskSourceSection
              taskId={task.id}
              kindLabel={kindLabel}
              sources={sources}
              documents={documents}
            />

            <section className="manobra-panel">
              <h2 className="manobra-panel__title">Atividade</h2>
              <BordoFeed
                subjectType="task"
                subjectId={task.id}
                threads={threads}
                messagesByThread={messagesByThread}
                userNames={userNames}
                agentNames={agentNames}
                roster={roster}
                emptyLabel={`Nenhum recado nesta ${kindLabel}.`}
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
