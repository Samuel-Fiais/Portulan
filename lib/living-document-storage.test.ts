import assert from "node:assert/strict";
import test from "node:test";
import { checklistItemFingerprint, livingDocumentStorageKey } from "./living-document-storage.ts";

test("livingDocumentStorageKey prefixa a chave do documento", () => {
  assert.equal(livingDocumentStorageKey("rel-123"), "portulan-living:rel-123");
});

test("checklistItemFingerprint é estável para o mesmo título", () => {
  const first = checklistItemFingerprint(0, 2, "Validar em produção");
  const second = checklistItemFingerprint(0, 2, "Validar em produção");
  assert.equal(first, second);
  assert.notEqual(first, checklistItemFingerprint(0, 3, "Validar em produção"));
});
