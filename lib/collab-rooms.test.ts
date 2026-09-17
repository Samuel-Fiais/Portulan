import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeCollabRoom,
  collabRoomKey,
  validateCollabRoomScope,
  validateCollabSubject,
} from "./collab-rooms.ts";

const room = { workspaceId: "ws-1", subjectType: "context_pack" as const, subjectId: "pack-1" };

test("sala só existe para assunto conhecido e artefato identificado", () => {
  assert.equal(validateCollabSubject({ subjectType: "document", subjectId: "doc-1" }).ok, true);
  assert.equal(validateCollabSubject({ subjectType: "release", subjectId: "rel-1" }).ok, false);
  assert.equal(validateCollabSubject({ subjectType: "document", subjectId: "  " }).ok, false);
});

test("a chave da sala junta porto, assunto e artefato", () => {
  assert.equal(collabRoomKey(room), "porto:ws-1:context_pack:pack-1");
});

test("RN-96: sala de outro porto não abre", () => {
  assert.equal(validateCollabRoomScope({ roomWorkspaceId: "ws-1", actorWorkspaceId: "ws-1" }).ok, true);
  assert.equal(validateCollabRoomScope({ roomWorkspaceId: "ws-2", actorWorkspaceId: "ws-1" }).ok, false);
  assert.equal(
    authorizeCollabRoom({ room, actorWorkspaceId: "ws-2", workspaceRole: "owner" }).ok,
    false,
  );
});

test("RN-121: sem participação no porto a sala fecha", () => {
  assert.equal(authorizeCollabRoom({ room, actorWorkspaceId: "ws-1", workspaceRole: null }).ok, false);
  assert.deepEqual(authorizeCollabRoom({ room, actorWorkspaceId: "ws-1", workspaceRole: "member" }), {
    ok: true,
    canOperate: true,
  });
});

test("RN-121: na carta vale o convite nominal, não o papel do porto", () => {
  const carta = { workspaceId: "ws-1", subjectType: "document" as const, subjectId: "doc-1" };

  assert.equal(
    authorizeCollabRoom({ room: carta, actorWorkspaceId: "ws-1", workspaceRole: "owner" }).ok,
    false,
    "capitania não entra em carta sem acesso",
  );
  assert.deepEqual(
    authorizeCollabRoom({
      room: carta,
      actorWorkspaceId: "ws-1",
      workspaceRole: null,
      documentAccess: "editor",
    }),
    { ok: true, canOperate: true },
  );
  assert.deepEqual(
    authorizeCollabRoom({
      room: carta,
      actorWorkspaceId: "ws-1",
      workspaceRole: "member",
      documentAccess: "workspace",
    }),
    { ok: true, canOperate: false },
    "visibilidade de porto dá leitura, nunca edição (RN-18)",
  );
});

test("RN-120: conteúdo imutável entra na sala em leitura", () => {
  assert.deepEqual(
    authorizeCollabRoom({ room, actorWorkspaceId: "ws-1", workspaceRole: "member", contentMutable: false }),
    { ok: true, canOperate: false },
  );
});
