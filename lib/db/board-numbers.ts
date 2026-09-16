import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { parseBoardLocator } from "@/lib/board-locator";
import { getDb } from "@/lib/db/client";
import {
  acceptanceCriteria,
  contextPackItems,
  contextPackSources,
  contextPacks,
  implementationTaskSources,
  coordinationMessages,
  coordinationThreads,
  implementationTasks,
  workspaceBoardCounters,
  workspaceBoardRefs,
} from "@/lib/db/schema";

export const boardRefKinds = [
  "pack",
  "task",
  "item",
  "source",
  "criterion",
  "thread",
  "message",
] as const;
export type BoardRefKind = (typeof boardRefKinds)[number];

export type BoardRef = {
  workspaceId: string;
  boardNumber: number;
  kind: BoardRefKind;
  targetId: string;
};

export { parseBoardLocator } from "@/lib/board-locator";

async function nextBoardNumber(workspaceId: string): Promise<number> {
  const db = await getDb();
  const [counter] = await db
    .insert(workspaceBoardCounters)
    .values({ workspaceId, nextValue: 2 })
    .onConflictDoUpdate({
      target: workspaceBoardCounters.workspaceId,
      set: { nextValue: sql`${workspaceBoardCounters.nextValue} + 1` },
    })
    .returning({ nextValue: workspaceBoardCounters.nextValue });
  if (counter?.nextValue) return counter.nextValue - 1;
  const [maxRow] = await db
    .select({ boardNumber: sql<number>`coalesce(max(${workspaceBoardRefs.boardNumber}), 0)` })
    .from(workspaceBoardRefs)
    .where(eq(workspaceBoardRefs.workspaceId, workspaceId));
  return Number(maxRow?.boardNumber ?? 0) + 1;
}

export async function allocateBoardNumber(input: {
  workspaceId: string;
  kind: BoardRefKind;
  targetId: string;
}): Promise<number> {
  const db = await getDb();
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const boardNumber = await nextBoardNumber(input.workspaceId);
    const [inserted] = await db
      .insert(workspaceBoardRefs)
      .values({
        workspaceId: input.workspaceId,
        boardNumber,
        kind: input.kind,
        targetId: input.targetId,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) return boardNumber;
  }
  const [maxRow] = await db
    .select({ boardNumber: sql<number>`coalesce(max(${workspaceBoardRefs.boardNumber}), 0)` })
    .from(workspaceBoardRefs)
    .where(eq(workspaceBoardRefs.workspaceId, input.workspaceId));
  const boardNumber = Number(maxRow?.boardNumber ?? 0) + 1;
  await db.insert(workspaceBoardRefs).values({
    workspaceId: input.workspaceId,
    boardNumber,
    kind: input.kind,
    targetId: input.targetId,
  });
  return boardNumber;
}

export async function assignExistingBoardNumber(input: {
  workspaceId: string;
  boardNumber: number;
  kind: BoardRefKind;
  targetId: string;
}) {
  const db = await getDb();
  await db
    .insert(workspaceBoardRefs)
    .values({
      workspaceId: input.workspaceId,
      boardNumber: input.boardNumber,
      kind: input.kind,
      targetId: input.targetId,
    })
    .onConflictDoUpdate({
      target: [workspaceBoardRefs.workspaceId, workspaceBoardRefs.boardNumber],
      set: { targetId: input.targetId, kind: input.kind },
    });
}

