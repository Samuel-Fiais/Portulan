import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCollabEvent,
  CollabEventRejected,
  nextCollabSeq,
  sanitizeCollabPayload,
  validateCollabEvent,
  type CollabEventDraft,
  type CollabEventInsert,
  type CollabEventRecord,
  type CollabEventStore,
} from "./collab-events.ts";

type MemoryStore = CollabEventStore & { rows: CollabEventRecord[] };

/** Espelha as travas do Postgres: UNIQUE (room_id, seq) e UNIQUE (room_id, idempotency_key). */
function createMemoryStore(hooks?: { beforeInsert?: (row: CollabEventInsert, store: MemoryStore) => void }): MemoryStore {
  const rows: CollabEventRecord[] = [];
  let inserted = 0;

  const store: MemoryStore = {
    rows,
    async findByIdempotencyKey(roomId, idempotencyKey) {
      return rows.find((row) => row.roomId === roomId && row.idempotencyKey === idempotencyKey) ?? null;
    },
    async latestSeq(roomId) {
      const seqs = rows.filter((row) => row.roomId === roomId).map((row) => row.seq);
      return seqs.length > 0 ? Math.max(...seqs) : null;
    },
    async insert(row) {
      hooks?.beforeInsert?.(row, store);
      const clash = rows.some(
        (existing) =>
          existing.roomId === row.roomId &&
          (existing.seq === row.seq || existing.idempotencyKey === row.idempotencyKey),
      );
      if (clash) return null;
      inserted += 1;
      const record: CollabEventRecord = {
        ...row,
        id: `event-${inserted}`,
        createdAt: new Date(Date.UTC(2026, 8, 17, 0, 0, inserted)).toISOString(),
      };
      rows.push(record);
      return record;
    },
  };

  return store;
}

function draft(overrides: Partial<CollabEventDraft> = {}): CollabEventDraft {
  return {
    roomId: "room-1",
    workspaceId: "ws-1",
    type: "content.operation",
    actor: { userId: "user-1" },
    idempotencyKey: "op-0001-aaaa",
    ...overrides,
  };
}

test("RN-120: repetir a chave de idempotência devolve o mesmo evento, sem segunda linha", async () => {
  const store = createMemoryStore();

  const first = await appendCollabEvent(store, draft());
  const again = await appendCollabEvent(store, draft({ payload: { cursor: 12 } }));

  assert.equal(first.deduplicated, false);
  assert.equal(again.deduplicated, true);
  assert.equal(again.event.id, first.event.id);
  assert.equal(again.event.seq, first.event.seq);
  assert.equal(store.rows.length, 1);
});

test("a chave de idempotência é única por sala, não por porto", async () => {
  const store = createMemoryStore();

  const first = await appendCollabEvent(store, draft());
  const other = await appendCollabEvent(store, draft({ roomId: "room-2" }));

  assert.equal(other.deduplicated, false);
  assert.notEqual(other.event.id, first.event.id);
  assert.equal(other.event.seq, 1, "cada sala tem a própria sequência");
  assert.equal(store.rows.length, 2);
});

test("RN-124: seq cresce de um em um dentro da sala", async () => {
  const store = createMemoryStore();

  const seqs: number[] = [];
  for (let index = 1; index <= 4; index += 1) {
    const result = await appendCollabEvent(store, draft({ idempotencyKey: `op-000${index}-bbbb` }));
    seqs.push(result.event.seq);
  }

  assert.deepEqual(seqs, [1, 2, 3, 4]);
  assert.equal(nextCollabSeq(4), 5);
  assert.equal(nextCollabSeq(null), 1);
  assert.equal(nextCollabSeq(0), 1);
});

test("RN-124: corrida na mesma posição vai para a seguinte em vez de sobrescrever", async () => {
  let racedOnce = false;
  const store = createMemoryStore({
    beforeInsert(row, memory) {
      if (racedOnce || row.seq !== 1) return;
      racedOnce = true;
      memory.rows.push({
        id: "event-outro",
        roomId: row.roomId,
        workspaceId: row.workspaceId,
        seq: 1,
        type: "content.operation",
        userId: "user-2",
        agentIdentityId: null,
        mcpTokenId: null,
        intention: null,
        baseVersion: null,
        payload: null,
        idempotencyKey: "op-de-outro-cliente",
        createdAt: new Date(Date.UTC(2026, 8, 17, 0, 0, 0)).toISOString(),
      });
    },
  });

  const result = await appendCollabEvent(store, draft());

  assert.equal(racedOnce, true);
  assert.equal(result.deduplicated, false);
  assert.equal(result.event.seq, 2);
  assert.equal(store.rows.length, 2);
  assert.equal(store.rows.filter((row) => row.seq === 1).length, 1);
});

test("evento sem responsável, com tipo desconhecido ou chave curta é recusado", async () => {
  const store = createMemoryStore();

  assert.equal(validateCollabEvent(draft({ actor: { userId: null } })).ok, false);
  assert.equal(validateCollabEvent(draft({ idempotencyKey: "curta" })).ok, false);
  assert.equal(
    validateCollabEvent(draft({ type: "content.publicado" as CollabEventDraft["type"] })).ok,
    false,
  );
  assert.equal(validateCollabEvent(draft({ baseVersion: -1 })).ok, false);
  assert.equal(validateCollabEvent(draft({ actor: { userId: null, agentIdentityId: "agent-1" } })).ok, true);

  await assert.rejects(
    () => appendCollabEvent(store, draft({ actor: { userId: null } })),
    CollabEventRejected,
  );
  assert.equal(store.rows.length, 0);
});

test("RN-122: payload de evento não leva token, segredo nem Markdown integral", () => {
  const payload = sanitizeCollabPayload({
    token: "ptl_secreto",
    authorization: "Bearer ptl_secreto",
    sessionKey: "ptl_abc",
    content: "# Carta\n".repeat(500),
    markdown: "## Seção",
    summary: "x".repeat(500),
    section: "visao-geral",
    baseVersion: 7,
    editing: true,
  });

  assert.ok(payload);
  assert.equal("token" in payload, false);
  assert.equal("authorization" in payload, false);
  assert.equal("sessionKey" in payload, false);
  assert.deepEqual(payload.content, { omitted: "content", length: "# Carta\n".repeat(500).length });
  assert.deepEqual(payload.markdown, { omitted: "content", length: "## Seção".length });
  assert.deepEqual(payload.summary, { omitted: "text", length: 500 });
  assert.equal(payload.section, "visao-geral");
  assert.equal(payload.baseVersion, 7);
  assert.equal(payload.editing, true);
  assert.equal(sanitizeCollabPayload(null), null);
});

test("RN-122: o log gravado já sai redigido", async () => {
  const store = createMemoryStore();

  const result = await appendCollabEvent(
    store,
    draft({ payload: { content: "conteúdo inteiro da carta", section: "capa" } }),
  );

  assert.deepEqual(result.event.payload, {
    content: { omitted: "content", length: "conteúdo inteiro da carta".length },
    section: "capa",
  });
});
