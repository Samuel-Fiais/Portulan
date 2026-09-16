import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentGuide } from "./agent-guide.ts";

test("Guia do Agente deixa claro que o humano passa a chave", () => {
  const guide = buildAgentGuide({
    name: "Cursor",
    ownerName: "Samuel",
    allowedToolCount: 49,
    totalToolCount: 49,
  });
  assert.match(guide, /não abre Instrumentos/i);
  assert.match(guide, /entrega.*ptl_/i);
  assert.match(guide, /portulan init/);
  assert.match(guide, /get_agent_bootstrap/);
  assert.match(guide, /portulan\.vercel\.app/);
  assert.doesNotMatch(guide, /Abra \*\*Instrumentos\*\*/i);
});
