import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCollabContentSnapshot,
  collabSnapshotFieldValue,
  isCollabDocumentOpField,
} from "./collab-content-client.ts";

test("applyCollabContentSnapshot atualiza versão e campos conhecidos", () => {
  const doc = {
    draftVersion: 2,
    title: "Local",
    summary: "Resumo local",
    content: "Corpo local",
    status: "draft" as const,
  };
  const next = applyCollabContentSnapshot(doc, {
    contentVersion: 5,
    fields: { title: "Servidor", content: "Corpo servidor" },
  });
  assert.equal(next.draftVersion, 5);
  assert.equal(next.title, "Servidor");
  assert.equal(next.summary, "Resumo local");
  assert.equal(next.content, "Corpo servidor");
  assert.equal(next.status, "draft");
});

test("isCollabDocumentOpField reconhece campos de carta", () => {
  assert.equal(isCollabDocumentOpField("title"), true);
  assert.equal(isCollabDocumentOpField("author"), false);
});

test("collabSnapshotFieldValue lê campo do snapshot", () => {
  assert.equal(
    collabSnapshotFieldValue({ contentVersion: 1, fields: { summary: "x" } }, "summary"),
    "x",
  );
  assert.equal(
    collabSnapshotFieldValue({ contentVersion: 1, fields: {} }, "content"),
    undefined,
  );
});
