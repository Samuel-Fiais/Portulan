"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collabEventActivitySummary,
  type CollabActivityEventView,
} from "@/lib/collab-activity-labels";
import type { CollabEventRecord } from "@/lib/collab-events";
import { collabEventsApiPath, collabContentQuery } from "@/lib/collab-content-client";
import { collabRealtimeClientEnabled } from "@/lib/collab-feature-flags";

type UseCollabActivityInput = {
  subjectType: string;
  subjectId: string;
  workspaceId?: string | null;
  enabled?: boolean;
  pollMs?: number;
  actorNames?: Record<string, string>;
  agentNames?: Record<string, string>;
};

function mapEvent(
  event: CollabEventRecord,
  actorNames: Record<string, string>,
  agentNames: Record<string, string>,
): CollabActivityEventView {
  const isAgent = Boolean(event.agentIdentityId);
  const humanName = event.userId ? (actorNames[event.userId] ?? "Tripulante") : "Tripulante";
  const agentName = event.agentIdentityId ? (agentNames[event.agentIdentityId] ?? "Agente") : null;
  const payload = event.payload ?? null;
  const correlationId =
    payload && typeof payload.correlationId === "string" ? payload.correlationId : null;

  return {
    id: event.id,
    seq: event.seq,
    type: event.type,
    createdAt: event.createdAt,
    kind: isAgent ? "agent" : "human",
    displayName: isAgent ? (agentName ?? "Agente") : humanName,
    viaAgent: isAgent ? humanName : null,
    intention: event.intention,
    summary: collabEventActivitySummary(event.type, payload),
    correlationId,
    payload,
  };
}

export function useCollabActivity({
  subjectType,
  subjectId,
  workspaceId,
  enabled = true,
  pollMs = 12_000,
  actorNames = {},
  agentNames = {},
}: UseCollabActivityInput) {
  const [events, setEvents] = useState<CollabActivityEventView[]>([]);
  const [latestSeq, setLatestSeq] = useState(0);
  const [loading, setLoading] = useState(true);
  const seqRef = useRef(0);
  const collabOn =
    enabled && collabRealtimeClientEnabled("activity") && collabRealtimeClientEnabled("commands");

  const fetchPage = useCallback(async () => {
    if (!collabOn) {
      setLoading(false);
      return;
    }
    const path = `${collabEventsApiPath(subjectType, subjectId)}${collabContentQuery(workspaceId)}`;
    const since = seqRef.current;
    const url = since > 0 ? `${path}${path.includes("?") ? "&" : "?"}since=${since}` : path;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as {
      events?: CollabEventRecord[];
      latestSeq?: number;
    };
    const incoming = (payload.events ?? []).map((event) => mapEvent(event, actorNames, agentNames));
    if (incoming.length) {
      setEvents((current) => {
        const merged = [...current];
        for (const event of incoming) {
          if (!merged.some((item) => item.id === event.id)) merged.push(event);
        }
        return merged.sort((a, b) => a.seq - b.seq);
      });
      const maxSeq = Math.max(...incoming.map((event) => event.seq), seqRef.current);
      seqRef.current = maxSeq;
      setLatestSeq(maxSeq);
    } else if (typeof payload.latestSeq === "number" && payload.latestSeq > seqRef.current) {
      seqRef.current = payload.latestSeq;
      setLatestSeq(payload.latestSeq);
    }
    setLoading(false);
  }, [actorNames, agentNames, collabOn, subjectId, subjectType, workspaceId]);

  useEffect(() => {
    seqRef.current = 0;
    setEvents([]);
    setLoading(true);
    void fetchPage();
    if (!collabOn) return;
    const timer = window.setInterval(() => void fetchPage(), pollMs);
    return () => window.clearInterval(timer);
  }, [collabOn, fetchPage, pollMs, subjectId, subjectType, workspaceId]);

  return { events, latestSeq, loading, enabled: collabOn };
}
