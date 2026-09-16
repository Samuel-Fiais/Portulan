"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addImplementationTaskAction } from "@/app/dev-context-actions";
import { BoardId } from "@/components/board-id";
import { TaskAssigneeSelect, rosterLabel } from "@/components/task-assignee-select";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { TaskStatusSelect } from "@/components/task-status-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import type { ImplementationTaskRecord } from "@/lib/db/implementation-tasks";
import {
  groupManobras,
  KANBAN_COLUMNS,
  kanbanLanceCountForColumn,
  kanbanLanceLanes,
  kanbanManobras,
  lanceIsComplete,
  lancesInColumn,
  lanceProgress,
  manobraTreeById,
  taskColumnId,
} from "@/lib/rumo-work";
import { cn } from "@/lib/utils";
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";

const LANCE_CHECKLIST_LIMIT = 3;

function assigneeRosterEntry(
  roster: WorkspaceRosterEntry[],
  userId: string | null,
  agentId: string | null,
) {
  if (agentId) {
    return roster.find((entry) => entry.kind === "agent" && entry.agent.id === agentId) ?? null;
  }
  if (userId) {
    return roster.find((entry) => entry.kind === "human" && entry.member.userId === userId) ?? null;
  }
  return null;
}

function AssigneeRow({
  taskId,
  assigneeUserId,
  assigneeAgentIdentityId,
  roster,
  canEdit,
}: {
  taskId: string;
  assigneeUserId: string | null;
  assigneeAgentIdentityId: string | null;
  roster: WorkspaceRosterEntry[];
  canEdit: boolean;
}) {
  const entry = assigneeRosterEntry(roster, assigneeUserId, assigneeAgentIdentityId);
  const label = rosterLabel(roster, assigneeUserId, assigneeAgentIdentityId);

  return (
    <div className="rumo-card__assignee-row">
      {entry?.kind === "agent" ? (
        <UserAvatar kind="agent" name={entry.agent.name} size="sm" />
      ) : entry?.kind === "human" ? (
        <UserAvatar
          kind="human"
          name={entry.member.name}
          login={entry.member.login}
          email={entry.member.email}
          imageUrl={entry.member.avatarUrl}
          size="sm"
        />
      ) : (
        <UserAvatar kind="human" name="Sem responsável" size="sm" />
      )}
      {canEdit ? (
        <TaskAssigneeSelect
          taskId={taskId}
          assigneeUserId={assigneeUserId}
          assigneeAgentIdentityId={assigneeAgentIdentityId}
          roster={roster}
          compact
        />
      ) : (
        <span className="rumo-card__assignee">{label}</span>
      )}
    </div>
  );
}

function LanceChecklistItem({
  packId,
  lance,
}: {
  packId: string;
  lance: ImplementationTaskRecord;
}) {
  const done = lanceIsComplete(lance.status);
  return (
    <li className="rumo-card__child">
      <span
        className={cn("rumo-card__child-check", done && "rumo-card__child-check--done")}
        aria-hidden
      />
      <span className="rumo-card__child-kind">Lance</span>
      <Link
        href={`/context-packs/${packId}/tasks/${lance.id}`}
        className={cn("rumo-card__child-title", done && "rumo-card__child-title--done")}
        title={lance.objective}
      >
        {lance.objective}
      </Link>
    </li>
  );
}

