import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterCommentThreads,
  groupCommentThreads,
  isThreadResolved,
  resolveThreadRootId,
  threadCommentCount,
} from "./comment-threads.ts";
import type { DocumentCommentRecord } from "./documents.ts";

function comment(partial: Partial<DocumentCommentRecord> & Pick<DocumentCommentRecord, "id">): DocumentCommentRecord {
  return {
    documentId: "doc-1",
    userId: "user-1",
    body: "ok",
    sectionAnchor: null,
    quotedText: null,
    parentId: null,
    resolvedAt: null,
    createdAt: "2026-09-11T12:00:00.000Z",
    userLogin: "ana",
    userName: "Ana",
    userAvatarUrl: null,
    ...partial,
  };
}

test("groupCommentThreads agrupa respostas no raiz", () => {
  const root = comment({ id: "root" });
  const reply = comment({ id: "reply", parentId: "root", body: "concordo" });
  const other = comment({ id: "other", body: "outro fio" });

  const threads = groupCommentThreads([root, reply, other]);
  assert.equal(threads.length, 2);
  assert.deepEqual(threads[0]?.replies.map((item) => item.id), ["reply"]);
  assert.equal(threadCommentCount(threads[0]!), 2);
  assert.equal(threads[1]?.replies.length, 0);
});

test("dois comentários-raiz no mesmo bloco continuam fios separados", () => {
  const left = comment({ id: "left", sectionAnchor: "block-1-0", quotedText: "Acumulado de vendas avulsas" });
  const right = comment({ id: "right", sectionAnchor: "block-1-0", quotedText: "tbl_4508b12d" });
  const threads = groupCommentThreads([left, right]);
  assert.equal(threads.length, 2);
  assert.equal(threads[0]?.root.quotedText, "Acumulado de vendas avulsas");
  assert.equal(threads[1]?.root.quotedText, "tbl_4508b12d");
});

test("resolveThreadRootId achata resposta de resposta", () => {
  assert.equal(resolveThreadRootId({ id: "root", parentId: null }), "root");
  assert.equal(resolveThreadRootId({ id: "reply", parentId: "root" }), "root");
});

test("filterCommentThreads separa abertos e resolvidos", () => {
  const open = comment({ id: "open" });
  const resolved = comment({ id: "resolved", resolvedAt: "2026-09-11T13:00:00.000Z" });
  const threads = groupCommentThreads([open, resolved]);

  assert.equal(isThreadResolved(threads[1]!), true);
  assert.equal(filterCommentThreads(threads, "open").length, 1);
  assert.equal(filterCommentThreads(threads, "resolved")[0]?.root.id, "resolved");
  assert.equal(filterCommentThreads(threads, "all").length, 2);
});
