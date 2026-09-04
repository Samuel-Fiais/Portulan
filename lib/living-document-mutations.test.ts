import assert from "node:assert/strict";
import test from "node:test";
import { checklistItemFingerprint } from "./living-document-storage.ts";
import {
  applyLivingDocumentMutation,
  checklistFingerprintExists,
  parseTestcaseStatus,
  testcaseIdExists,
  toggleChecklistItemInMarkdown,
  updateTestcaseStatusInMarkdown,
} from "./living-document-mutations.ts";

const SAMPLE = `## 01 — QA

:::checklist
- [ ] Validar limite semanal | Rafael · sexta
- [x] Conferir estoque | concluído
:::

:::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal disponível"}
**Pré-condição:** conta ativa

**Passos:** consultar API

**Resultado esperado:** 200 OK
:::
`;

test("toggleChecklistItemInMarkdown altera apenas o item correto", () => {
  const fingerprint = checklistItemFingerprint(0, 0, "Validar limite semanal");
  const updated = toggleChecklistItemInMarkdown(SAMPLE, 0, 0, fingerprint, true);
  assert.ok(updated);
  assert.match(updated!, /- \[x\] Validar limite semanal/);
  assert.match(updated!, /- \[x\] Conferir estoque/);
  assert.doesNotMatch(updated!, /- \[ \] Validar limite semanal/);
});

test("updateTestcaseStatusInMarkdown altera status pelo id", () => {
  const updated = updateTestcaseStatusInMarkdown(SAMPLE, "PRD-01", "ok");
  assert.ok(updated);
  assert.match(updated!, /:::testcase\{[^}]*status="ok"/);
  assert.doesNotMatch(updated!, /status="pending"/);
});

test("applyLivingDocumentMutation recusa mutação inválida", () => {
  assert.equal(
    applyLivingDocumentMutation(SAMPLE, {
      kind: "checklist",
      sectionIndex: 0,
      blockIndex: 9,
      itemFingerprint: "missing",
      checked: true,
    }),
    null,
  );
  assert.equal(applyLivingDocumentMutation(SAMPLE, { kind: "testcase", testcaseId: "X", status: "error" }), null);
});

test("helpers de existência reconhecem blocos atuais", () => {
  const fingerprint = checklistItemFingerprint(0, 0, "Validar limite semanal");
  assert.equal(checklistFingerprintExists(SAMPLE, 0, 0, fingerprint), true);
  assert.equal(testcaseIdExists(SAMPLE, "PRD-01"), true);
  assert.equal(testcaseIdExists(SAMPLE, "PRD-99"), false);
});

test("parseTestcaseStatus faz fallback para pending", () => {
  assert.equal(parseTestcaseStatus("partial"), "partial");
  assert.equal(parseTestcaseStatus("unknown"), "pending");
});
