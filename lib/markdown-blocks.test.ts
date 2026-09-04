import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMarkdownBlocks } from "./directive-attrs.ts";

test("parseMarkdownBlocks trata :::report como diretiva de uma linha", () => {
  const blocks = parseMarkdownBlocks(':::report{slug="roadmap" title="Roadmap" summary="Resumo."}');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "directive");
  if (blocks[0].kind === "directive") {
    assert.equal(blocks[0].directive.name, "report");
    assert.equal(blocks[0].directive.attributes.slug, "roadmap");
  }
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
