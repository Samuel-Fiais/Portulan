import assert from "node:assert/strict";
import test from "node:test";
import {
  PORTULAN_CLOUD_URL,
  portulanMcpUrl,
  resolvePortulanEndpoint,
} from "./portulan-endpoint.ts";

test("endpoint padrão é a cloud", () => {
  const prev = process.env.PORTULAN_ENDPOINT;
  delete process.env.PORTULAN_ENDPOINT;
  delete process.env.PORTULAN_PUBLIC_URL;
  assert.equal(resolvePortulanEndpoint(), PORTULAN_CLOUD_URL);
  assert.equal(portulanMcpUrl(), `${PORTULAN_CLOUD_URL}/api/mcp`);
  if (prev) process.env.PORTULAN_ENDPOINT = prev;
});

test("resolvePortulanEndpoint respeita override explícito", () => {
  assert.equal(resolvePortulanEndpoint("https://custom.example/"), "https://custom.example");
});
