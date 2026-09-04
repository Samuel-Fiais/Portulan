import assert from "node:assert/strict";
import test from "node:test";
import { checklistItemFingerprint } from "./living-document-storage.ts";
import {
  applyLivingDocumentMutation,
  checklistFingerprintExists,
  mergeLivingDocumentState,
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

const NESTED_COLUMNS = `## 01 — QA

:::columns{count="2"}
### Cenários

:::testcase{id="TC-NESTED" status="pending" priority="high" title="Dentro de colunas"}
**Passos:** executar fluxo
:::

---

### Evidências
Texto livre.
:::
`;

test("updateTestcaseStatusInMarkdown encontra testcase aninhado em columns", () => {
  const updated = updateTestcaseStatusInMarkdown(NESTED_COLUMNS, "TC-NESTED", "ok");
  assert.ok(updated);
  assert.match(updated!, /:::testcase\{[^}]*id="TC-NESTED"[^}]*status="ok"/);
  assert.doesNotMatch(updated!, /TC-NESTED"[^}]*status="pending"/);
});

test("testcaseIdExists reconhece testcase aninhado em columns", () => {
  assert.equal(testcaseIdExists(NESTED_COLUMNS, "TC-NESTED"), true);
  assert.equal(testcaseIdExists(NESTED_COLUMNS, "TC-MISSING"), false);
});

const CURRENT_WITH_LIVING = `## 01 — QA

:::checklist
- [x] Validar limite semanal | Rafael · sexta
- [ ] Conferir estoque | pendente
:::

:::testcase{id="PRD-01" status="ok" priority="high" title="Limite semanal disponível"}
**Resultado esperado:** 200 OK
:::

:::testcase{id="PRD-02" status="partial" priority="medium" title="Novo cenário"}
**Resultado esperado:** parcial
:::
`;

const AGENT_INCOMING = `## 01 — QA

:::checklist
- [ ] Validar limite semanal | Rafael · sexta
- [ ] Conferir estoque | pendente
:::

:::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal disponível"}
**Resultado esperado:** 200 OK
:::

:::testcase{id="PRD-02" status="pending" priority="medium" title="Novo cenário"}
**Resultado esperado:** parcial
:::
`;

test("mergeLivingDocumentState preserva status de testcase e checklist do rascunho atual", () => {
  const merged = mergeLivingDocumentState(CURRENT_WITH_LIVING, AGENT_INCOMING);
  assert.match(merged, /:::testcase\{[^}]*id="PRD-01"[^}]*status="ok"/);
  assert.match(merged, /:::testcase\{[^}]*id="PRD-02"[^}]*status="partial"/);
  assert.match(merged, /- \[x\] Validar limite semanal/);
  assert.match(merged, /- \[ \] Conferir estoque/);
  assert.doesNotMatch(merged, /status="pending"/);
});

test("mergeLivingDocumentState usa defaults do agente para itens novos", () => {
  const incomingWithNew = `${AGENT_INCOMING}

:::testcase{id="PRD-99" status="pending" priority="low" title="Cenário novo"}
**Passos:** executar
:::

:::checklist
- [ ] Item novo sem histórico
:::
`;

  const merged = mergeLivingDocumentState(CURRENT_WITH_LIVING, incomingWithNew);
  assert.match(merged, /:::testcase\{[^}]*id="PRD-99"[^}]*status="pending"/);
  assert.match(merged, /- \[ \] Item novo sem histórico/);
  assert.match(merged, /:::testcase\{[^}]*id="PRD-01"[^}]*status="ok"/);
});

test("mergeLivingDocumentState remove itens ausentes no conteúdo incoming", () => {
  const incomingWithoutPrd02 = `## 01 — QA

:::testcase{id="PRD-01" status="pending" priority="high" title="Limite semanal disponível"}
**Resultado esperado:** 200 OK
:::
`;

  const merged = mergeLivingDocumentState(CURRENT_WITH_LIVING, incomingWithoutPrd02);
  assert.doesNotMatch(merged, /PRD-02/);
  assert.match(merged, /status="ok"/);
});

test("mergeLivingDocumentState retorna incoming quando não há rascunho anterior", () => {
  assert.equal(mergeLivingDocumentState("", AGENT_INCOMING), AGENT_INCOMING);
  assert.equal(mergeLivingDocumentState("   \n", AGENT_INCOMING), AGENT_INCOMING);
});

test("mergeLivingDocumentState preserva testcase aninhado em columns", () => {
  const currentNested = `## QA

:::columns{count="2"}
:::testcase{id="TC-NESTED" status="ok" priority="high" title="Dentro de colunas"}
**Passos:** executar
:::
---
Texto
:::
`;

  const incomingNested = `## QA

:::columns{count="2"}
:::testcase{id="TC-NESTED" status="pending" priority="high" title="Dentro de colunas"}
**Passos:** executar
:::
---
Texto
:::
`;

  const merged = mergeLivingDocumentState(currentNested, incomingNested);
  assert.match(merged, /:::testcase\{[^}]*id="TC-NESTED"[^}]*status="ok"/);
});

test("mergeLivingDocumentState ignora status incoming do agente quando id coincide", () => {
  const current = `:::testcase{id="X" status="error" priority="low" title="Falhou"}
corpo
:::`;
  const incoming = `:::testcase{id="X" status="ok" priority="low" title="Falhou"}
corpo
:::`;

  const merged = mergeLivingDocumentState(current, incoming);
  assert.match(merged, /status="error"/);
  assert.doesNotMatch(merged, /status="ok"/);
});
