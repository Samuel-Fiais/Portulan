import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeBase64Content, stripBase64Payload } from "./blob-base64.ts";

test("stripBase64Payload remove prefixo data URL", () => {
  assert.equal(stripBase64Payload("data:image/png;base64,abc123"), "abc123");
  assert.equal(stripBase64Payload("abc123"), "abc123");
});

test("decodeBase64Content decodifica bytes válidos", () => {
  const encoded = Buffer.from("hello").toString("base64");
  const result = decodeBase64Content(encoded);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.buffer.toString("utf8"), "hello");
  }
});

test("decodeBase64Content rejeita payload vazio", () => {
  const result = decodeBase64Content("   ");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /ausente/i);
  }
});

test("decodeBase64Content rejeita payload que não decodifica conteúdo", () => {
  const result = decodeBase64Content("!!!");
  assert.equal(result.ok, false);
});
