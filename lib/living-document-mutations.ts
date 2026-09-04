import { parseDirectiveOpener } from "./directive-attrs.ts";
import { checklistItemFingerprint } from "./living-document-storage.ts";

export type TestcaseStatus = "pending" | "ok" | "partial" | "error";

export const TESTCASE_STATUSES: TestcaseStatus[] = ["pending", "ok", "partial", "error"];

export const TESTCASE_STATUS_LABELS: Record<TestcaseStatus, string> = {
  pending: "Pendente",
  ok: "Deu certo",
  partial: "Parcial",
  error: "Erro",
};

export const TESTCASE_PRIORITIES = ["low", "medium", "high"] as const;
export type TestcasePriority = (typeof TESTCASE_PRIORITIES)[number];

export function parseTestcaseStatus(value: string | undefined): TestcaseStatus {
  if (value && TESTCASE_STATUSES.includes(value as TestcaseStatus)) {
    return value as TestcaseStatus;
  }
  return "pending";
}

export function parseTestcasePriority(value: string | undefined): TestcasePriority {
  if (value && TESTCASE_PRIORITIES.includes(value as TestcasePriority)) {
    return value as TestcasePriority;
  }
  return "medium";
}

type SectionSlice = {
  sectionIndex: number;
  startLine: number;
  endLine: number;
  bodyStartLine: number;
  bodyEndLine: number;
};

function splitSectionSlices(lines: string[]): SectionSlice[] {
  const sections: SectionSlice[] = [];
  let current: SectionSlice | null = null;
  let sectionIndex = 0;

  const pushSection = (endLine: number) => {
    if (!current) return;
    current.endLine = endLine;
    current.bodyEndLine = endLine;
    sections.push(current);
    current = null;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const match = lines[lineIndex].match(/^##\s+(.+)$/);
    if (match) {
      pushSection(lineIndex - 1);
      current = {
        sectionIndex,
        startLine: lineIndex,
        endLine: lines.length - 1,
        bodyStartLine: lineIndex + 1,
        bodyEndLine: lines.length - 1,
      };
      sectionIndex += 1;
      continue;
    }
    if (!current && lineIndex === 0) {
      current = {
        sectionIndex: 0,
        startLine: 0,
        endLine: lines.length - 1,
        bodyStartLine: 0,
        bodyEndLine: lines.length - 1,
      };
    }
  }
  pushSection(lines.length - 1);
  return sections;
}

type DirectiveSlice = {
  name: string;
  attributes: Record<string, string>;
  openerLine: number;
  closerLine: number;
  bodyStartLine: number;
  bodyEndLine: number;
  blockIndex: number;
};

function directiveSlicesInRange(lines: string[], startLine: number, endLine: number): DirectiveSlice[] {
  const slices: DirectiveSlice[] = [];
  let blockIndex = 0;

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex += 1) {
    const opener = parseDirectiveOpener(lines[lineIndex]);
    if (!opener || lines[lineIndex] === ":::") continue;

    const name = opener.name.toLowerCase();
    if (name === "image" || name === "report") {
      slices.push({
        name,
        attributes: Object.fromEntries(Array.from(opener.attributeSource.matchAll(/([\w-]+)="([^"]*)"/g), (m) => [m[1], m[2]])),
        openerLine: lineIndex,
        closerLine: lineIndex,
        bodyStartLine: lineIndex + 1,
        bodyEndLine: lineIndex,
        blockIndex: blockIndex++,
      });
      continue;
    }

    let depth = 1;
    let closerLine = lineIndex;
    const allowsNested = name === "columns";
    for (let cursor = lineIndex + 1; cursor <= endLine; cursor += 1) {
      if (allowsNested && parseDirectiveOpener(lines[cursor])) {
        depth += 1;
        continue;
      }
      if (lines[cursor].trim() === ":::") {
        depth -= 1;
        if (depth === 0) {
          closerLine = cursor;
          break;
        }
      }
    }

    slices.push({
      name,
      attributes: Object.fromEntries(Array.from(opener.attributeSource.matchAll(/([\w-]+)="([^"]*)"/g), (m) => [m[1], m[2]])),
      openerLine: lineIndex,
      closerLine,
      bodyStartLine: lineIndex + 1,
      bodyEndLine: closerLine - 1,
      blockIndex: blockIndex++,
    });
    lineIndex = closerLine;
  }

  return slices;
}

function parseChecklistRows(body: string) {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-–—−]\s*$/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").split("|").map((part) => part.trim()));
}

function checklistTitleFromRaw(rawTitle: string) {
  const hasCheckbox = /^\[[ xX]\]/.test(rawTitle);
  return hasCheckbox ? rawTitle.replace(/^\[[ xX]\]\s*/, "") : rawTitle;
}

function findChecklistTarget(
  lines: string[],
  sectionIndex: number,
  blockIndex: number,
  itemFingerprint: string,
) {
  const sections = splitSectionSlices(lines);
  const section = sections.find((item) => item.sectionIndex === sectionIndex);
  if (!section) return null;

  const directives = directiveSlicesInRange(lines, section.bodyStartLine, section.bodyEndLine);
  const checklist = directives.find((item) => item.name === "checklist" && item.blockIndex === blockIndex);
  if (!checklist) return null;

  const body = lines.slice(checklist.bodyStartLine, checklist.bodyEndLine + 1).join("\n");
  const rows = parseChecklistRows(body);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const [rawTitle] = rows[rowIndex];
    if (!rawTitle || !/^\[[ xX]\]/.test(rawTitle)) continue;
    const title = checklistTitleFromRaw(rawTitle);
    const fingerprint = checklistItemFingerprint(sectionIndex, blockIndex, title || String(rowIndex));
    if (fingerprint !== itemFingerprint) continue;

    for (let lineIndex = checklist.bodyStartLine; lineIndex <= checklist.bodyEndLine; lineIndex += 1) {
      const trimmed = lines[lineIndex].trim();
      if (!/^[-*]\s+\[[ xX]\]/.test(trimmed)) continue;
      const lineTitle = checklistTitleFromRaw(trimmed.replace(/^[-*]\s+/, "").split("|")[0]?.trim() ?? "");
      const lineFingerprint = checklistItemFingerprint(sectionIndex, blockIndex, lineTitle || String(rowIndex));
      if (lineFingerprint === itemFingerprint) {
        return { lineIndex, rawLine: lines[lineIndex] };
      }
    }
  }

  return null;
}

