import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMarkdownBlocks, skipVoidDirectiveTail } from "./directive-attrs.ts";

test("parseMarkdownBlocks trata :::report como diretiva de uma linha", () => {
  const blocks = parseMarkdownBlocks(':::report{slug="roadmap" title="Roadmap" summary="Resumo."}');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "directive");
  if (blocks[0].kind === "directive") {
    assert.equal(blocks[0].directive.name, "report");
    assert.equal(blocks[0].directive.attributes.slug, "roadmap");
  }
});

test("parseMarkdownBlocks descarta corpo acidental após :::report void", () => {
  const source = [
    ':::report{slug="roadmap" title="Roadmap" summary="Resumo."}',
    "Guia de implementação",
    ":::",
    "",
    "Texto legítimo.",
  ].join("\n");

  const blocks = parseMarkdownBlocks(source);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, "directive");
  assert.equal(blocks[1].kind, "markdown");
  if (blocks[1].kind === "markdown") {
    assert.equal(blocks[1].body.trim(), "Texto legítimo.");
    assert.doesNotMatch(blocks[1].body, /Guia de implementação/);
    assert.doesNotMatch(blocks[1].body, /^:::/m);
  }
});

test("parseMarkdownBlocks descarta corpo acidental até linha em branco após :::image void", () => {
  const source = [
    ':::image{src="https://example.com/a.png" alt="A"}',
    "Legenda acidental",
    "",
    "Parágrafo válido.",
  ].join("\n");

  const blocks = parseMarkdownBlocks(source);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, "directive");
  assert.equal(blocks[1].kind, "markdown");
  if (blocks[1].kind === "markdown") {
    assert.equal(blocks[1].body.trim(), "Parágrafo válido.");
    assert.doesNotMatch(blocks[1].body, /Legenda acidental/);
  }
});

test("skipVoidDirectiveTail para no fechamento, linha em branco ou nova diretiva", () => {
  const lines = ["Guia", "::: ", "", "depois"];
  assert.equal(skipVoidDirectiveTail(lines, 0), 2);
  assert.equal(skipVoidDirectiveTail(["texto", "mais"], 0), 2);
  assert.equal(
    skipVoidDirectiveTail([':::image{src="https://b.png" alt="B"}'], 0),
    0,
  );
});

test("parseMarkdownBlocks ignora ::: de fechamento após :::report void", () => {
  const source = [
    ':::report{slug="roadmap" title="Roadmap" summary="Resumo."}',
    ":::",
    "",
    "Texto depois.",
  ].join("\n");

  const blocks = parseMarkdownBlocks(source);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, "directive");
  assert.equal(blocks[1].kind, "markdown");
  if (blocks[1].kind === "markdown") {
    assert.equal(blocks[1].body.trim(), "Texto depois.");
    assert.doesNotMatch(blocks[1].body, /^:::/m);
  }
});

test("parseMarkdownBlocks ignora ::: de fechamento após :::image void", () => {
  const source = [
    ':::image{src="https://example.com/a.png" alt="A"}',
    ":::",
  ].join("\n");

  const blocks = parseMarkdownBlocks(source);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "directive");
});

test("parseMarkdownBlocks trata :::image como diretiva de uma linha", () => {
  const source = [
    ':::image{src="https://a.png" alt="A"}',
    ':::image{src="https://b.png" alt="B"}',
    ':::figure{src="https://c.png" alt="C"}',
    "Legenda",
    ":::",
  ].join("\n");

  const blocks = parseMarkdownBlocks(source);
  const directives = blocks.filter((block) => block.kind === "directive");

  assert.equal(directives.length, 3);
  assert.equal(directives[0].kind === "directive" && directives[0].directive.name, "image");
  assert.equal(directives[0].kind === "directive" && directives[0].directive.attributes.src, "https://a.png");
  assert.equal(directives[1].kind === "directive" && directives[1].directive.name, "image");
  assert.equal(directives[2].kind === "directive" && directives[2].directive.name, "figure");
  assert.equal(directives[2].kind === "directive" && directives[2].directive.body, "Legenda");
});
