const STORAGE_PREFIX = "portulan-living:";

export function livingDocumentStorageKey(documentKey: string) {
  return `${STORAGE_PREFIX}${documentKey}`;
}

export function checklistItemFingerprint(sectionIndex: number, blockIndex: number, title: string) {
  let hash = 0;
  const normalized = title.trim().toLowerCase();
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) | 0;
  }
  return `${sectionIndex}:${blockIndex}:${(hash >>> 0).toString(36)}`;
}

type ChecklistState = Record<string, boolean>;

function readChecklistState(documentKey: string): ChecklistState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(livingDocumentStorageKey(documentKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
    );
  } catch {
    return {};
  }
}

export function readChecklistItemChecked(documentKey: string, itemFingerprint: string, fallback: boolean) {
  const state = readChecklistState(documentKey);
  return itemFingerprint in state ? state[itemFingerprint]! : fallback;
}

export function writeChecklistItemChecked(documentKey: string, itemFingerprint: string, checked: boolean) {
  if (typeof window === "undefined") return;
  const state = readChecklistState(documentKey);
  state[itemFingerprint] = checked;
  try {
    window.localStorage.setItem(livingDocumentStorageKey(documentKey), JSON.stringify(state));
  } catch {
    // Ignore quota or privacy-mode failures.
  }
}
