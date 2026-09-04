import assert from "node:assert/strict";
import test from "node:test";
import { hrefFromValue, looksLikeHref } from "./report-links.ts";

test("looksLikeHref reconhece rotas internas e URLs", () => {
  assert.equal(looksLikeHref("https://portulan.app/d/roadmap"), true);
  assert.equal(looksLikeHref("/d/roadmap"), true);
  assert.equal(looksLikeHref("/p/abc"), true);
  assert.equal(looksLikeHref("mailto:ops@example.com"), true);
  assert.equal(looksLikeHref("Roadmap trimestral"), false);
  assert.equal(hrefFromValue("  /d/roadmap  "), "/d/roadmap");
  assert.equal(hrefFromValue("sem link"), undefined);
});
