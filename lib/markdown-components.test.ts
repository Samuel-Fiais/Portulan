import assert from "node:assert/strict";
import test from "node:test";
import {
  explainMarkdownComponent,
  findMarkdownComponent,
  groupMarkdownComponentsByCategory,
  listMarkdownComponentsForMcp,
} from "./markdown-components.ts";

test("listMarkdownComponentsForMcp inclui diretivas e markdown", () => {
  const components = listMarkdownComponentsForMcp();
  assert.ok(components.length > 50);
  assert.ok(components.some((component) => component.id === "alert" && component.name === "alert"));
  assert.ok(components.some((component) => component.id === "section" && component.kind === "markdown"));
  assert.ok(components.some((component) => component.id === "image" && component.kind === "directive"));
  assert.ok(components.some((component) => component.id === "report" && component.kind === "directive"));
});

test("groupMarkdownComponentsByCategory expõe imagens e relatório na modal", () => {
  const imageGroup = groupMarkdownComponentsByCategory().find((group) => group.category === "Imagens e mídia");
  assert.ok(imageGroup);
  assert.ok(imageGroup.components.some((component) => component.id === "image"));
  assert.ok(imageGroup.components.some((component) => component.id === "gallery"));
  const docsGroup = groupMarkdownComponentsByCategory().find((group) => group.category === "Documentação e referência");
  assert.ok(docsGroup?.components.some((component) => component.id === "report"));
});

test("findMarkdownComponent resolve id, título e diretiva", () => {
  assert.equal(findMarkdownComponent("alert")?.id, "alert");
  assert.equal(findMarkdownComponent("Alerta")?.id, "alert");
  assert.equal(findMarkdownComponent("stats")?.id, "stats");
  assert.equal(findMarkdownComponent("chart")?.id, "chart-configurable");
});

test("explainMarkdownComponent retorna passos, exemplos e avoidErrors", () => {
  const explanation = explainMarkdownComponent("checklist");
  assert.ok(explanation);
  assert.equal(explanation?.name, "checklist");
  assert.ok(explanation?.steps.length >= 2);
  assert.equal(explanation?.examples.length, 2);
  assert.ok(explanation?.avoidErrors?.length);
  assert.equal(explainMarkdownComponent("inexistente"), null);
});

test("explainMarkdownComponent de report não pede fence de fechamento", () => {
  const explanation = explainMarkdownComponent("report");
  assert.ok(explanation);
  assert.ok(explanation?.steps.some((step) => /Sem corpo/.test(step)));
  assert.ok(!explanation?.steps.some((step) => /Feche o bloco/.test(step)));
  assert.ok(!explanation?.steps.some((step) => /No corpo, escreva Markdown livre/.test(step)));
});
