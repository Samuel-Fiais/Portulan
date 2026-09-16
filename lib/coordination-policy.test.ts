import assert from "node:assert/strict";
import test from "node:test";
import {
  taskRemainsBlocked,
  validateCoordinationMessage,
  validateCoordinationSubject,
  validateCoordinationThreadScope,
  validateResolveThread,
} from "./coordination-policy.ts";

test("Conversa de bordo ancora só nos sujeitos do Rumo", () => {
  assert.equal(validateCoordinationSubject("task").ok, true);
  assert.equal(validateCoordinationSubject("document").ok, false);
});

test("mensagem vazia recusa; resolução só no raiz", () => {
  assert.equal(validateCoordinationMessage({ body: "  ", isRoot: true }).ok, false);
  assert.equal(validateCoordinationMessage({ body: "Há uma maré contrária nesta Manobra", isRoot: true }).ok, true);
  assert.equal(validateResolveThread({ isRoot: false, resolved: true }).ok, false);
  assert.equal(validateResolveThread({ isRoot: true, resolved: true }).ok, true);
});

test("RN-96: mensagem e leitura exigem o mesmo porto do fio", () => {
  assert.equal(
    validateCoordinationThreadScope({ threadWorkspaceId: "ws-1", actorWorkspaceId: "ws-1" }).ok,
    true,
  );
  assert.equal(
    validateCoordinationThreadScope({ threadWorkspaceId: "ws-2", actorWorkspaceId: "ws-1" }).ok,
    false,
  );
  assert.equal(
    validateCoordinationThreadScope({ threadWorkspaceId: null, actorWorkspaceId: "ws-1" }).ok,
    false,
  );
});

test("RN-109: um entre vários bloqueios não libera a Manobra", () => {
  assert.equal(taskRemainsBlocked(2), true);
  assert.equal(taskRemainsBlocked(1), true);
  assert.equal(taskRemainsBlocked(0), false);
});
