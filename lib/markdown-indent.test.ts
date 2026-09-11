import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMarkdownIndent } from "./markdown-indent.ts";

test("applyMarkdownIndent insere dois espaços na linha do cursor", () => {
  const result = applyMarkdownIndent("- item\n  filho", 7, 7, false);
  assert.equal(result.content, "- item\n    filho");
  assert.equal(result.selectionStart, 9);
  assert.equal(result.selectionEnd, 9);
});

test("applyMarkdownIndent indenta bloco multilinha selecionado", () => {
  const content = "alpha\nbeta\ngamma";
  const result = applyMarkdownIndent(content, 0, 10, false);
  assert.equal(result.content, "  alpha\n  beta\ngamma");
  assert.equal(result.selectionStart, 2);
  assert.equal(result.selectionEnd, 14);
});

test("applyMarkdownIndent desindenta linhas com dois espaços iniciais", () => {
  const content = "  alpha\n  beta";
  const result = applyMarkdownIndent(content, 2, 12, true);
  assert.equal(result.content, "alpha\nbeta");
  assert.equal(result.selectionStart, 0);
  assert.equal(result.selectionEnd, 8);
});

test("applyMarkdownIndent desindenta tab inicial", () => {
  const result = applyMarkdownIndent("\tlinha", 3, 3, true);
  assert.equal(result.content, "linha");
  assert.equal(result.selectionStart, 2);
});

test("applyMarkdownIndent não altera linha sem indentação ao desindentar", () => {
  const result = applyMarkdownIndent("texto", 3, 3, true);
  assert.equal(result.content, "texto");
  assert.equal(result.selectionStart, 3);
});
