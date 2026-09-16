import assert from "node:assert/strict";
import test from "node:test";
import { parseBoardLocator } from "./board-locator.ts";

test("parseBoardLocator aceita inteiro, #n e UUID", () => {
  assert.deepEqual(parseBoardLocator("42"), { boardNumber: 42 });
  assert.deepEqual(parseBoardLocator("#42"), { boardNumber: 42 });
  assert.equal(parseBoardLocator("0"), null);
  assert.equal(parseBoardLocator("#0"), null);
  const uuid = parseBoardLocator("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  assert.ok(uuid && "uuid" in uuid);
  assert.equal(parseBoardLocator("POR-123"), null);
});
