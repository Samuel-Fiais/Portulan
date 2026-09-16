import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceRoster,
  workspaceRosterNote,
  workspaceRosterStats,
} from "./workspace-roster.ts";

test("buildWorkspaceRoster intercala humanos e agentes", () => {
  const roster = buildWorkspaceRoster({
    members: [
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
    ],
    agents: [
      {
        id: "a1",
        workspaceId: "ws",
        ownerUserId: "u1",
        name: "Assistente",
        workMode: "context_and_coordination",
        allowedMcpTools: [],
        status: "active",
        deactivatedAt: null,
        createdAt: "2026-01-02",
        updatedAt: "2026-01-02",
      },
    ],
    ownerNames: { u1: "Samuel" },
  });
  assert.equal(roster.length, 2);
  assert.equal(roster[0]?.kind, "human");
  assert.equal(roster[1]?.kind, "agent");
  if (roster[1]?.kind === "agent") {
    assert.equal(roster[1].ownerName, "Samuel");
  }
});

test("workspaceRosterNote descreve humanos e agentes", () => {
  const stats = workspaceRosterStats([
    { kind: "human", member: {} as never },
    { kind: "agent", agent: { status: "active" } as never, ownerName: "Samuel" },
  ]);
  assert.equal(workspaceRosterNote(stats), "1 humano · 1 agente");
});
