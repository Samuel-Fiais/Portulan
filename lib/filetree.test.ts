import assert from "node:assert/strict";
import test from "node:test";
import { fileTreeHasFolders, parseFileTree } from "./filetree.ts";

test("parseFileTree lê árvore com caracteres de caixa", () => {
  const nodes = parseFileTree([
    "src/",
    "├── api/",
    "│   └── reports.ts",
    "└── components/",
    "    └── chart.tsx",
  ].join("\n"));

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.name, "src");
  assert.equal(nodes[0]?.kind, "dir");
  assert.equal(nodes[0]?.children.length, 2);
  assert.equal(nodes[0]?.children[0]?.name, "api");
  assert.equal(nodes[0]?.children[0]?.children[0]?.name, "reports.ts");
  assert.equal(nodes[0]?.children[0]?.children[0]?.kind, "file");
  assert.equal(nodes[0]?.children[1]?.name, "components");
  assert.equal(nodes[0]?.children[1]?.children[0]?.name, "chart.tsx");
  assert.equal(fileTreeHasFolders(nodes), true);
});

test("parseFileTree lê indentação por espaços", () => {
  const nodes = parseFileTree([
    "app",
    "  api",
    "    mcp",
    "      route.ts",
    "  globals.css",
  ].join("\n"));

  assert.equal(nodes[0]?.children[0]?.name, "api");
  assert.equal(nodes[0]?.children[0]?.kind, "dir");
  assert.equal(nodes[0]?.children[0]?.children[0]?.name, "mcp");
  assert.equal(nodes[0]?.children[0]?.children[0]?.children[0]?.name, "route.ts");
  assert.equal(nodes[0]?.children[1]?.name, "globals.css");
  assert.equal(nodes[0]?.children[1]?.kind, "file");
});

test("fileTreeHasFolders é falso para lista plana", () => {
  const nodes = parseFileTree("readme.md\nlicense.md");
  assert.equal(nodes.length, 2);
  assert.equal(fileTreeHasFolders(nodes), false);
});
