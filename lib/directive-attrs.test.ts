import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAttributes, parseDirectiveOpener } from "./directive-attrs.ts";

describe("parseDirectiveOpener", () => {
  it("matches openers without attributes", () => {
    assert.deepEqual(parseDirectiveOpener(":::alert"), { name: "alert", attributeSource: "" });
  });

  it("matches openers with normal attributes", () => {
    const opener = parseDirectiveOpener(':::api{method="GET" path="/x"}');
    assert.deepEqual(opener, { name: "api", attributeSource: 'method="GET" path="/x"' });
    assert.deepEqual(parseAttributes(opener!.attributeSource), { method: "GET", path: "/x" });
  });

  it("allows braces inside double-quoted attribute values", () => {
    const opener = parseDirectiveOpener(
      ':::api{method="GET" path="/api/v1/wallets/{walletId}/grades"}',
    );
    assert.deepEqual(opener, {
      name: "api",
      attributeSource: 'method="GET" path="/api/v1/wallets/{walletId}/grades"',
    });
    assert.deepEqual(parseAttributes(opener!.attributeSource), {
      method: "GET",
      path: "/api/v1/wallets/{walletId}/grades",
    });
  });

  it("allows multiple attributes with braces in values", () => {
    const opener = parseDirectiveOpener(':::api{method="PATCH" path="/x/{id}" auth="Bearer {token}"}');
    assert.deepEqual(parseAttributes(opener!.attributeSource), {
      method: "PATCH",
      path: "/x/{id}",
      auth: "Bearer {token}",
    });
  });

  it("rejects malformed openers", () => {
    assert.equal(parseDirectiveOpener(':::api{method="GET" path="/x"'), null);
    assert.equal(parseDirectiveOpener(":::alert trailing"), null);
  });
});
