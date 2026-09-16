import assert from "node:assert/strict";
import test from "node:test";
import {
  canEditContextPack,
  existingManeuverRevisionNote,
  isPackServable,
  nextValidityAfterSourceRelease,
  sourceRevisionSignalMessage,
  validateAcceptanceCriterion,
  validateContextItem,
  validateContextPackApproval,
  validateContextPackEditable,
  validateContextPackSourceDraft,
  validateContextPackStatusTransition,
  validateFormalSourcesForApproval,
  validateStartNewRevision,
} from "./context-pack-policy.ts";

const formalSource = {
  documentId: "doc-1",
  releaseId: "rel-1",
  role: "spec",
  required: true,
  reason: "Contrato da API",
};

test("aprovação exige responsável, capitão ou imediato", () => {
  const items = [{ type: "decision", strength: "required", body: "Usar Postgres" }];
  assert.equal(
    validateContextPackApproval({
      actorId: "owner",
      ownerUserId: "owner",
      role: "member",
      status: "review",
      sources: [formalSource],
      items,
    }).ok,
    true,
  );
  assert.equal(
    validateContextPackApproval({
      actorId: "admin",
      ownerUserId: "owner",
      role: "admin",
      status: "draft",
      sources: [formalSource],
      items,
    }).ok,
    true,
  );
  assert.equal(
    validateContextPackApproval({
      actorId: "member-2",
      ownerUserId: "owner",
      role: "member",
      status: "review",
      sources: [formalSource],
      items,
    }).ok,
    false,
  );
});

test("fonte formal sem release imutável recusa aprovação", () => {
  assert.equal(
    validateFormalSourcesForApproval([
      { documentId: "doc-1", releaseId: null, role: "spec", required: true, reason: "x" },
    ]).ok,
    false,
  );
});

test("pergunta bloqueadora impede aprovação e serviço MCP", () => {
  const items = [{ type: "question", strength: "required", body: "Qual o SLA?", blocking: true }];
  assert.equal(
    validateContextPackApproval({
      actorId: "owner",
      ownerUserId: "owner",
      role: "owner",
      status: "review",
      sources: [formalSource],
      items,
    }).ok,
    false,
  );
  const servable = isPackServable({ status: "approved", validity: "current", items });
  assert.equal(servable.ok, false);
  if (!servable.ok) assert.ok(servable.reasons.includes("blocking_question"));
});

test("item de contexto e Marco recusam texto vazio", () => {
  assert.equal(
    validateContextItem({ type: "decision", strength: "required", body: "  " }).ok,
    false,
  );
  assert.equal(
    validateContextItem({ type: "decision", strength: "required", body: "Usar Postgres" }).ok,
    true,
  );
  assert.equal(validateAcceptanceCriterion("   ").ok, false);
  assert.equal(validateAcceptanceCriterion("SLA 99,9% em 30 dias").ok, true);
});

test("MCP não serve Rumo desatualizado como briefing", () => {
  const result = isPackServable({
    status: "approved",
    validity: "needs_review",
    items: [],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "pack_not_servable");
    assert.ok(result.reasons.includes("needs_review"));
  }
});

test("nova release da Carta-fonte marca validade, não invalida o Rumo", () => {
  assert.equal(nextValidityAfterSourceRelease(), "needs_review");
  assert.match(sourceRevisionSignalMessage(), /Carta-fonte ganhou uma nova edição/);
  assert.equal(validateContextPackStatusTransition({ from: "approved", to: "superseded" }).ok, true);
  assert.equal(validateContextPackStatusTransition({ from: "approved", to: "draft" }).ok, false);
});

test("RN-99: revisão aprovada não se reedita; nova revisão é explícita", () => {
  assert.equal(canEditContextPack("approved"), false);
  assert.equal(canEditContextPack("draft"), true);
  assert.equal(validateContextPackEditable("approved").ok, false);
  assert.equal(
    validateStartNewRevision({
      status: "approved",
      actorId: "owner",
      ownerUserId: "owner",
      role: "member",
    }).ok,
    true,
  );
  assert.equal(
    validateStartNewRevision({
      status: "draft",
      actorId: "owner",
      ownerUserId: "owner",
      role: "member",
    }).ok,
    false,
  );
  assert.equal(
    validateStartNewRevision({
      status: "approved",
      actorId: "other",
      ownerUserId: "owner",
      role: "member",
    }).ok,
    false,
  );
  assert.match(existingManeuverRevisionNote(), /revisão anterior/);
});

test("fonte formal no rascunho também exige edição imutável", () => {
  assert.equal(
    validateContextPackSourceDraft({
      documentId: "doc-1",
      releaseId: null,
      role: "spec",
      required: true,
      reason: "x",
    }).ok,
    false,
  );
  assert.equal(
    validateContextPackSourceDraft({
      documentId: "doc-1",
      releaseId: "rel-1",
      role: "spec",
      required: true,
      reason: "x",
    }).ok,
    true,
  );
});
