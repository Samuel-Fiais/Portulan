import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeCollabSubject,
  collabSubjectBelongsToWorkspace,
  collabSubjectContentMutable,
  collabSubjectDocumentAccess,
  type CollabSubjectSnapshot,
} from "./collab-subjects.ts";

const gabarito: CollabSubjectSnapshot = {
  subjectType: "template",
  workspaceId: "ws-1",
  isBuiltin: false,
  manageable: true,
};

const carta: CollabSubjectSnapshot = {
  subjectType: "document",
  workspaceId: "ws-1",
  access: "editor",
  disabled: false,
  status: "draft",
};

test("artefato fora do alcance de quem pede não abre sala", () => {
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "template",
      subjectId: "tpl-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: null,
    }),
    { ok: false, error: "Este artefato não existe neste porto." },
  );
});

test("artefato de outro porto não abre sala neste porto", () => {
  assert.equal(collabSubjectBelongsToWorkspace(gabarito, "ws-1"), true);
  assert.equal(collabSubjectBelongsToWorkspace({ ...gabarito, workspaceId: "ws-2" }, "ws-1"), false);
  assert.equal(
    authorizeCollabSubject({
      subjectType: "template",
      subjectId: "tpl-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: { ...gabarito, workspaceId: "ws-2" },
    }).ok,
    false,
  );
});

test("assunto pedido tem de casar com o artefato encontrado", () => {
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "workspace",
      subjectId: "tpl-1",
      workspaceId: "ws-1",
      workspaceRole: "owner",
      snapshot: gabarito,
    }),
    { ok: false, error: "Este artefato não é do tipo pedido." },
  );
});

test("sem participação no porto o gabarito fecha", () => {
  assert.equal(
    authorizeCollabSubject({
      subjectType: "template",
      subjectId: "tpl-1",
      workspaceId: "ws-1",
      workspaceRole: null,
      snapshot: gabarito,
    }).ok,
    false,
  );
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "template",
      subjectId: "tpl-1",
      workspaceId: "ws-1",
      workspaceRole: "member",
      snapshot: gabarito,
    }),
    { ok: true, canOperate: true },
  );
});

test("na carta vale o convite nominal, mesmo sem tripulação naquele porto", () => {
  assert.equal(collabSubjectDocumentAccess(carta), "editor");
  assert.equal(collabSubjectDocumentAccess(gabarito), undefined);
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

test("conteúdo imutável entra na sala só em leitura", () => {
  assert.equal(collabSubjectContentMutable({ ...carta, disabled: true }), false);
  assert.equal(collabSubjectContentMutable({ ...carta, status: "published" }), false);
  assert.equal(collabSubjectContentMutable({ ...carta, status: "review" }), true);
  assert.equal(
    collabSubjectContentMutable({ subjectType: "workspace", workspaceId: "ws-1" }),
    false,
  );
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "document",
      subjectId: "doc-1",
      workspaceId: "ws-1",
      workspaceRole: "member",
      snapshot: { ...carta, status: "published" },
    }),
    { ok: true, canOperate: false },
  );
});

test("gabarito interno e gabarito que a pessoa não administra ficam em leitura", () => {
  const base = { subjectType: "template", workspaceId: "ws-1" } as const;
  assert.equal(collabSubjectContentMutable({ ...base, isBuiltin: false, manageable: true }), true);
  assert.equal(collabSubjectContentMutable({ ...base, isBuiltin: true, manageable: true }), false);
  assert.equal(collabSubjectContentMutable({ ...base, isBuiltin: false, manageable: false }), false);
});

test("a sala do porto abre para a tripulação só em leitura", () => {
  const snapshot = { subjectType: "workspace" as const, workspaceId: "ws-1" };
  assert.deepEqual(
    authorizeCollabSubject({
      subjectType: "workspace",
      subjectId: "ws-1",
      workspaceId: "ws-1",
      workspaceRole: "member",
      snapshot,
    }),
    { ok: true, canOperate: false },
  );
  assert.equal(
    authorizeCollabSubject({
      subjectType: "workspace",
      subjectId: "ws-1",
      workspaceId: "ws-1",
      workspaceRole: null,
      snapshot,
    }).ok,
    false,
  );
});
