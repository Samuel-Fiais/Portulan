import {
  documentToPublishSnapshot,
  releaseToPublishSnapshot,
  type DocumentPublishSnapshot,
  type DocumentRecord,
  type DocumentRelease,
} from "./documents.ts";

export type VersionDiffSource =
  | { kind: "draft"; label: string; snapshot: DocumentPublishSnapshot }
  | { kind: "release"; releaseId: string; version: number; label: string; snapshot: DocumentPublishSnapshot };

export type VersionDiffFieldChange = {
  key: string;
  label: string;
  left: string;
  right: string;
};

export type VersionDiffLine =
  | { type: "unchanged"; line: string }
  | { type: "added"; line: string }
  | { type: "removed"; line: string };

export type SimpleDiffLine =
  | { type: "add"; text: string }
  | { type: "remove"; text: string }
  | { type: "equal"; text: string };

export type VersionDiffResult = {
  left: VersionDiffSource;
  right: VersionDiffSource;
  fieldChanges: VersionDiffFieldChange[];
  contentLines: VersionDiffLine[];
  hasChanges: boolean;
};

export type VersionDiffSideId = "draft" | `release:${string}`;

const METADATA_FIELDS: Array<{
  key: keyof DocumentPublishSnapshot;
  label: string;
  format?: (value: unknown) => string;
}> = [
  { key: "title", label: "Título" },
  { key: "summary", label: "Resumo" },
  { key: "templateName", label: "Gabarito" },
  { key: "author", label: "Cartógrafo" },
  { key: "team", label: "Frota" },
  { key: "tags", label: "Tags", format: (value) => ((value as string[]).length ? (value as string[]).join(", ") : "—") },
];

export function draftDiffSource(document: DocumentRecord): VersionDiffSource {
  return {
    kind: "draft",
    label: "Rascunho atual",
    snapshot: documentToPublishSnapshot(document),
  };
}

export function releaseDiffSource(release: DocumentRelease): VersionDiffSource {
  return {
    kind: "release",
    releaseId: release.id,
    version: release.version,
    label: `v${release.version}`,
    snapshot: releaseToPublishSnapshot(release),
  };
}

export function releaseSideId(releaseId: string): VersionDiffSideId {
  return `release:${releaseId}`;
}

export function parseVersionDiffSideId(sideId: VersionDiffSideId): "draft" | string {
  if (sideId === "draft") return "draft";
  return sideId.slice("release:".length);
}

export function resolveVersionDiffSource(
  sideId: VersionDiffSideId,
  document: DocumentRecord,
  releases: DocumentRelease[],
): VersionDiffSource | null {
  if (sideId === "draft") return draftDiffSource(document);
  const releaseId = parseVersionDiffSideId(sideId);
  const release = releases.find((item) => item.id === releaseId);
  return release ? releaseDiffSource(release) : null;
}

export function compareVersions(left: VersionDiffSource, right: VersionDiffSource): VersionDiffResult {
  const fieldChanges = METADATA_FIELDS.flatMap(({ key, label, format }) => {
    const leftRaw = left.snapshot[key];
    const rightRaw = right.snapshot[key];
    const leftValue = format ? format(leftRaw) : String(leftRaw ?? "");
    const rightValue = format ? format(rightRaw) : String(rightRaw ?? "");
    if (leftValue === rightValue) return [];
    return [{ key, label, left: leftValue, right: rightValue }];
  });

  const contentLines = diffTextLines(left.snapshot.content, right.snapshot.content);
  const hasContentChanges = contentLines.some((line) => line.type !== "unchanged");

  return {
    left,
    right,
    fieldChanges,
    contentLines,
    hasChanges: fieldChanges.length > 0 || hasContentChanges,
  };
}

