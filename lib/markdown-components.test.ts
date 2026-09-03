import assert from "node:assert/strict";
import test from "node:test";
import {
  explainMarkdownComponent,
  findMarkdownComponent,
  listMarkdownComponentsForMcp,
} from "./markdown-components.ts";

test("listMarkdownComponentsForMcp inclui diretivas e markdown", () => {
  const components = listMarkdownComponentsForMcp();
  assert.ok(components.length > 50);
  assert.ok(components.some((component) => component.id === "alert" && component.name === "alert"));
  assert.ok(components.some((component) => component.id === "section" && component.kind === "markdown"));
});

test("findMarkdownComponent resolve id, título e diretiva", () => {
  assert.equal(findMarkdownComponent("alert")?.id, "alert");
  assert.equal(findMarkdownComponent("Alerta")?.id, "alert");
  assert.equal(findMarkdownComponent("stats")?.id, "stats");
  assert.equal(findMarkdownComponent("chart")?.id, "chart-configurable");
});

test("explainMarkdownComponent retorna passos e exemplos", () => {
  const explanation = explainMarkdownComponent("checklist");
  assert.ok(explanation);
  assert.equal(explanation?.name, "checklist");
  assert.ok(explanation?.steps.length >= 2);
  assert.equal(explanation?.examples.length, 2);
  assert.equal(explainMarkdownComponent("inexistente"), null);
});
