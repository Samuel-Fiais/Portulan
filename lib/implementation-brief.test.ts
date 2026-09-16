import assert from "node:assert/strict";
import test from "node:test";
import { buildImplementationBrief } from "./implementation-brief.ts";

const pack = {
  id: "pack-1",
  title: "PIX",
  objective: "Cobrir o webhook",
  expectedOutcome: "Idempotência",
  scope: "API",
  outOfScope: "App",
};

test("brief inclui objetivo, escopo, fora de escopo, itens, Marcos e revisão", () => {
  const brief = buildImplementationBrief({
    pack,
    revisionId: "rev-1",
    items: [{ id: "i1", type: "rule", body: "Usar Postgres", strength: "required" }],
    criteria: [{ id: "c1", description: "SLA 99,9%" }],
    task: { id: "t1", objective: "Webhook", pathScopes: ["api/"] },
    mode: "brief",
  });
  assert.equal(brief.packId, "pack-1");
  assert.equal(brief.revisionId, "rev-1");
  assert.equal(brief.scope, "API");
  assert.equal(brief.outOfScope, "App");
  assert.equal(brief.requiredItems.length, 1);
  assert.equal(brief.criteria.length, 1);
  assert.ok(!("sources" in brief));
});

test("full acrescenta fontes fixadas, Embarcação e dados da tarefa", () => {
  const full = buildImplementationBrief({
    pack,
    revisionId: "rev-1",
    items: [],
    criteria: [],
    mode: "full",
    sources: [{ documentId: "d1", releaseId: "r1", required: true, reason: "Contrato" }],
    repository: { id: "repo-1", name: "api" },
    taskFull: { id: "t1", status: "claimed" },
  });
  assert.ok("sources" in full);
  assert.deepEqual(full.repository, { id: "repo-1", name: "api" });
  assert.deepEqual(full.taskFull, { id: "t1", status: "claimed" });
});
