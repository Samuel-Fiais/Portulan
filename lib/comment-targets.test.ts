import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COVER_SUMMARY_ANCHOR,
  COVER_TITLE_ANCHOR,
  commentBlockAnchorId,
  commentTargetIds,
  extractCommentTargets,
} from "./comment-targets.ts";

test("extractCommentTargets inclui capa, títulos e blocos", () => {
  const source = [
    "## Visão geral",
    "",
    "Parágrafo de contexto.",
    "",
    "### Detalhe",
    "",
    "Mais texto.",
    "",
    ":::alert{title=\"Atenção\"}",
    "Cuidado com o limite.",
    ":::",
  ].join("\n");

  const targets = extractCommentTargets(source);
  const ids = targets.map((target) => target.id);

  assert.ok(ids.includes(COVER_TITLE_ANCHOR));
  assert.ok(ids.includes(COVER_SUMMARY_ANCHOR));
  assert.ok(ids.includes("visao-geral"));
  assert.ok(ids.includes("detalhe"));
  assert.ok(ids.includes(commentBlockAnchorId(0, 0)));
  assert.equal(targets.find((target) => target.id === "visao-geral")?.kind, "heading");
  assert.equal(targets.find((target) => target.id === commentBlockAnchorId(0, 1))?.label, "Alerta · Atenção");
});

test("extractCommentTargets usa o nome do componente, não a diretiva", () => {
  const source = "## Dados\n\n:::kv\n- Ambiente | Produção\n:::\n";
  const targets = extractCommentTargets(source);
  const kv = targets.find((target) => target.id === commentBlockAnchorId(0, 0));
  assert.equal(kv?.label, "Chave e valor · Ambiente");
});

test("commentTargetIds é estável para o mesmo Markdown", () => {
  const source = "## A\n\nTexto\n";
  assert.deepEqual(commentTargetIds(source), commentTargetIds(source));
});
