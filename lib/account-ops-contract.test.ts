import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const accountOpsSource = readFileSync(
  fileURLToPath(new URL("./account-ops.ts", import.meta.url)),
  "utf8",
);

test("cadastro com senha provisiona porto inicial (RN-86)", () => {
  assert.match(accountOpsSource, /await ensurePersonalWorkspace\(user\.id\)/);
});
