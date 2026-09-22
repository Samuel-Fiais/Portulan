/**
 * Feature flags da colaboração ao vivo (RN-119, RN-124). Desligar o canal reverte
 * superfícies para leitura e comando normais — nunca bloqueia o trabalho.
 */

export type CollabRealtimeScope = "presence" | "activity" | "coedit" | "commands";

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[name];
}

function flagEnabled(name: string, defaultOn = true): boolean {
  const raw = readEnv(name);
  if (raw === undefined || raw === "") return defaultOn;
  return raw !== "0" && raw.toLowerCase() !== "false" && raw.toLowerCase() !== "off";
}

/** Master switch — `PORTULAN_COLLAB_REALTIME=0` desliga todo o canal. */
export function collabRealtimeMasterEnabled(): boolean {
  return flagEnabled("PORTULAN_COLLAB_REALTIME", true);
}

export function collabRealtimeScopeEnabled(scope: CollabRealtimeScope): boolean {
  if (!collabRealtimeMasterEnabled()) return false;
  const scoped = readEnv(`PORTULAN_COLLAB_${scope.toUpperCase()}`);
  if (scoped === undefined || scoped === "") return true;
  return scoped !== "0" && scoped.toLowerCase() !== "false" && scoped.toLowerCase() !== "off";
}

/** Variante para componentes client (`NEXT_PUBLIC_…`). */
export function collabRealtimeClientEnabled(scope: CollabRealtimeScope = "presence"): boolean {
  if (typeof window !== "undefined") {
    const master = readEnv("NEXT_PUBLIC_PORTULAN_COLLAB_REALTIME");
    if (master === "0" || master?.toLowerCase() === "false") return false;
    const scoped = readEnv(`NEXT_PUBLIC_PORTULAN_COLLAB_${scope.toUpperCase()}`);
    if (scoped === "0" || scoped?.toLowerCase() === "false") return false;
  }
  return collabRealtimeScopeEnabled(scope);
}
