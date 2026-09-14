import assert from "node:assert/strict";
import test from "node:test";
import { personalWorkspaceName, workspaceInitials, WORKSPACE_NAME_MAX } from "./workspaces.ts";

test("iniciais do porto ignoram conectores", () => {
  assert.equal(workspaceInitials("Porto de Rafael"), "PR");
  assert.equal(workspaceInitials("Porto dos Navegantes"), "PN");
  assert.equal(workspaceInitials("Frota Atlântica"), "FA");
});

test("iniciais caem para as duas primeiras letras quando há só uma palavra", () => {
  assert.equal(workspaceInitials("Cartoteca"), "CA");
  assert.equal(workspaceInitials("  "), "??");
});

test("nome só com conectores ainda gera iniciais", () => {
  assert.equal(workspaceInitials("de da"), "DD");
});

test("porto inicial usa o primeiro nome e respeita o limite", () => {
  assert.equal(personalWorkspaceName("Marina Costa Silva", "marina"), "Porto de Marina");
  assert.equal(personalWorkspaceName(null, "rafael"), "Porto de rafael");
  assert.ok(personalWorkspaceName("M".repeat(200), "m").length <= WORKSPACE_NAME_MAX);
});
