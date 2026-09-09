import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentMatchesSearchQuery } from "./document-search.ts";

describe("documentMatchesSearchQuery", () => {
  const document = {
    title: "Relatório de incidente",
    summary: "Falha no webhook de pagamento",
    tags: ["incident", "webhook"],
    content: "## Contexto\n\nO serviço PIX caiu às 14h.\n",
  };

  it("matches title, summary and tags", () => {
    assert.equal(documentMatchesSearchQuery(document, "incident"), true);
    assert.equal(documentMatchesSearchQuery(document, "webhook"), true);
    assert.equal(documentMatchesSearchQuery(document, "relatório"), true);
  });

  it("matches body content", () => {
    assert.equal(documentMatchesSearchQuery(document, "PIX"), true);
    assert.equal(documentMatchesSearchQuery(document, "14h"), true);
    assert.equal(documentMatchesSearchQuery(document, "contexto"), true);
  });

  it("returns true for empty query", () => {
    assert.equal(documentMatchesSearchQuery(document, ""), true);
    assert.equal(documentMatchesSearchQuery(document, "   "), true);
  });

  it("returns false when nothing matches", () => {
    assert.equal(documentMatchesSearchQuery(document, "kubernetes"), false);
  });
});
