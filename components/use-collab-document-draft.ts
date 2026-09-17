"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CollabDocumentOpField } from "@/lib/collab-content-ops";
import {
  applyCollabContentSnapshot,
  COLLAB_CONTENT_DEBOUNCE_MS,
  collabSnapshotFieldValue,
  createCollabContentIdempotencyKey,
  fetchCollabContentRoom,
  postCollabContentOperation,
} from "@/lib/collab-content-client";
import type { CollabIntention } from "@/lib/collab-presence";
import type { DocumentRecord } from "@/lib/documents";

type PendingOp = {
  field: CollabDocumentOpField;
  value: string;
  timer: ReturnType<typeof setTimeout>;
};

type UseCollabDocumentDraftInput = {
  document: DocumentRecord;
  canEdit: boolean;
  intention: CollabIntention;
  onDocumentChange: (next: DocumentRecord) => void;
  onSavedFieldsChange: (next: DocumentRecord) => void;
};

export function useCollabDocumentDraft({
  document,
  canEdit,
  intention,
  onDocumentChange,
  onSavedFieldsChange,
}: UseCollabDocumentDraftInput) {
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [collabPending, setCollabPending] = useState(false);
  const [collabConflict, setCollabConflict] = useState<string | null>(null);

  const draftVersionRef = useRef(document.draftVersion);
  const policyVersionRef = useRef<number | null>(null);
  const pendingRef = useRef<Map<CollabDocumentOpField, PendingOp>>(new Map());
  const inflightRef = useRef(0);
  const documentRef = useRef(document);
  documentRef.current = document;

  useEffect(() => {
    draftVersionRef.current = document.draftVersion;
  }, [document.draftVersion, document.id]);

  useEffect(() => {
    if (!canEdit || !document.workspaceId) {
      setCollabEnabled(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const room = await fetchCollabContentRoom(
        "document",
        document.id,
        document.workspaceId,
        policyVersionRef.current,
      );
      if (cancelled) return;
      if (!room.ok || !room.room.canOperate) {
        setCollabEnabled(false);
        return;
      }
      policyVersionRef.current = room.room.policyVersion;
      setCollabEnabled(true);
      if (room.contentSnapshot) {
        const synced = applyCollabContentSnapshot(documentRef.current, room.contentSnapshot);
        draftVersionRef.current = synced.draftVersion;
        onDocumentChange(synced);
        onSavedFieldsChange(synced);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEdit, document.id, document.workspaceId, onDocumentChange, onSavedFieldsChange]);

  const bumpInflight = useCallback((delta: number) => {
    inflightRef.current += delta;
    setCollabPending(inflightRef.current > 0 || pendingRef.current.size > 0);
  }, []);

  const sendOperation = useCallback(
    async (field: CollabDocumentOpField, value: string, baseVersion: number, allowRetry: boolean) => {
      if (!documentRef.current.workspaceId) return false;
      bumpInflight(1);
      try {
        const result = await postCollabContentOperation({
          subjectType: "document",
          subjectId: documentRef.current.id,
          workspaceId: documentRef.current.workspaceId,
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
          const current = documentRef.current;
          const synced: DocumentRecord = {
            ...current,
            draftVersion: result.contentVersion,
            [field]: value,
          };
          onSavedFieldsChange(synced);
          onDocumentChange({ ...current, draftVersion: result.contentVersion });
          setCollabConflict(null);
          return true;
        }

        if (result.room) {
          policyVersionRef.current = result.room.policyVersion;
        }

        if (result.conflict && result.snapshot) {
          const rebased = applyCollabContentSnapshot(documentRef.current, result.snapshot);
          draftVersionRef.current = rebased.draftVersion;
          onDocumentChange(rebased);
          onSavedFieldsChange(rebased);
          setCollabConflict(result.error);

          const localValue = documentRef.current[field];
          const serverValue = collabSnapshotFieldValue(result.snapshot, field);
          if (
            allowRetry &&
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
    [bumpInflight, intention, onDocumentChange, onSavedFieldsChange],
  );

  const flushField = useCallback(
    async (field: CollabDocumentOpField) => {
      const pending = pendingRef.current.get(field);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current.delete(field);
      }
      const value = documentRef.current[field];
      return sendOperation(field, value, draftVersionRef.current, true);
    },
    [sendOperation],
  );

  const queueCollabPatch = useCallback(
    (field: CollabDocumentOpField, value: string) => {
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
      const ok = await flushField(field);
      if (!ok) return false;
    }
    return true;
  }, [collabEnabled, flushField]);

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
