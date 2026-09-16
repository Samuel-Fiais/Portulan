"use client";

import "./dev-workspace.css";

import { useEffect, useState, useTransition, type TransitionStartFunction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptTaskResultAction,
  addProgressReportAction,
  createCoordinationMessageAction,
  resolveCoordinationThreadAction,
} from "@/app/dev-context-actions";
import { CoordinationKindStamps } from "@/components/coordination-kind-stamps";
import { TaskStatusBadge } from "@/components/dev-status-badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actorDisplayName } from "@/lib/audit-policy";
import { COORDINATION_MESSAGE_MAX } from "@/lib/dev-context";
import type { ImplementationTaskRecord, ProgressReportRecord } from "@/lib/db/implementation-tasks";
import type { CoordinationMessageRecord, CoordinationThreadRecord } from "@/lib/db/coordination";
import type { AcceptanceCriterionRecord, ContextPackItemRecord } from "@/lib/db/context-packs";
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
  task,
  reports,
  threads,
  messagesByThread,
  userNames,
  agentNames,
  repositoryName,
  revisionNumber,
  requiredItems,
  criteria,
}: {
  packId: string;
  packTitle: string;
  task: ImplementationTaskRecord;
  reports: ProgressReportRecord[];
  threads: CoordinationThreadRecord[];
  messagesByThread: Record<string, CoordinationMessageRecord[]>;
  userNames: Record<string, string>;
  agentNames: Record<string, string>;
  repositoryName: string | null;
  revisionNumber: number | null;
  requiredItems: ContextPackItemRecord[];
  criteria: AcceptanceCriterionRecord[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [report, setReport] = useState("");
  const [threadBody, setThreadBody] = useState("");
  const [isBlocker, setIsBlocker] = useState(false);

  const visibleReports = reports.filter((item) => item.summary.trim());
  const hasOpenBlocker = threads.some((thread) => thread.isBlocker && !thread.resolvedAt);
  const canProgress = canRegisterTaskProgress(task.status);
  const canResult = canRegisterTaskResult(task.status);
  const canAccept = task.status === "reported";
  const hasSummary = Boolean(report.trim());
  const hasThreadBody = Boolean(threadBody.trim());
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

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id.startsWith("conversa-")) return;
    const el = document.getElementById(id);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: "nearest" });
    }
  }, [threads]);

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
    <main className="page-wrap workspace-page workspace-page--dev workspace-page--rumo workspace-page--manobra">
      <section className="doc-section">
        <header className="page-heading rumo-masthead">
          <div className="workspace-heading">
            <span className="eyebrow">Manobra</span>
            <h1 className="fp-h1">{task.objective}</h1>
            <div className="rumo-masthead__bar">
              <div className="dev-badge-row">
                <TaskStatusBadge status={task.status} />
              </div>
            </div>
            <p className="dev-meta">
              <span className="dev-meta__label">Rumo</span>
              <Link href={`/context-packs/${packId}`}>{packTitle}</Link>
              {revisionNumber ? (
                <>
                  <span className="dev-meta__label">Revisão</span>
                  <span>{revisionNumber}</span>
                </>
              ) : null}
              {repositoryName ? (
                <>
                  <span className="dev-meta__label">Embarcação</span>
                  <span>{repositoryName}</span>
                </>
              ) : (
                <>
                  <span className="dev-meta__label">Embarcação</span>
                  <span>Sem código</span>
                </>
              )}
              {leaseHolder ? (
                <>
                  <span className="dev-meta__label">Comando</span>
                  <span>
                    {leaseHolder}
                    {task.leaseExpiresAt
                      ? ` · ${leaseActive ? "até" : "expirou"} ${stampTime(task.leaseExpiresAt)}`
                      : ""}
                  </span>
                </>
              ) : null}
              {task.pathScopes.length ? (
                <>
                  <span className="dev-meta__label">Recorte</span>
                  <span>{task.pathScopes.join(", ")}</span>
                </>
              ) : null}
            </p>
          </div>
        </header>

        <div className="workspace-page-body">
          {hasOpenBlocker ? (
            <aside className="fp-alert warning" role="status">
              <p className="alert-body">Há uma maré contrária nesta Manobra.</p>
            </aside>
          ) : null}

          {requiredItems.length > 0 || criteria.length > 0 || task.dependsOnTaskIds.length > 0 ? (
            <section className="rumo-recorte">
              <div className="rumo-recorte__header">
                <h2>Contrato desta Manobra</h2>
              </div>
              {requiredItems.length > 0 ? (
                <div>
                  <p className="rumo-recorte__label">Itens obrigatórios</p>
                  <ul className="dev-ticks">
                    {requiredItems.map((item) => (
                      <li key={item.id}>{item.body}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {criteria.length > 0 ? (
                <div>
                  <p className="rumo-recorte__label">Marcos</p>
                  <ul className="dev-ticks">
                    {criteria.map((criterion) => (
                      <li key={criterion.id}>{criterion.description}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {task.dependsOnTaskIds.length > 0 ? (
                <p className="dev-item-body">Depende de {task.dependsOnTaskIds.length} Manobra(s).</p>
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
                  <h2>Registros de bordo</h2>
                </div>
                {visibleReports.length === 0 ? (
                  <p className="dev-empty">Nenhum registro ainda.</p>
                ) : (
                  <ol className="rumo-message-list manobra-log-list">
                    {visibleReports.map((item) => (
                      <li key={item.id} className="rumo-message">
                        <p className="rumo-message__meta">
                          {actorDisplayName({
                            userName: userNames[item.userId] ?? "Tripulante",
                            agentName: item.agentIdentityId ? agentNames[item.agentIdentityId] : null,
                          })}
                          {" · "}
                          {stampTime(item.createdAt)}
                          {" · "}
                          {REPORT_KIND_LABELS[item.kind] ?? item.kind}
                        </p>
                        <p className="rumo-message__body">{item.summary}</p>
                        {item.changedScopes.length > 0 ? (
                          <p className="dev-item-meta">Escopos: {item.changedScopes.join(", ")}</p>
                        ) : null}
                        {item.evidence ? <p className="dev-item-body">{item.evidence}</p> : null}
                        {item.commitRef ? (
                          <p className="dev-item-meta">Commit (referência): {item.commitRef}</p>
                        ) : null}
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
                    className="manobra-log-composer"
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
                    <div className="split-row__actions rumo-section-actions manobra-stamps">
                      <Button
                        type="submit"
                        variant={canResult ? "default" : "outline"}
                        disabled={pending || !hasSummary}
                      >
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
                  <p className="dev-empty">Esta Manobra já foi aceita.</p>
                )}
              </div>
            </li>

            <li className="integration-step" id="conversas">
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <div className="integration-step-body">
                <div className="section-header split-row">
                  <h2>Conversas de bordo</h2>
                </div>
                {threads.length === 0 ? (
                  <p className="dev-empty">Nenhuma conversa nesta Manobra.</p>
                ) : (
                  <ul className="rumo-thread-list">
                    {threads.map((thread) => (
                      <li key={thread.id}>
                        <ManobraThread
                          taskId={task.id}
                          thread={thread}
                          messages={(messagesByThread[thread.id] ?? []).filter((message) => message.body.trim())}
                          userNames={userNames}
                          agentNames={agentNames}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  className={`rumo-open-composer${isBlocker ? " rumo-open-composer--blocker" : ""}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!threadBody.trim()) return;
                    start(async () => {
                      const result = await createCoordinationMessageAction({
                        subjectType: "task",
                        subjectId: task.id,
                        body: threadBody,
                        isBlocker,
                      });
                      if (!result.ok) toast.error(result.error);
                      else {
                        toast.success(isBlocker ? "Maré contrária registrada" : "Mensagem enviada");
                        setThreadBody("");
                        setIsBlocker(false);
                        router.refresh();
                      }
                    });
                  }}
                >
                  <CoordinationKindStamps
                    value={isBlocker}
                    onChange={setIsBlocker}
                    blockerHint="A Manobra fica bloqueada até este fio ser resolvido."
                  />
                  <label className="sr-only" htmlFor={`conversa-${task.id}`}>
                    {isBlocker ? "Maré contrária" : "Nova conversa"}
                  </label>
                  <div className="rumo-open-composer__row">
                    <Textarea
                      id={`conversa-${task.id}`}
                      className="rumo-thread__reply"
                      required
                      value={threadBody}
                      onChange={(event) => setThreadBody(event.target.value)}
                      placeholder={
                        isBlocker ? "O que impede esta Manobra de seguir" : "Pergunta ou alinhamento para o bordo"
                      }
                      rows={2}
                      maxLength={COORDINATION_MESSAGE_MAX}
                    />
                    <Button type="submit" disabled={pending || !hasThreadBody}>
                      {isBlocker ? "Registrar maré" : "Enviar"}
                    </Button>
                  </div>
                </form>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}

function ManobraThread({
  taskId,
  thread,
  messages,
  userNames,
  agentNames,
}: {
  taskId: string;
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
  const hasReply = Boolean(reply.trim());

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
                {stampTime(message.createdAt)}
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
                  subjectType: "task",
                  subjectId: taskId,
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
              required
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Continuar o fio"
              rows={2}
              maxLength={COORDINATION_MESSAGE_MAX}
            />
            <Button type="submit" disabled={pending || !hasReply}>
              Enviar
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}
