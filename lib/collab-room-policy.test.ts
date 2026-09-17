import assert from "node:assert/strict";
import test from "node:test";
import { validateCollabPolicyVersion } from "./collab-room-policy.ts";

test("RN-121: cliente com policyVersion defasada é recusado", () => {
  assert.equal(validateCollabPolicyVersion(null, 2).ok, true);
  assert.equal(validateCollabPolicyVersion(2, 2).ok, true);
  assert.equal(validateCollabPolicyVersion(1, 2).ok, false);
  assert.equal(validateCollabPolicyVersion(0, 1).ok, false);
});
