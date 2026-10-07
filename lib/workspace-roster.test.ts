import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceRoster,
  workspaceRosterNote,
  workspaceRosterStats,
} from "./workspace-roster.ts";

test("buildWorkspaceRoster lista a tripulação humana", () => {
  const roster = buildWorkspaceRoster([
    {
      id: "m1",
      workspaceId: "ws",
      userId: "u1",
      role: "owner",
      createdAt: "2026-01-01",
      login: "sam",
      name: "Samuel",
      email: "sam@example.com",
      avatarUrl: null,
    },
  ]);
  assert.equal(roster.length, 1);
  assert.equal(roster[0]?.kind, "human");
  assert.equal(roster[0]?.member.login, "sam");
});

test("workspaceRosterNote descreve a tripulação", () => {
  assert.equal(workspaceRosterNote(workspaceRosterStats([])), "tripulantes");
  assert.equal(
    workspaceRosterNote(workspaceRosterStats([{ kind: "human", member: {} as never }])),
    "tripulante",
  );
});
