"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollabContentOpField } from "@/lib/collab-content-ops";
import {
  COLLAB_CONTENT_DEBOUNCE_MS,
  collabSnapshotFieldValue,
  createCollabContentIdempotencyKey,
  fetchCollabContentRoom,
  postCollabContentOperation,
} from "@/lib/collab-content-client";
import type { CollabIntention } from "@/lib/collab-presence";

type PendingOp = {
  field: CollabContentOpField;
  value: string;
  timer: ReturnType<typeof setTimeout>;
};

type UseCollabFieldDraftInput = {
  subjectType: string;
  subjectId: string;
  workspaceId: string;
  canEdit: boolean;
  intention: CollabIntention;
  draftVersion: number;
  onDraftVersionChange: (next: number) => void;
  onFieldSynced: (field: CollabContentOpField, value: string, contentVersion: number) => void;
  readField: (field: CollabContentOpField) => string;
};

export function useCollabFieldDraft({
  subjectType,
  subjectId,
  workspaceId,
  canEdit,
  intention,
  draftVersion,
  onDraftVersionChange,
  onFieldSynced,
  readField,
}: UseCollabFieldDraftInput) {
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [collabPending, setCollabPending] = useState(false);
  const [collabConflict, setCollabConflict] = useState<string | null>(null);

  const draftVersionRef = useRef(draftVersion);
  const policyVersionRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<CollabContentOpField, PendingOp>>(new Map());
  const inflightRef = useRef(0);

  useEffect(() => {
    draftVersionRef.current = draftVersion;
  }, [draftVersion, subjectId]);

  useEffect(() => {
    if (!canEdit || !workspaceId) {
      setCollabEnabled(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const room = await fetchCollabContentRoom(subjectType, subjectId, workspaceId, policyVersionRef.current);
      if (cancelled) return;
      if (!room.ok || !room.room.canOperate) {
        setCollabEnabled(false);
        return;
      }
      policyVersionRef.current = room.room.policyVersion;
      setCollabEnabled(true);
      if (room.contentSnapshot) {
        draftVersionRef.current = room.contentSnapshot.contentVersion;
        onDraftVersionChange(room.contentSnapshot.contentVersion);
        for (const [field, value] of Object.entries(room.contentSnapshot.fields)) {
          if (typeof value === "string") {
            onFieldSynced(field as CollabContentOpField, value, room.contentSnapshot.contentVersion);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEdit, onDraftVersionChange, onFieldSynced, subjectId, subjectType, workspaceId]);

  const bumpInflight = useCallback((delta: number) => {
    inflightRef.current += delta;
    setCollabPending(inflightRef.current > 0 || pendingRef.current.size > 0);
  }, []);

  const sendOperation = useCallback(
    async (field: CollabContentOpField, value: string, baseVersion: number, allowRetry: boolean) => {
      bumpInflight(1);
      try {
        const result = await postCollabContentOperation({
          subjectType,
          subjectId,
          workspaceId,
          policyVersion: policyVersionRef.current,
          intention,
          field,
          value,
          baseVersion,
          idempotencyKey: createCollabContentIdempotencyKey(),
        });

        if (result.ok) {
          policyVersionRef.current = result.room.policyVersion;
          draftVersionRef.current = result.contentVersion;
          onDraftVersionChange(result.contentVersion);
          onFieldSynced(field, value, result.contentVersion);
          setCollabConflict(null);
          return true;
        }

        if (result.room) {
          policyVersionRef.current = result.room.policyVersion;
        }

        if (result.conflict && result.snapshot) {
          draftVersionRef.current = result.snapshot.contentVersion;
          onDraftVersionChange(result.snapshot.contentVersion);
          const serverValue = collabSnapshotFieldValue(result.snapshot, field);
          if (serverValue !== undefined) {
            onFieldSynced(field, serverValue, result.snapshot.contentVersion);
          }
          setCollabConflict(result.error);

          const localValue = readField(field);
          if (
            allowRetry &&
            serverValue !== undefined &&
            localValue !== serverValue &&
            typeof result.contentVersion === "number"
          ) {
            return sendOperation(field, localValue, result.contentVersion, false);
          }
          return false;
        }

        setCollabConflict(result.error);
        return false;
      } finally {
        bumpInflight(-1);
      }
    },
    [bumpInflight, intention, onDraftVersionChange, onFieldSynced, readField, subjectId, subjectType, workspaceId],
  );

  const queueCollabPatch = useCallback(
    (field: CollabContentOpField, value: string) => {
      if (!collabEnabled) return;
      const existing = pendingRef.current.get(field);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(() => {
        pendingRef.current.delete(field);
        setCollabPending(inflightRef.current > 0 || pendingRef.current.size > 0);
        void sendOperation(field, value, draftVersionRef.current, true);
      }, COLLAB_CONTENT_DEBOUNCE_MS);

      pendingRef.current.set(field, { field, value, timer });
      setCollabPending(true);
    },
    [collabEnabled, sendOperation],
  );

  const flushCollab = useCallback(async () => {
    if (!collabEnabled) return true;
    const fields = [...pendingRef.current.keys()];
    for (const field of fields) {
      const pending = pendingRef.current.get(field);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current.delete(field);
      }
      const ok = await sendOperation(field, readField(field), draftVersionRef.current, true);
      if (!ok) return false;
    }
    return true;
  }, [collabEnabled, readField, sendOperation]);

  useEffect(
    () => () => {
      for (const pending of pendingRef.current.values()) {
        clearTimeout(pending.timer);
      }
      pendingRef.current.clear();
    },
    [],
  );

  return {
    collabEnabled,
    collabPending,
    collabConflict,
    clearCollabConflict: () => setCollabConflict(null),
    queueCollabPatch,
    flushCollab,
  };
}
