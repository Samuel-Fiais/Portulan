import assert from "node:assert/strict";
import test from "node:test";
import {
  collabRealtimeMasterEnabled,
  collabRealtimeScopeEnabled,
} from "./collab-feature-flags.ts";

test("flags master e por escopo respeitam PORTULAN_COLLAB_*", () => {
  const prevMaster = process.env.PORTULAN_COLLAB_REALTIME;
  const prevCommands = process.env.PORTULAN_COLLAB_COMMANDS;
  try {
    process.env.PORTULAN_COLLAB_REALTIME = "0";
    assert.equal(collabRealtimeMasterEnabled(), false);
    assert.equal(collabRealtimeScopeEnabled("presence"), false);
    process.env.PORTULAN_COLLAB_REALTIME = "1";
    process.env.PORTULAN_COLLAB_COMMANDS = "0";
    assert.equal(collabRealtimeMasterEnabled(), true);
    assert.equal(collabRealtimeScopeEnabled("commands"), false);
    assert.equal(collabRealtimeScopeEnabled("presence"), true);
  } finally {
    if (prevMaster === undefined) delete process.env.PORTULAN_COLLAB_REALTIME;
    else process.env.PORTULAN_COLLAB_REALTIME = prevMaster;
    if (prevCommands === undefined) delete process.env.PORTULAN_COLLAB_COMMANDS;
    else process.env.PORTULAN_COLLAB_COMMANDS = prevCommands;
  }
});
