import assert from "node:assert/strict";
import { test } from "node:test";
import { validateShareInvite, validateShareRoleUpdate } from "./document-share-policy.ts";

test("validateShareInvite rejeita compartilhar com o responsável", () => {
  const result = validateShareInvite({
    email: "owner@empresa.com",
    role: "viewer",
    ownerId: "user-1",
    ownerEmail: "owner@empresa.com",
    existingShares: [],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /responsável/i);
});

test("validateShareInvite rejeita convite duplicado", () => {
  const result = validateShareInvite({
    email: "colega@empresa.com",
    role: "editor",
    ownerId: "user-1",
    ownerEmail: "owner@empresa.com",
    existingShares: [{ email: "colega@empresa.com", role: "viewer", userId: null }],
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /já tem acesso/i);
});

test("validateShareInvite aceita convite novo", () => {
  const result = validateShareInvite({
    email: "novo@empresa.com",
    role: "viewer",
    ownerId: "user-1",
    ownerEmail: "owner@empresa.com",
    existingShares: [{ email: "colega@empresa.com", role: "viewer", userId: "user-2" }],
  });
  assert.equal(result.ok, true);
});

test("validateShareRoleUpdate rejeita papel igual", () => {
  const result = validateShareRoleUpdate("viewer", "viewer");
  assert.equal(result.ok, false);
});
