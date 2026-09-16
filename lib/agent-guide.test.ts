import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentGuide } from "./agent-guide.ts";

test("Guia do Agente: humano só cola guia; agente faz o setup", () => {
  const guide = buildAgentGuide({
    name: "Assistente",
    ownerName: "Samuel",
    allowedToolCount: 49,
    totalToolCount: 49,
  });
  assert.match(guide, /cola este guia no chat/i);
  assert.match(guide, /Só isso/i);
  assert.match(guide, /Sua checklist \(agente\)/i);
  assert.match(guide, /export PORTULAN_TOKEN/);
  assert.match(guide, /http_headers/);
  assert.match(guide, /Pedir ao humano.*export/i);
  assert.match(guide, /portulan init/);
  assert.match(guide, /get_agent_bootstrap/);
  assert.match(guide, /Carta de conclusão/i);
  assert.match(guide, /add_implementation_task_source/);
  const withoutPaths = guide.replace(/`[^`]*\.(cursor|codex)[^`]*`/g, "`<config-model>`");
  assert.doesNotMatch(withoutPaths, /Cursor|Claude|Codex|Composer|ChatGPT/i);
  assert.doesNotMatch(guide, /configure.*você mesmo/i);
});
