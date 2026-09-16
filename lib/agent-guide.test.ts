import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentGuide } from "./agent-guide.ts";

test("Guia do Agente cobre auto-configuração ponta a ponta", () => {
  const guide = buildAgentGuide({
    name: "Cursor",
    ownerName: "Samuel",
    allowedToolCount: 49,
    totalToolCount: 49,
  });
  assert.match(guide, /portulan init/);
  assert.match(guide, /portulan doctor/);
  assert.match(guide, /get_agent_bootstrap/);
  assert.match(guide, /\.cursor\/mcp\.json/);
  assert.match(guide, /PORTULAN_TOKEN/);
  assert.match(guide, /RN-106/);
  assert.match(guide, /portulan\.vercel\.app/);
});
