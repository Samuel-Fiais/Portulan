import assert from "node:assert/strict";
import test from "node:test";
import { isProtectedApiPath, isPublicAppPath } from "./auth-routes.ts";

test("rotas CLI alcançam a autenticação Bearer da própria rota", () => {
  assert.equal(isPublicAppPath("/api/cli/projects"), true);
  assert.equal(isProtectedApiPath("/api/cli/projects"), false);
});

test("demais APIs continuam protegidas pela sessão", () => {
  assert.equal(isPublicAppPath("/api/documents"), false);
  assert.equal(isProtectedApiPath("/api/documents"), true);
});
