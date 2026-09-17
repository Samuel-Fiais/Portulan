import assert from "node:assert/strict";
import test from "node:test";
import {
  appendCollabEvent,
  collabEventRequiresOperate,
  CollabEventRejected,
  COLLAB_PAGE_LIMIT_MAX,
  isCollabClientEventType,
  nextCollabSeq,
  parseCollabCursor,
  readCollabEventsSince,
  sanitizeCollabPayload,
  validateCollabEvent,
  type CollabEventDraft,
  type CollabEventInsert,
  type CollabEventRecord,
  type CollabEventStore,
} from "./collab-events.ts";

type MemoryStore = CollabEventStore & { rows: CollabEventRecord[] };

type MemoryStoreHooks = {
  beforeInsert?: (row: CollabEventInsert, store: MemoryStore) => void;
  /** Cede o turno entre ler a posição e gravar, para que appends concorrentes disputem o mesmo `seq`. */
  yieldBeforeInsert?: boolean;
  /** Devolve o log fora de ordem, para provar que a ordenação é garantida na leitura. */
  shuffleListing?: boolean;
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Espelha as travas do Postgres: UNIQUE (room_id, seq) e UNIQUE (room_id, idempotency_key). */
function createMemoryStore(hooks?: MemoryStoreHooks): MemoryStore {
  const rows: CollabEventRecord[] = [];
  let inserted = 0;

  const store: MemoryStore = {
    rows,
    async findByIdempotencyKey(roomId, idempotencyKey) {
      return rows.find((row) => row.roomId === roomId && row.idempotencyKey === idempotencyKey) ?? null;
    },
    async latestSeq(roomId) {
      const seqs = rows.filter((row) => row.roomId === roomId).map((row) => row.seq);
      if (hooks?.yieldBeforeInsert) await tick();
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
    async listSince(roomId, cursor) {
      const page = rows
        .filter((row) => row.roomId === roomId && row.seq > cursor.afterSeq)
        .sort((left, right) => left.seq - right.seq)
        .slice(0, cursor.limit);
      return hooks?.shuffleListing ? page.slice().reverse() : page;
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

test("RN-125: publicar a mesma chave em paralelo grava uma linha só", async () => {
  const store = createMemoryStore({ yieldBeforeInsert: true });

  const results = await Promise.all(
    Array.from({ length: 4 }, () => appendCollabEvent(store, draft({ payload: { cursor: 3 } }))),
  );

  assert.equal(store.rows.length, 1, "a chave repetida não abre segunda linha");
  const seqs = new Set(results.map((result) => result.event.seq));
  const ids = new Set(results.map((result) => result.event.id));
  assert.deepEqual([...seqs], [1], "todas as respostas apontam para a mesma posição");
  assert.equal(ids.size, 1, "todas as respostas apontam para o mesmo evento");
  assert.equal(results.filter((result) => !result.deduplicated).length, 1);
});

test("RN-124: appends concorrentes ocupam posições únicas e crescentes, sem sobrescrever", async () => {
  const store = createMemoryStore({ yieldBeforeInsert: true });
  const total = 5;

  const results = await Promise.all(
    Array.from({ length: total }, (_, index) =>
      appendCollabEvent(store, draft({ idempotencyKey: `op-paralelo-${index}` })),
    ),
  );

  const seqs = results.map((result) => result.event.seq).sort((left, right) => left - right);
  assert.deepEqual(seqs, [1, 2, 3, 4, 5], "cada append ficou com uma posição própria");
  assert.equal(new Set(seqs).size, total);
  assert.equal(store.rows.length, total, "nenhum evento foi perdido nem sobrescrito");
  assert.equal(results.every((result) => !result.deduplicated), true);
  assert.equal(new Set(store.rows.map((row) => row.idempotencyKey)).size, total);
});

test("RN-124: reconexão a partir de um `seq` devolve só o que veio depois, em ordem", async () => {
  const store = createMemoryStore();
  for (let index = 1; index <= 6; index += 1) {
    await appendCollabEvent(store, draft({ idempotencyKey: `op-reconexao-${index}` }));
  }

  const desdeOZero = await readCollabEventsSince(store, "room-1", { afterSeq: 0, limit: 100 });
  assert.deepEqual(desdeOZero.events.map((event) => event.seq), [1, 2, 3, 4, 5, 6]);
  assert.equal(desdeOZero.latestSeq, 6);
  assert.equal(desdeOZero.nextSince, 6);
  assert.equal(desdeOZero.hasMore, false);

  const desdeOQuarto = await readCollabEventsSince(store, "room-1", { afterSeq: 4, limit: 100 });
  assert.deepEqual(desdeOQuarto.events.map((event) => event.seq), [5, 6]);
  assert.equal(desdeOQuarto.nextSince, 6);
  assert.equal(desdeOQuarto.hasMore, false);

  const naPonta = await readCollabEventsSince(store, "room-1", { afterSeq: 6, limit: 100 });
  assert.deepEqual(naPonta.events, [], "quem já está na ponta não recebe repetição");
  assert.equal(naPonta.nextSince, 6);
  assert.equal(naPonta.hasMore, false);
});

test("RN-124: a leitura paginada indica que falta mais e por onde retomar", async () => {
  const store = createMemoryStore();
  for (let index = 1; index <= 5; index += 1) {
    await appendCollabEvent(store, draft({ idempotencyKey: `op-pagina-${index}` }));
  }

  const primeira = await readCollabEventsSince(store, "room-1", { afterSeq: 0, limit: 2 });
  assert.deepEqual(primeira.events.map((event) => event.seq), [1, 2]);
  assert.equal(primeira.latestSeq, 5);
  assert.equal(primeira.nextSince, 2);
  assert.equal(primeira.hasMore, true);

  const segunda = await readCollabEventsSince(store, "room-1", { afterSeq: primeira.nextSince, limit: 2 });
  assert.deepEqual(segunda.events.map((event) => event.seq), [3, 4]);
  assert.equal(segunda.hasMore, true);
});

test("RN-124: a ordem crescente é garantida na leitura, não pela persistência", async () => {
  const store = createMemoryStore({ shuffleListing: true });
  for (let index = 1; index <= 4; index += 1) {
    await appendCollabEvent(store, draft({ idempotencyKey: `op-fora-de-ordem-${index}` }));
  }

  const page = await readCollabEventsSince(store, "room-1", { afterSeq: 1, limit: 100 });
  assert.deepEqual(page.events.map((event) => event.seq), [2, 3, 4]);
});

test("a sala lida é só a pedida: log de outra sala não entra na página", async () => {
  const store = createMemoryStore();
  await appendCollabEvent(store, draft({ idempotencyKey: "op-da-sala-um" }));
  await appendCollabEvent(store, draft({ roomId: "room-2", idempotencyKey: "op-da-sala-dois" }));

  const page = await readCollabEventsSince(store, "room-1", { afterSeq: 0, limit: 100 });
  assert.deepEqual(page.events.map((event) => event.roomId), ["room-1"]);
  assert.equal(page.latestSeq, 1);
});

test("a posição de retomada e o lote são validados antes de ler a sala", () => {
  assert.deepEqual(parseCollabCursor({}), { ok: true, cursor: { afterSeq: 0, limit: 100 } });
  assert.deepEqual(parseCollabCursor({ since: "12", limit: "5" }), {
    ok: true,
    cursor: { afterSeq: 12, limit: 5 },
  });
  assert.equal(parseCollabCursor({ since: "-1" }).ok, false);
  assert.equal(parseCollabCursor({ since: "3.5" }).ok, false);
  assert.equal(parseCollabCursor({ since: "ontem" }).ok, false);
  assert.equal(parseCollabCursor({ limit: "0" }).ok, false);
  assert.equal(parseCollabCursor({ limit: String(COLLAB_PAGE_LIMIT_MAX + 1) }).ok, false);
  assert.equal(parseCollabCursor({ limit: String(COLLAB_PAGE_LIMIT_MAX) }).ok, true);
});

test("RN-120: cliente publica presença e operação; comando atômico é anúncio do servidor", () => {
  assert.equal(isCollabClientEventType("presence.joined"), true);
  assert.equal(isCollabClientEventType("content.operation"), true);
  assert.equal(isCollabClientEventType("content.saved"), true);
  assert.equal(isCollabClientEventType("command.applied"), false);
  assert.equal(isCollabClientEventType("room.closed"), false);

  assert.equal(collabEventRequiresOperate("content.operation"), true);
  assert.equal(collabEventRequiresOperate("content.saved"), true);
  assert.equal(collabEventRequiresOperate("presence.updated"), false);
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
