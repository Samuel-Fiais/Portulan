import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoSecret,
  hasManagedBlock,
  upsertManagedBlock,
} from "./cli-managed-blocks.ts";

test("bloco gerenciado é idempotente e preserva conteúdo existente", () => {
  const first = upsertManagedBlock("# AGENTS\n\nTexto antigo.\n", "bloco A");
  assert.ok(first.includes("Texto antigo."));
  assert.ok(hasManagedBlock(first));
  const second = upsertManagedBlock(first, "bloco B");
  assert.equal((second.match(/BEGIN:portulan-dev-context/g) ?? []).length, 1);
  assert.ok(second.includes("bloco B"));
  assert.ok(!second.includes("bloco A"));
});

test("recusa gravar token no repositório", () => {
  assert.throws(() => assertNoSecret("Authorization: Bearer ptl_abcdefghijklmnopqrstuvwxyz012345", "config"));
});
