import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeCollabSubject,
  collabSubjectBelongsToWorkspace,
  collabSubjectContentMutable,
  collabSubjectDocumentAccess,
  type CollabSubjectSnapshot,
} from "./collab-subjects.ts";

const pack: CollabSubjectSnapshot = {
  subjectType: "context_pack",
  workspaceId: "ws-1",
  status: "draft",
};

const carta: CollabSubjectSnapshot = {
  subjectType: "document",
  workspaceId: "ws-1",
  access: "editor",
  disabled: false,
};

test("RN-119: artefato fora do alcance de quem pede não abre sala", () => {
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "context_pack",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: null,
    }),
    { ok: false, error: "Este artefato não existe neste porto." },
  );
});

test("RN-96: artefato de outro porto não abre sala neste porto", () => {
  assert.equal(collabSubjectBelongsToWorkspace(pack, "ws-1"), true);
  assert.equal(collabSubjectBelongsToWorkspace({ ...pack, workspaceId: "ws-2" }, "ws-1"), false);
  assert.equal(
    authorizeCollabSubject({
      subjectType: "context_pack",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: { ...pack, workspaceId: "ws-2" },
    }).ok,
    false,
  );
});

test("assunto pedido tem de casar com o artefato encontrado", () => {
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "project",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: pack,
    }),
    { ok: false, error: "Este artefato não é do tipo pedido." },
  );
});

test("RN-121: sem participação no porto o assunto de coordenação fecha", () => {
  assert.equal(
    authorizeCollabSubject({
      subjectType: "context_pack",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: null,
      snapshot: pack,
    }).ok,
    false,
  );
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "context_pack",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: "member",
      snapshot: pack,
    }),
    { ok: true, canOperate: true },
  );
});

test("RN-121: na carta vale o convite nominal, mesmo sem tripulação naquele porto", () => {
  assert.equal(collabSubjectDocumentAccess(carta), "editor");
  assert.equal(collabSubjectDocumentAccess(pack), undefined);
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "document",
      subjectId: "doc-1",
      workspaceId: "ws-1",
      workspaceRole: null,
      snapshot: carta,
    }),
    { ok: true, canOperate: true },
  );
  assert.equal(
    authorizeCollabSubject({
      subjectType: "document",
      subjectId: "doc-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: { ...carta, access: null },
    }).ok,
    false,
    "capitania não entra em carta sem acesso",
  );
});

test("carta e gabarito sem porto são acervo legado, visíveis de qualquer porto", () => {
  assert.equal(collabSubjectBelongsToWorkspace({ ...carta, workspaceId: null }, "ws-9"), true);
  assert.equal(
    collabSubjectBelongsToWorkspace(
      { subjectType: "template", workspaceId: null, isBuiltin: true, manageable: true },
      "ws-9",
    ),
    true,
  );
});

test("RN-120: conteúdo imutável entra na sala só em leitura", () => {
  assert.equal(collabSubjectContentMutable({ ...pack, status: "draft" }), true);
  assert.equal(collabSubjectContentMutable({ ...pack, status: "review" }), true);
  assert.equal(collabSubjectContentMutable({ ...pack, status: "approved" }), false);
  assert.equal(collabSubjectContentMutable({ ...pack, status: "superseded" }), false);
  assert.equal(collabSubjectContentMutable({ ...carta, disabled: true }), false);

  assert.equal(
    collabSubjectContentMutable({
      subjectType: "implementation_plan",
      workspaceId: "ws-1",
      revisionId: null,
    }),
    true,
  );
  assert.equal(
    collabSubjectContentMutable({
      subjectType: "implementation_plan",
      workspaceId: "ws-1",
      revisionId: "rev-1",
    }),
    false,
    "plano de revisão aprovada não se edita ao vivo (RN-99)",
  );

  assert.equal(
    collabSubjectContentMutable({
      subjectType: "implementation_task",
      workspaceId: "ws-1",
      status: "in_progress",
    }),
    true,
  );
  assert.equal(
    collabSubjectContentMutable({
      subjectType: "implementation_task",
      workspaceId: "ws-1",
      status: "accepted",
    }),
    false,
    "linha aceita não volta a mudar por operação (RN-103)",
  );

  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "context_pack",
      subjectId: "pack-1",
      workspaceId: "ws-1",
      workspaceRole: "member",
      snapshot: { ...pack, status: "approved" },
    }),
    { ok: true, canOperate: false },
  );
});

test("gabarito interno e gabarito que a pessoa não administra ficam em leitura", () => {
  const gabarito = { subjectType: "template", workspaceId: "ws-1" } as const;
  assert.equal(collabSubjectContentMutable({ ...gabarito, isBuiltin: false, manageable: true }), true);
  assert.equal(collabSubjectContentMutable({ ...gabarito, isBuiltin: true, manageable: true }), false);
  assert.equal(collabSubjectContentMutable({ ...gabarito, isBuiltin: false, manageable: false }), false);
});

test("Expedição e Embarcação abrem para a tripulação do porto", () => {
  for (const subjectType of ["project", "repository"] as const) {
    assert.deepEqual(
      authorizeCollabSubject({
        subjectType,
        subjectId: "alvo-1",
        workspaceId: "ws-1",
        workspaceRole: "member",
        snapshot: { subjectType, workspaceId: "ws-1" },
      }),
      { ok: true, canOperate: true },
    );
    assert.equal(
      authorizeCollabSubject({
        subjectType,
        subjectId: "alvo-1",
        workspaceId: "ws-1",
        workspaceRole: null,
        snapshot: { subjectType, workspaceId: "ws-1" },
      }).ok,
      false,
    );
  }
});