function diffTextLines(leftText: string, rightText: string): VersionDiffLine[] {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const table = buildLongestCommonSubsequenceTable(leftLines, rightLines);

  const result: VersionDiffLine[] = [];
  let leftIndex = leftLines.length;
  let rightIndex = rightLines.length;

  while (leftIndex > 0 || rightIndex > 0) {
    if (leftIndex > 0 && rightIndex > 0 && leftLines[leftIndex - 1] === rightLines[rightIndex - 1]) {
      result.unshift({ type: "unchanged", line: leftLines[leftIndex - 1] });
      leftIndex -= 1;
      rightIndex -= 1;
      continue;
    }

    if (rightIndex > 0 && (leftIndex === 0 || table[leftIndex][rightIndex - 1] >= table[leftIndex - 1][rightIndex])) {
      result.unshift({ type: "added", line: rightLines[rightIndex - 1] });
      rightIndex -= 1;
      continue;
    }

    result.unshift({ type: "removed", line: leftLines[leftIndex - 1] });
    leftIndex -= 1;
  }

  return result;
}

export function diffLines(left: string, right: string): SimpleDiffLine[] {
  return diffTextLines(left, right).map((line) => {
    if (line.type === "added") return { type: "add", text: line.line };
    if (line.type === "removed") return { type: "remove", text: line.line };
    return { type: "equal", text: line.line };
  });
}

export function diffSummary(lines: SimpleDiffLine[]) {
  return {
    added: lines.filter((line) => line.type === "add").length,
    removed: lines.filter((line) => line.type === "remove").length,
  };
}

export function versionDiffContentSummary(lines: VersionDiffLine[]) {
  return {
    added: lines.filter((line) => line.type === "added").length,
    removed: lines.filter((line) => line.type === "removed").length,
  };
}

export function resolveRestoreableRelease(
  leftSideId: VersionDiffSideId,
  rightSideId: VersionDiffSideId,
  releases: DocumentRelease[],
): DocumentRelease | null {
  const findRelease = (sideId: VersionDiffSideId) => {
    if (sideId === "draft") return null;
    const releaseId = parseVersionDiffSideId(sideId);
    return releases.find((release) => release.id === releaseId) ?? null;
  };

  const leftRelease = findRelease(leftSideId);
  const rightRelease = findRelease(rightSideId);

  if (leftSideId === "draft" && rightRelease) return rightRelease;
  if (rightSideId === "draft" && leftRelease) return leftRelease;
  if (leftRelease && rightRelease) return rightRelease;
  return null;
}

export function formatVersionDiffSummaryStats(
  fieldChangeCount: number,
  contentSummary: { added: number; removed: number },
  hasChanges: boolean,
) {
  if (!hasChanges) return "Sem alterações";

  const parts: string[] = [];
  const lineCount = contentSummary.added + contentSummary.removed;

  if (lineCount > 0) {
    const lineParts: string[] = [];
    if (contentSummary.added > 0) lineParts.push(`+${contentSummary.added}`);
    if (contentSummary.removed > 0) lineParts.push(`−${contentSummary.removed}`);
    parts.push(`${lineParts.join(" ")} ${lineCount === 1 ? "linha" : "linhas"}`);
  }

  if (fieldChangeCount > 0) {
    parts.push(`${fieldChangeCount} ${fieldChangeCount === 1 ? "metadado" : "metadados"}`);
  }

  return parts.join(" · ");
}

function buildLongestCommonSubsequenceTable(leftLines: string[], rightLines: string[]) {
  const table = Array.from({ length: leftLines.length + 1 }, () => Array<number>(rightLines.length + 1).fill(0));

  for (let leftIndex = 1; leftIndex <= leftLines.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= rightLines.length; rightIndex += 1) {
      if (leftLines[leftIndex - 1] === rightLines[rightIndex - 1]) {
        table[leftIndex][rightIndex] = table[leftIndex - 1][rightIndex - 1] + 1;
      } else {
        table[leftIndex][rightIndex] = Math.max(table[leftIndex - 1][rightIndex], table[leftIndex][rightIndex - 1]);
      }
    }
  }

  return table;
}
