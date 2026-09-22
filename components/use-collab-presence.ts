"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collabPresenceApiPath,
  collabPresencePollMs,
  collabPresenceQuery,
  type CollabPresenceParticipant,
  type CollabPresenceRoom,
} from "@/lib/collab-presence-client";
import { collabRealtimeClientEnabled } from "@/lib/collab-feature-flags";
import type { CollabIntention } from "@/lib/collab-presence";

type UseCollabPresenceInput = {
  subjectType: string;
  subjectId: string;
  workspaceId?: string | null;
  intention: CollabIntention;
  enabled?: boolean;
};

export function useCollabPresence({
  subjectType,
  subjectId,
  workspaceId,
  intention,
  enabled = true,
}: UseCollabPresenceInput) {
  const collabOn = enabled && collabRealtimeClientEnabled("presence");
  const [participants, setParticipants] = useState<CollabPresenceParticipant[]>([]);
  const [room, setRoom] = useState<CollabPresenceRoom | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const policyRef = useRef<number | null>(null);
  const intentionRef = useRef(intention);
  intentionRef.current = intention;

  const basePath = collabPresenceApiPath(subjectType, subjectId);

  const heartbeat = useCallback(async () => {
    if (!collabOn || accessLost) return;
    const policyVersion = policyRef.current;
    const response = await fetch(`${basePath}${collabPresenceQuery(workspaceId, policyVersion)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: policyVersion == null ? "join" : "heartbeat",
        intention: intentionRef.current,
      }),
    });
    if (response.status === 403) {
      setAccessLost(true);
      setParticipants([]);
      const payload = (await response.json().catch(() => null)) as { room?: CollabPresenceRoom } | null;
      if (payload?.room) {
        policyRef.current = payload.room.policyVersion;
        setRoom(payload.room);
      }
      return;
    }
    if (!response.ok) return;
    const payload = (await response.json()) as {
      room?: CollabPresenceRoom;
      presence?: CollabPresenceParticipant[];
    };
    if (payload.room) {
      policyRef.current = payload.room.policyVersion;
      setRoom(payload.room);
    }
    setParticipants(payload.presence ?? []);
    setAccessLost(false);
  }, [accessLost, basePath, collabOn, workspaceId]);

  useEffect(() => {
    if (!collabOn) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await heartbeat();
    };
    void tick();
    const interval = window.setInterval(() => void tick(), collabPresencePollMs());
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      void fetch(`${basePath}${collabPresenceQuery(workspaceId, policyRef.current)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", intention: intentionRef.current }),
      }).catch(() => undefined);
    };
  }, [basePath, collabOn, heartbeat, workspaceId]);

  useEffect(() => {
    if (!collabOn || accessLost) return;
    void heartbeat();
  }, [intention, collabOn, accessLost, heartbeat]);

  return { participants, room, accessLost, enabled: collabOn };
}
