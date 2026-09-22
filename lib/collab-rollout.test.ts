import assert from "node:assert/strict";
import test from "node:test";
import { collabTelemetryReset, collabTelemetrySnapshot, trackCollabCommandAnnounced } from "./collab-telemetry.ts";
import { collabEventActivitySummary } from "./collab-activity-labels.ts";

test("telemetria de rollout acumula comandos anunciados", () => {
  collabTelemetryReset();
  trackCollabCommandAnnounced();
  trackCollabCommandAnnounced();
  assert.equal(collabTelemetrySnapshot().commandAnnounced, 2);
});

test("atividade distingue comando de handoff e agente", () => {
  assert.equal(
    collabEventActivitySummary("command.applied", { command: "handoff" }),
    "Passagem de comando",
  );
  assert.equal(
    collabEventActivitySummary("presence.updated", null),
    "Atualizou a presença",
  );
});
