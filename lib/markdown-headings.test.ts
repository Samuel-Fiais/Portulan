import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createHeadingIdSource,
  extractMarkdownHeadings,
  plainHeadingText,
  slugifyHeading,
} from "./markdown-headings.ts";

describe("markdown-headings", () => {
  it("slugifies accented Portuguese text", () => {
    assert.equal(slugifyHeading("Visão Geral"), "visao-geral");
  });

  it("strips inline markdown for display", () => {
    assert.equal(plainHeadingText("**Status** e `código`"), "Status e código");
  });

  it("extracts ## and ### headings in order", () => {
    const source = [
      "## 1 Introdução",
      "texto",
      "### Contexto",
      "## Próximos passos",
      "### Detalhes",
    ].join("\n");

    assert.deepEqual(extractMarkdownHeadings(source), [
      { id: "1-introducao", level: 2, text: "1 Introdução" },
      { id: "contexto", level: 3, text: "Contexto" },
      { id: "proximos-passos", level: 2, text: "Próximos passos" },
      { id: "detalhes", level: 3, text: "Detalhes" },
    ]);
  });

  it("deduplicates repeated heading slugs", () => {
    const source = "## Resumo\n### Resumo\n## Resumo";
    assert.deepEqual(extractMarkdownHeadings(source).map((heading) => heading.id), [
      "resumo",
      "resumo-1",
      "resumo-2",
    ]);
  });

  it("consumes heading ids in render order", () => {
    const headings = extractMarkdownHeadings("## A\n### B\n## C");
    const source = createHeadingIdSource(headings);

    assert.equal(source.consume(2), "a");
    assert.equal(source.consume(3), "b");
    assert.equal(source.consume(2), "c");
    assert.equal(source.consume(3), undefined);
  });
});