export async function resolveBoardRef(
  workspaceId: string,
  locator: string,
): Promise<BoardRef | null> {
  const parsed = parseBoardLocator(locator);
  if (!parsed) return null;
  if ("uuid" in parsed) {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(workspaceBoardRefs)
      .where(
        and(eq(workspaceBoardRefs.workspaceId, workspaceId), eq(workspaceBoardRefs.targetId, parsed.uuid)),
      )
      .limit(1);
    if (!row) return { workspaceId, boardNumber: 0, kind: "pack", targetId: parsed.uuid };
    return {
      workspaceId: row.workspaceId,
      boardNumber: row.boardNumber,
      kind: row.kind as BoardRefKind,
      targetId: row.targetId,
    };
  }
  const db = await getDb();
  const [row] = await db
    .select()
    .from(workspaceBoardRefs)
    .where(
      and(
        eq(workspaceBoardRefs.workspaceId, workspaceId),
        eq(workspaceBoardRefs.boardNumber, parsed.boardNumber),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    workspaceId: row.workspaceId,
    boardNumber: row.boardNumber,
    kind: row.kind as BoardRefKind,
    targetId: row.targetId,
  };
}

export async function resolveBoardId(
  workspaceId: string,
  locator: string,
  kind?: BoardRefKind,
): Promise<string | null> {
  const parsed = parseBoardLocator(locator);
  if (!parsed) return null;
  if ("uuid" in parsed) return parsed.uuid;
  const ref = await resolveBoardRef(workspaceId, locator);
  if (!ref) return null;
  if (kind && ref.kind !== kind) return null;
  return ref.targetId;
}

async function stamp(
  table:
    | typeof contextPacks
    | typeof implementationTasks
    | typeof contextPackItems
    | typeof contextPackSources
    | typeof implementationTaskSources
    | typeof acceptanceCriteria
    | typeof coordinationThreads
    | typeof coordinationMessages,
  id: string,
  boardNumber: number,
  idColumn: "id",
) {
  const db = await getDb();
  await db.update(table).set({ boardNumber }).where(eq(table[idColumn], id));
}

export async function ensureRowBoardNumbers<R extends { id: string; workspaceId: string; boardNumber: number }>(
  rows: R[],
  kind: BoardRefKind,
): Promise<R[]> {
  if (rows.length === 0) return rows;
  const stamped: R[] = [];
  for (const row of rows) {
    const boardNumber = await ensureEntityBoardNumber({
      workspaceId: row.workspaceId,
      kind,
      targetId: row.id,
      current: row.boardNumber,
    });
    stamped.push({ ...row, boardNumber });
  }
  return stamped;
}

async function stampKind(kind: BoardRefKind, targetId: string, boardNumber: number) {
  if (kind === "pack") await stamp(contextPacks, targetId, boardNumber, "id");
  if (kind === "task") await stamp(implementationTasks, targetId, boardNumber, "id");
  if (kind === "item") await stamp(contextPackItems, targetId, boardNumber, "id");
  if (kind === "source") {
    const db = await getDb();
    const [packSource] = await db
      .select({ id: contextPackSources.id })
      .from(contextPackSources)
      .where(eq(contextPackSources.id, targetId))
      .limit(1);
    if (packSource) await stamp(contextPackSources, targetId, boardNumber, "id");
    else await stamp(implementationTaskSources, targetId, boardNumber, "id");
  }
  if (kind === "criterion") await stamp(acceptanceCriteria, targetId, boardNumber, "id");
  if (kind === "thread") await stamp(coordinationThreads, targetId, boardNumber, "id");
  if (kind === "message") await stamp(coordinationMessages, targetId, boardNumber, "id");
}

export async function ensureEntityBoardNumber(input: {
  workspaceId: string;
  kind: BoardRefKind;
  targetId: string;
  current?: number | null;
}): Promise<number> {
  const db = await getDb();
  const [byTarget] = await db
    .select()
    .from(workspaceBoardRefs)
    .where(
      and(
        eq(workspaceBoardRefs.workspaceId, input.workspaceId),
        eq(workspaceBoardRefs.kind, input.kind),
        eq(workspaceBoardRefs.targetId, input.targetId),
      ),
    )
    .limit(1);
  if (byTarget) {
    const collisions = await db
      .select()
      .from(workspaceBoardRefs)
      .where(
        and(
          eq(workspaceBoardRefs.workspaceId, input.workspaceId),
          eq(workspaceBoardRefs.boardNumber, byTarget.boardNumber),
        ),
      );
    const foreign = collisions.find((row) => row.kind !== input.kind && row.targetId !== input.targetId);
    if (foreign) {
      await db
        .delete(workspaceBoardRefs)
        .where(
          and(
            eq(workspaceBoardRefs.workspaceId, input.workspaceId),
            eq(workspaceBoardRefs.kind, input.kind),
            eq(workspaceBoardRefs.targetId, input.targetId),
          ),
        );
    } else {
      if (input.current !== byTarget.boardNumber) await stampKind(input.kind, input.targetId, byTarget.boardNumber);
      return byTarget.boardNumber;
    }
  }
  if (input.current && input.current > 0) {
    const [byNumber] = await db
      .select()
      .from(workspaceBoardRefs)
      .where(
        and(
          eq(workspaceBoardRefs.workspaceId, input.workspaceId),
          eq(workspaceBoardRefs.boardNumber, input.current),
        ),
      )
      .limit(1);
    if (!byNumber) {
      await db.insert(workspaceBoardRefs).values({
        workspaceId: input.workspaceId,
        boardNumber: input.current,
        kind: input.kind,
        targetId: input.targetId,
      });
      return input.current;
    }
    if (byNumber.targetId === input.targetId || byNumber.kind === input.kind) {
      return input.current;
    }
  }
  const number = await allocateBoardNumber(input);
  await stampKind(input.kind, input.targetId, number);
  return number;
}

export async function backfillWorkspaceBoardNumbers(workspaceId?: string) {
  const db = await getDb();
  const packs = await db.select().from(contextPacks);
  const items = await db.select().from(contextPackItems);
  const sources = await db.select().from(contextPackSources);
  const taskSources = await db.select().from(implementationTaskSources);
  const criteria = await db.select().from(acceptanceCriteria);
  const tasks = await db.select().from(implementationTasks);
  const threads = await db.select().from(coordinationThreads);
  const messages = await db.select().from(coordinationMessages);

  type Pending = {
    workspaceId: string;
    kind: BoardRefKind;
    targetId: string;
    createdAt: string;
    current: number;
  };
  const pending: Pending[] = [];
  const push = (row: { workspaceId: string; id: string; boardNumber: number; createdAt: string }, kind: BoardRefKind) => {
    if (workspaceId && row.workspaceId !== workspaceId) return;
    pending.push({
      workspaceId: row.workspaceId,
      kind,
      targetId: row.id,
      createdAt: row.createdAt,
      current: row.boardNumber,
    });
  };
  for (const row of packs) push(row, "pack");
  for (const row of items) push(row, "item");
  for (const row of sources) push(row, "source");
  for (const row of taskSources) push(row, "source");
  for (const row of criteria) push(row, "criterion");
  for (const row of tasks) push(row, "task");
  for (const row of threads) push(row, "thread");
  for (const row of messages) push(row, "message");
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const item of pending) {
    await ensureEntityBoardNumber(item);
  }
}
