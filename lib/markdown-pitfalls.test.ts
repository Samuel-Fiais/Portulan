import assert from "node:assert/strict";
import test from "node:test";
import { explainMarkdownComponent, findMarkdownComponent } from "./markdown-components.ts";
import {
  buildGlobalAvoidErrorsSection,
  getComponentAvoidErrors,
} from "./markdown-pitfalls.ts";
import { buildSystemGuide } from "./system-guide.ts";

test("buildGlobalAvoidErrorsSection cobre regras de sintaxe e exemplos", () => {
  const section = buildGlobalAvoidErrorsSection();
  assert.equal(section.title, "Como evitar erros");
  assert.ok(section.syntaxRules.some((rule) => rule.includes("sem espaço")));
  assert.ok(section.syntaxRules.some((rule) => rule.includes("columns")));
  assert.ok(section.commonAgentFailures.some((item) => item.includes("HTML")));
  assert.ok(section.examples.some((example) => example.bad?.includes("{walletId}")));
});

test("getComponentAvoidErrors inclui armadilhas por componente", () => {
  const checklist = getComponentAvoidErrors(findMarkdownComponent("checklist")!);
  assert.ok(checklist.some((item) => item.includes("[ ]")));

  const testcase = getComponentAvoidErrors(findMarkdownComponent("testcase")!);
  assert.ok(testcase.some((item) => item.includes("pending")));

  const stats = getComponentAvoidErrors(findMarkdownComponent("stats")!);
  assert.ok(stats.some((item) => item.includes("GFM")));
});

test("buildSystemGuide expõe avoidErrors global e por componente", () => {
  const guide = buildSystemGuide();
  assert.equal(guide.avoidErrors.title, "Como evitar erros");
  assert.ok(guide.avoidErrors.syntaxRules.length >= 8);

  const checklistEntry = guide.markdownCatalog.byCategory
    .flatMap((group) => group.components)
    .find((component) => component.id === "checklist");
  assert.ok(checklistEntry?.avoidErrors?.some((item) => item.includes("[x]")));
});

test("explainMarkdownComponent inclui avoidErrors", () => {
  const explanation = explainMarkdownComponent("api");
  assert.ok(explanation?.avoidErrors?.some((item) => item.includes("{param}")));
});
