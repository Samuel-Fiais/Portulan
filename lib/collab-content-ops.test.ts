import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCollabEvent,
  type CollabEventDraft,
  type CollabEventRecord,
  type CollabEventStore,
} from "./collab-events.ts";
import {
  contextPackAcceptsContentOperation,
  parseCollabContentOpPayload,
  parseCollabContextPackDynamicField,
  planOptimisticContentWrite,
  validateCollabContentBaseVersion,
} from "./collab-content-ops.ts";

test("RN-120: baseVersion defasada recusa operação", () => {
  assert.deepEqual(planOptimisticContentWrite(3, 2), { action: "conflict" });
  assert.deepEqual(planOptimisticContentWrite(0, 0), { action: "write", nextVersion: 1 });
});

test("RN-99 / RN-120: Rumo aprovado recusa coedição; rascunho aceita recorte e itens", () => {
  assert.equal(contextPackAcceptsContentOperation("approved"), false);
  assert.equal(contextPackAcceptsContentOperation("draft"), true);
  assert.equal(parseCollabContentOpPayload({ field: "scope", value: "x" }, "context_pack").ok, true);
  const itemField = "item.550e8400-e29b-41d4-a716-446655440000.body";
  assert.deepEqual(parseCollabContextPackDynamicField(itemField), {
    kind: "item",
    itemId: "550e8400-e29b-41d4-a716-446655440000",
  });
  assert.equal(parseCollabContentOpPayload({ field: itemField, value: "texto" }, "context_pack").ok, true);
  assert.equal(
    parseCollabContentOpPayload({ field: "summary", value: "plano" }, "implementation_plan").ok,
    true,
  );
});

test("RN-120: operação de carta valida campo e baseVersion", () => {
  assert.equal(validateCollabContentBaseVersion(null).ok, false);
  assert.equal(parseCollabContentOpPayload({ field: "content", value: "x" }, "document").ok, true);
  assert.equal(parseCollabContentOpPayload({ field: "name", value: "x" }, "template").ok, false);
  assert.equal(parseCollabContentOpPayload({ field: "content", value: "x" }, "template").ok, true);
});

test("RN-125: reaplicar opId idempotente não avança versão lógica", async () => {
  const store = createMemoryEventStore();
  let contentVersion = 0;

  async function applyOp(opId: string, baseVersion: number, value: string) {
    const known = await store.findByIdempotencyKey("room-1", opId);
    if (known) return { deduplicated: true, contentVersion, event: known };

    const plan = planOptimisticContentWrite(contentVersion, baseVersion);
    if (plan.action === "conflict") {
      throw new Error("conflict");
    }
    contentVersion = plan.nextVersion;
    const event = (
      await appendCollabEvent(store, draft(opId, baseVersion, { field: "content", valueLength: value.length }))
    ).event;
    return { deduplicated: false, contentVersion, event };
  }

  const first = await applyOp("op-aaaa-bbbb", 0, "A");
  const retry = await applyOp("op-aaaa-bbbb", 0, "A");
  assert.equal(first.deduplicated, false);
  assert.equal(retry.deduplicated, true);
  assert.equal(contentVersion, 1);
  assert.equal(first.event.id, retry.event.id);
});

test("RN-124: duas operações concorrentes na mesma base — uma vence, a outra conflita", async () => {
  const store = createMemoryEventStore();
  let contentVersion = 0;

  async function tryApply(opId: string, baseVersion: number) {
    const known = await store.findByIdempotencyKey("room-1", opId);
    if (known) return { ok: true as const, deduplicated: true, contentVersion };

    const plan = planOptimisticContentWrite(contentVersion, baseVersion);
    if (plan.action === "conflict") return { ok: false as const, reason: "conflict" as const };

    contentVersion = plan.nextVersion;
    await appendCollabEvent(store, draft(opId, baseVersion, { field: "content", valueLength: 1 }));
    return { ok: true as const, deduplicated: false, contentVersion };
  }

  const results = await Promise.all([tryApply("op-one-11111111", 0), tryApply("op-two-22222222", 0)]);
  const ok = results.filter((item) => item.ok && !item.deduplicated);
  const conflicts = results.filter((item) => !item.ok);
  assert.equal(ok.length, 1);
  assert.equal(conflicts.length, 1);
  assert.equal(contentVersion, 1);
});

function draft(
  idempotencyKey: string,
  baseVersion: number,
  payload: Record<string, unknown>,
): CollabEventDraft {
  return {
    roomId: "room-1",
    workspaceId: "ws-1",
    type: "content.operation",
    actor: { userId: "user-1" },
    baseVersion,
    payload,
    idempotencyKey,
  };
}

function createMemoryEventStore(): CollabEventStore {
  const events: CollabEventRecord[] = [];

  return {
    async findByIdempotencyKey(roomId, idempotencyKey) {
      return (
        events.find((event) => event.roomId === roomId && event.idempotencyKey === idempotencyKey) ??
        null
      );
    },
    async latestSeq(roomId) {
      const roomEvents = events.filter((event) => event.roomId === roomId);
      return roomEvents.length > 0 ? roomEvents[roomEvents.length - 1].seq : null;
    },
    async insert(row) {
      if (events.some((event) => event.roomId === row.roomId && event.idempotencyKey === row.idempotencyKey)) {
        return null;
      }
      const seq = row.seq;
      if (events.some((event) => event.roomId === row.roomId && event.seq === seq)) {
        return null;
      }
      const event: CollabEventRecord = {
        id: `evt-${events.length + 1}`,
        roomId: row.roomId,
        workspaceId: row.workspaceId,
        seq: row.seq,
        type: row.type,
        userId: row.userId,
        agentIdentityId: row.agentIdentityId,
        mcpTokenId: row.mcpTokenId,
        intention: row.intention,
        baseVersion: row.baseVersion,
        payload: row.payload,
        idempotencyKey: row.idempotencyKey,
        createdAt: new Date(0).toISOString(),
      };
      events.push(event);
      return event;
    },
    async listSince(roomId, cursor) {
      return events.filter((event) => event.roomId === roomId && event.seq > cursor.afterSeq);
    },
  };
}
