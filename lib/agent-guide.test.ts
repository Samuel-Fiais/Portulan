import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentGuide } from "./agent-guide.ts";

test("Guia do Agente: humano só cola guia; agente faz o setup", () => {
  const guide = buildAgentGuide({
    name: "Assistente",
    ownerName: "Samuel",
    allowedToolCount: 32,
    totalToolCount: 32,
  });
  assert.match(guide, /cola este guia no chat/i);
  assert.match(guide, /Só isso/i);
  assert.match(guide, /Sua checklist \(agente\)/i);
  assert.match(guide, /export PORTULAN_TOKEN/);
  assert.match(guide, /http_headers/);
  assert.match(guide, /Pedir ao humano.*export/i);
  assert.match(guide, /get_system_guide/);
  assert.match(guide, /list_workspaces/);
  const withoutPaths = guide.replace(/`[^`]*\.(cursor|codex)[^`]*`/g, "`<config-model>`");
  assert.doesNotMatch(withoutPaths, /Cursor|Claude|Codex|Composer|ChatGPT/i);
  assert.doesNotMatch(guide, /configure.*você mesmo/i);
});
