"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { updateDocumentContentAction } from "@/app/actions";
import {
  applyLivingDocumentMutation,
  type TestcaseStatus,
} from "@/lib/living-document-mutations";
import { writeChecklistItemChecked } from "@/lib/living-document-storage";

type LivingDocumentContextValue = {
  interactive: boolean;
  persistable: boolean;
  documentKey: string;
  content: string;
  toggleChecklistItem: (sectionIndex: number, blockIndex: number, itemFingerprint: string, checked: boolean) => void;
  updateTestcaseStatus: (testcaseId: string, status: TestcaseStatus) => void;
};

const LivingDocumentContext = createContext<LivingDocumentContextValue | null>(null);

export function useLivingDocument() {
  return useContext(LivingDocumentContext);
}

const PERSIST_DEBOUNCE_MS = 450;

export function LivingDocumentProvider({
  children,
  interactive,
  persistable,
  documentId,
  documentKey,
  content,
  onContentChange,
}: {
  children: ReactNode;
  interactive: boolean;
  persistable: boolean;
  documentId: string;
  documentKey: string;
  content: string;
  onContentChange?: (content: string) => void;
}) {
  const contentRef = useRef(content);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPersistRef = useRef<string | null>(null);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const flushPersist = useCallback(async () => {
    const nextContent = pendingPersistRef.current;
    pendingPersistRef.current = null;
    if (!nextContent || !persistable) return;

    const result = await updateDocumentContentAction(documentId, nextContent);
    if (!result.ok) {
      toast.error(result.error);
    }
  }, [documentId, persistable]);

  const schedulePersist = useCallback(
    (nextContent: string) => {
      if (!persistable) return;
      pendingPersistRef.current = nextContent;
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        void flushPersist();
      }, PERSIST_DEBOUNCE_MS);
    },
    [flushPersist, persistable],
  );

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    [],
  );

  const applyMutation = useCallback(
    (
      mutation:
        | { kind: "checklist"; sectionIndex: number; blockIndex: number; itemFingerprint: string; checked: boolean }
        | { kind: "testcase"; testcaseId: string; status: TestcaseStatus },
    ) => {
      const nextContent = applyLivingDocumentMutation(contentRef.current, mutation);
      if (!nextContent) return false;

      contentRef.current = nextContent;
      onContentChange?.(nextContent);

      if (persistable) {
        schedulePersist(nextContent);
      } else if (documentKey && mutation.kind === "checklist") {
        writeChecklistItemChecked(documentKey, mutation.itemFingerprint, mutation.checked);
      }

      return true;
    },
    [documentKey, onContentChange, persistable, schedulePersist],
  );

  const toggleChecklistItem = useCallback(
    (sectionIndex: number, blockIndex: number, itemFingerprint: string, checked: boolean) => {
      applyMutation({ kind: "checklist", sectionIndex, blockIndex, itemFingerprint, checked });
    },
    [applyMutation],
  );

  const updateTestcaseStatus = useCallback(
    (testcaseId: string, status: TestcaseStatus) => {
      applyMutation({ kind: "testcase", testcaseId, status });
    },
    [applyMutation],
  );

  const value = useMemo(
    () => ({
      interactive,
      persistable,
      documentKey,
      content,
      toggleChecklistItem,
      updateTestcaseStatus,
    }),
    [content, documentKey, interactive, persistable, toggleChecklistItem, updateTestcaseStatus],
  );

  return <LivingDocumentContext.Provider value={value}>{children}</LivingDocumentContext.Provider>;
}
