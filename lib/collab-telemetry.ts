/**
 * Telemetria operacional leve de salas, eventos e auditoria (RN-124, fluxos.md).
 * Em produção pode ser ligada a drains; aqui registra contadores em memória para testes.
 */

type CollabTelemetryCounters = {
  commandAnnounced: number;
  commandFailed: number;
  mcpAuditRecorded: number;
  mcpAuditDenied: number;
  collabRequestBlocked: number;
};

const counters: CollabTelemetryCounters = {
  commandAnnounced: 0,
  commandFailed: 0,
  mcpAuditRecorded: 0,
  mcpAuditDenied: 0,
  collabRequestBlocked: 0,
};

export function collabTelemetrySnapshot(): Readonly<CollabTelemetryCounters> {
  return { ...counters };
}

export function collabTelemetryReset() {
  counters.commandAnnounced = 0;
  counters.commandFailed = 0;
  counters.mcpAuditRecorded = 0;
  counters.mcpAuditDenied = 0;
  counters.collabRequestBlocked = 0;
}

export function trackCollabCommandAnnounced() {
  counters.commandAnnounced += 1;
}

export function trackCollabCommandFailed() {
  counters.commandFailed += 1;
}

export function trackMcpAuditRecorded(denied = false) {
  if (denied) counters.mcpAuditDenied += 1;
  else counters.mcpAuditRecorded += 1;
}

export function trackCollabRequestBlocked() {
  counters.collabRequestBlocked += 1;
}