export function toggleChecklistItemInMarkdown(
  content: string,
  sectionIndex: number,
  blockIndex: number,
  itemFingerprint: string,
  checked: boolean,
): string | null {
  const lines = content.split("\n");
  const target = findChecklistTarget(lines, sectionIndex, blockIndex, itemFingerprint);
  if (!target) return null;

  const nextMarker = checked ? "[x]" : "[ ]";
  const updatedLine = target.rawLine.replace(/^\s*([-*]\s+)\[[ xX]\]/, `$1${nextMarker}`);
  if (updatedLine === target.rawLine) return null;

  const nextLines = [...lines];
  nextLines[target.lineIndex] = updatedLine;
  return nextLines.join("\n");
}

function replaceDirectiveAttribute(line: string, attribute: string, value: string) {
  const opener = parseDirectiveOpener(line);
  if (!opener) return line;

  const attributes = new Map<string, string>(
    Array.from(opener.attributeSource.matchAll(/([\w-]+)="([^"]*)"/g), (match) => [match[1], match[2]]),
  );
  attributes.set(attribute, value);
  const serialized = Array.from(attributes, ([key, val]) => `${key}="${val}"`).join(" ");
  const nameMatch = line.match(/^:::(\w+)/);
  if (!nameMatch) return line;
  const rest = line.slice(nameMatch[0].length);
  const hasAttributes = rest.startsWith("{");
  if (!hasAttributes && serialized) {
    return `:::${opener.name}{${serialized}}`;
  }
  if (hasAttributes) {
    return `:::${opener.name}{${serialized}}`;
  }
  return `:::${opener.name}{${attribute}="${value}"}`;
}

export function updateTestcaseStatusInMarkdown(
  content: string,
  testcaseId: string,
  status: TestcaseStatus,
): string | null {
  const lines = content.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const opener = parseDirectiveOpener(lines[lineIndex]);
    if (!opener || opener.name.toLowerCase() !== "testcase") continue;
    const attributes = Object.fromEntries(
      Array.from(opener.attributeSource.matchAll(/([\w-]+)="([^"]*)"/g), (match) => [match[1], match[2]]),
    );
    if (attributes.id !== testcaseId) continue;
    const updated = replaceDirectiveAttribute(lines[lineIndex], "status", status);
    if (updated === lines[lineIndex]) return null;
    const nextLines = [...lines];
    nextLines[lineIndex] = updated;
    return nextLines.join("\n");
  }
  return null;
}

export function applyLivingDocumentMutation(
  content: string,
  mutation:
    | { kind: "checklist"; sectionIndex: number; blockIndex: number; itemFingerprint: string; checked: boolean }
    | { kind: "testcase"; testcaseId: string; status: TestcaseStatus },
): string | null {
  if (mutation.kind === "checklist") {
    return toggleChecklistItemInMarkdown(
      content,
      mutation.sectionIndex,
      mutation.blockIndex,
      mutation.itemFingerprint,
      mutation.checked,
    );
  }
  return updateTestcaseStatusInMarkdown(content, mutation.testcaseId, mutation.status);
}

/** Validates that a fingerprint still resolves in the current markdown (used before persisting). */
export function checklistFingerprintExists(
  content: string,
  sectionIndex: number,
  blockIndex: number,
  itemFingerprint: string,
) {
  const lines = content.split("\n");
  return findChecklistTarget(lines, sectionIndex, blockIndex, itemFingerprint) !== null;
}

/** Validates testcase id exists in markdown (including nested inside :::columns). */
export function testcaseIdExists(content: string, testcaseId: string) {
  const lines = content.split("\n");
  for (const line of lines) {
    const opener = parseDirectiveOpener(line);
    if (!opener || opener.name.toLowerCase() !== "testcase") continue;
    const attributes = Object.fromEntries(
      Array.from(opener.attributeSource.matchAll(/([\w-]+)="([^"]*)"/g), (match) => [match[1], match[2]]),
    );
    if (attributes.id === testcaseId) return true;
  }
  return false;
}
