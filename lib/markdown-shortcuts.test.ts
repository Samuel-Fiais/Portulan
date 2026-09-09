import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMarkdownFormat, isMarkdownShortcut } from "./markdown-shortcuts.ts";

test("applyMarkdownFormat envolve seleção em negrito", () => {
  const result = applyMarkdownFormat("hello world", 6, 11, "bold");
  assert.equal(result.content, "hello **world**");
  assert.equal(result.selectionStart, 8);
  assert.equal(result.selectionEnd, 13);
});

test("applyMarkdownFormat remove negrito existente", () => {
  const result = applyMarkdownFormat("hello **world**", 8, 13, "bold");
  assert.equal(result.content, "hello world");
  assert.equal(result.selectionStart, 6);
  assert.equal(result.selectionEnd, 11);
});

test("applyMarkdownFormat envolve seleção em itálico", () => {
  const result = applyMarkdownFormat("hello world", 6, 11, "italic");
  assert.equal(result.content, "hello *world*");
});

test("applyMarkdownFormat insere link com placeholder de URL", () => {
  const result = applyMarkdownFormat("clique aqui", 0, 11, "link");
  assert.equal(result.content, "[clique aqui](url)");
  assert.equal(result.selectionStart, 14);
  assert.equal(result.selectionEnd, 17);
});

test("applyMarkdownFormat insere link sem seleção", () => {
  const result = applyMarkdownFormat("prefixo ", 8, 8, "link");
  assert.equal(result.content, "prefixo [text](url)");
  assert.equal(result.selectionStart, 9);
  assert.equal(result.selectionEnd, 13);
});

test("isMarkdownShortcut reconhece atalhos do editor", () => {
  assert.equal(isMarkdownShortcut({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, key: "b" }), "bold");
  assert.equal(isMarkdownShortcut({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, key: "i" }), "italic");
  assert.equal(isMarkdownShortcut({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, key: "k" }), "link");
  assert.equal(isMarkdownShortcut({ metaKey: true, ctrlKey: false, shiftKey: true, altKey: false, key: "c" }), "component-picker");
  assert.equal(isMarkdownShortcut({ metaKey: false, ctrlKey: true, shiftKey: true, altKey: false, key: "C" }), "component-picker");
  assert.equal(isMarkdownShortcut({ metaKey: true, ctrlKey: false, shiftKey: false, altKey: false, key: "s" }), null);
});