function ManobraKanbanCard({
  packId,
  task,
  roster,
  canEdit,
  children,
}: {
  packId: string;
  task: ImplementationTaskRecord;
  roster: WorkspaceRosterEntry[];
  canEdit: boolean;
  children: ImplementationTaskRecord[];
}) {
  const progress = lanceProgress(children);
  const visibleChildren = children.slice(0, LANCE_CHECKLIST_LIMIT);
  const hiddenCount = Math.max(0, children.length - LANCE_CHECKLIST_LIMIT);

  return (
    <article className="rumo-card rumo-card--kanban rumo-card--manobra">
      <header className="rumo-card__head">
        <div className="rumo-card__head-main">
          <span className="rumo-card__kind">Manobra</span>
          <BoardId number={task.boardNumber} />
          <Link href={`/context-packs/${packId}/tasks/${task.id}`} className="rumo-card__title">
            {task.objective}
          </Link>
        </div>
        {canEdit ? (
          <div className="rumo-card__head-end">
            <TaskDeleteButton
              taskId={task.id}
              label="Manobra"
              hasChildren={children.length > 0}
            />
          </div>
        ) : null}
      </header>

      <AssigneeRow
        taskId={task.id}
        assigneeUserId={task.assigneeUserId}
        assigneeAgentIdentityId={task.assigneeAgentIdentityId}
        roster={roster}
        canEdit={canEdit}
      />

      {task.leaseHolderUserId ? (
        <div className="rumo-card__kv">
          <span className="rumo-card__kv-label">Comando</span>
          <span className="rumo-card__kv-value rumo-card__lease">In progress</span>
        </div>
      ) : null}

      {children.length > 0 ? (
        <div className="rumo-card__lances">
          <div className="rumo-card__progress" aria-label="Progresso dos Lances">
            <span className="rumo-card__progress-icon" aria-hidden>
              ◫
            </span>
            <span className="rumo-card__progress-text">
              {progress.done}/{progress.total} lances
            </span>
          </div>
          <ul className="rumo-card__children">
            {visibleChildren.map((child) => (
              <LanceChecklistItem key={child.id} packId={packId} lance={child} />
            ))}
            {hiddenCount > 0 ? (
              <li className="rumo-card__children-more">+ {hiddenCount} lances</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {canEdit ? (
        <footer className="rumo-card__footer">
          <AddLanceControl packId={packId} parentTaskId={task.id} variant="kanban" />
        </footer>
      ) : null}
    </article>
  );
}

function LanceKanbanCard({
  packId,
  task,
  roster,
  canEdit,
}: {
  packId: string;
  task: ImplementationTaskRecord;
  roster: WorkspaceRosterEntry[];
  canEdit: boolean;
}) {
  return (
    <article className="rumo-card rumo-card--kanban rumo-card--lance">
      <header className="rumo-card__head">
        <div className="rumo-card__head-main">
          <span className="rumo-card__kind">Lance</span>
          <BoardId number={task.boardNumber} />
          <Link href={`/context-packs/${packId}/tasks/${task.id}`} className="rumo-card__title">
            {task.objective}
          </Link>
        </div>
        {canEdit ? (
          <div className="rumo-card__head-end">
            <TaskDeleteButton taskId={task.id} label="Lance" />
          </div>
        ) : null}
      </header>

      <AssigneeRow
        taskId={task.id}
        assigneeUserId={task.assigneeUserId}
        assigneeAgentIdentityId={task.assigneeAgentIdentityId}
        roster={roster}
        canEdit={canEdit}
      />

      {task.leaseHolderUserId ? (
        <div className="rumo-card__kv">
          <span className="rumo-card__kv-label">Comando</span>
          <span className="rumo-card__kv-value rumo-card__lease">In progress</span>
        </div>
      ) : null}
    </article>
  );
}

function ManobraLaneCell({
  packId,
  parentTask,
}: {
  packId: string;
  parentTask: ImplementationTaskRecord;
}) {
  return (
    <aside className="rumo-kanban__parent" aria-label="Manobra-pai">
      <span className="rumo-card__parent-kind">Manobra</span>
      <BoardId number={parentTask.boardNumber} />
      <Link
        href={`/context-packs/${packId}/tasks/${parentTask.id}`}
        className="rumo-card__parent-title"
        title={parentTask.objective}
      >
        {parentTask.objective}
      </Link>
    </aside>
  );
}

function ListTaskRow({
  packId,
  task,
  roster,
  canEdit,
  kind,
  hasChildren,
}: {
  packId: string;
  task: ImplementationTaskRecord;
  roster: WorkspaceRosterEntry[];
  canEdit: boolean;
  kind: "manobra" | "lance";
  hasChildren?: boolean;
}) {
  return (
    <div className={cn("rumo-task-row", kind === "lance" && "rumo-task-row--lance")}>
      <BoardId number={task.boardNumber} />
      <div className="rumo-task-row__main">
        {kind === "lance" ? <span className="rumo-task-row__kind">Lance</span> : null}
        <Link href={`/context-packs/${packId}/tasks/${task.id}`} className="rumo-task-row__title">
          {task.objective}
        </Link>
      </div>
      <div className="rumo-task-row__controls">
        <TaskStatusSelect taskId={task.id} status={task.status} canEdit={canEdit} />
        {canEdit ? (
          <TaskAssigneeSelect
            taskId={task.id}
            assigneeUserId={task.assigneeUserId}
            assigneeAgentIdentityId={task.assigneeAgentIdentityId}
            roster={roster}
          />
        ) : (
          <span className="rumo-task-row__assignee">
            {rosterLabel(roster, task.assigneeUserId, task.assigneeAgentIdentityId)}
          </span>
        )}
        {canEdit ? (
          <TaskDeleteButton
            taskId={task.id}
            label={kind === "lance" ? "Lance" : "Manobra"}
            hasChildren={hasChildren}
          />
        ) : null}
      </div>
    </div>
  );
}

function AddLanceControl({
  packId,
  parentTaskId,
  variant = "inline",
}: {
  packId: string;
  parentTaskId: string;
  variant?: "inline" | "kanban";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [objective, setObjective] = useState("");
  const [pending, start] = useTransition();
  const isKanban = variant === "kanban";
  const trimmedObjective = objective.trim();

  function closeForm() {
    setOpen(false);
    setObjective("");
  }

  if (!open) {
    return (
      <div className="rumo-lance-add">
        <button type="button" className="rumo-lance-add__trigger" onClick={() => setOpen(true)}>
          + Lance
        </button>
      </div>
    );
  }

  return (
    <form
      className={cn("rumo-lance-form", isKanban && "rumo-lance-form--kanban")}
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmedObjective) return;
        start(async () => {
          const result = await addImplementationTaskAction(packId, {
            objective: trimmedObjective,
            parentTaskId,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Lance criado");
            closeForm();
            router.refresh();
          }
        });
      }}
    >
      <div className={cn(isKanban && "rumo-lance-form__field")}>
        <label className="rumo-lance-form__label" htmlFor={`lance-${parentTaskId}`}>
          Objetivo do Lance
        </label>
        <Input
          id={`lance-${parentTaskId}`}
          name="lance"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="Descreva o objetivo"
          aria-label="Objetivo do Lance"
          className={isKanban ? "rumo-lance-form__input" : undefined}
          autoFocus
        />
      </div>
      <div className="rumo-lance-form__actions">
        <Button
          type="button"
          variant="ghost"
          className={isKanban ? "rumo-lance-form__cancel" : undefined}
          disabled={pending}
          onClick={closeForm}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={isKanban ? "default" : "outline"}
          className={isKanban ? "rumo-lance-form__submit" : undefined}
          disabled={pending || !trimmedObjective}
        >
          Criar
        </Button>
      </div>
    </form>
  );
}

export function RumoWorkBoard({
  packId,
  tasks,
  roster,
  canEdit,
  view,
}: {
  packId: string;
  tasks: ImplementationTaskRecord[];
  roster: WorkspaceRosterEntry[];
  canEdit: boolean;
  view: "lista" | "kanban";
}) {
  const [kanbanKind, setKanbanKind] = useState<"manobras" | "lances">("manobras");
  const trees = groupManobras(tasks);
  if (tasks.length === 0) {
    return <p className="dev-empty">Nenhuma Manobra ainda.{canEdit ? " Crie a primeira no topo." : ""}</p>;
  }

  if (view === "kanban") {
    const lanceLanes = kanbanLanceLanes(trees);

    return (
      <div className="rumo-kanban" role="region" aria-label="Quadro de trabalho">
        <div className="rumo-kanban__toolbar">
          <div className="rumo-kanban__kind-toggle" role="group" aria-label="Tipo de cartão">
            <Button
              type="button"
              variant={kanbanKind === "manobras" ? "default" : "outline"}
              onClick={() => setKanbanKind("manobras")}
            >
              Manobras
            </Button>
            <Button
              type="button"
              variant={kanbanKind === "lances" ? "default" : "outline"}
              onClick={() => setKanbanKind("lances")}
            >
              Lances
            </Button>
          </div>
        </div>
        {kanbanKind === "lances" ? (
          lanceLanes.length === 0 ? (
            <p className="dev-empty">Nenhum Lance neste Rumo.</p>
          ) : (
            <div className="rumo-kanban__board" role="table" aria-label="Quadro de Lances">
              <div className="rumo-kanban__head-row" role="row">
                <div className="rumo-kanban__parent-head" role="columnheader">
                  <p className="rumo-kanban__label">Manobra</p>
                </div>
                {KANBAN_COLUMNS.map((column) => (
                  <div key={column.id} className="rumo-kanban__head" role="columnheader">
                    <p className="rumo-kanban__label">{column.label}</p>
                    <span className="rumo-kanban__count">
                      {kanbanLanceCountForColumn(trees, column.id)}
                    </span>
                  </div>
                ))}
              </div>
              {lanceLanes.map((lane) => (
                <div key={lane.parent.id} className="rumo-kanban__lane" role="row">
                  <div className="rumo-kanban__parent-cell" role="cell">
                    <ManobraLaneCell packId={packId} parentTask={lane.parent} />
                  </div>
                  {KANBAN_COLUMNS.map((column) => {
                    const lances = lancesInColumn(lane.lances, column.id);
                    return (
                      <div
                        key={column.id}
                        className="rumo-kanban__cell"
                        role="cell"
                        aria-label={`${column.label} da Manobra #${lane.parent.boardNumber}`}
                      >
                        {lances.length === 0 ? null : (
                          <ul className="rumo-kanban__cards rumo-kanban__cards--lane">
                            {lances.map((task) => (
                              <li key={task.id}>
                                <LanceKanbanCard
                                  packId={packId}
                                  task={task}
                                  roster={roster}
                                  canEdit={canEdit}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="rumo-kanban__cols">
            {KANBAN_COLUMNS.map((column) => {
              const manobraCards = kanbanManobras(trees).filter(
                (task) => taskColumnId(task.status) === column.id,
              );

              return (
                <section key={column.id} className="rumo-kanban__col" aria-label={column.label}>
                  <header className="rumo-kanban__head">
                    <p className="rumo-kanban__label">{column.label}</p>
                    <span className="rumo-kanban__count">{manobraCards.length}</span>
                  </header>
                  <ul className="rumo-kanban__cards">
                    {manobraCards.length === 0 ? (
                      <li className="rumo-kanban__empty" aria-hidden>
                        Nenhuma Manobra nesta coluna.
                      </li>
                    ) : (
                      manobraCards.map((task) => {
                        const tree = manobraTreeById(trees, task.id);
                        return (
                          <li key={task.id}>
                            <ManobraKanbanCard
                              packId={packId}
                              task={task}
                              roster={roster}
                              canEdit={canEdit}
                              children={tree?.children ?? []}
                            />
                          </li>
                        );
                      })
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="rumo-task-tree">
      {trees.map((tree) => (
        <li key={tree.parent.id} className="rumo-task-tree__manobra">
          <ListTaskRow
            packId={packId}
            task={tree.parent}
            roster={roster}
            canEdit={canEdit}
            kind="manobra"
            hasChildren={tree.children.length > 0}
          />
          {tree.children.length > 0 || canEdit ? (
            <div
              className={cn(
                "rumo-task-tree__branch",
                tree.children.length === 0 && "rumo-task-tree__branch--empty",
              )}
            >
              {tree.children.length > 0 ? (
                <ul className="rumo-task-tree__lances">
                  {tree.children.map((child) => (
                    <li key={child.id}>
                      <ListTaskRow
                        packId={packId}
                        task={child}
                        roster={roster}
                        canEdit={canEdit}
                        kind="lance"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {canEdit ? <AddLanceControl packId={packId} parentTaskId={tree.parent.id} /> : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
