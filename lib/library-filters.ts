import {
  documentStatuses,
  type DocumentStatus,
  type DocumentSummary,
} from "./documents.ts";

export type StatusFilter = DocumentStatus | "all";

export function parseStatusFilter(value: string | null | undefined): StatusFilter {
  if (value && documentStatuses.includes(value as DocumentStatus)) {
    return value as DocumentStatus;
  }
  return "all";
}

export function filterDocumentsByStatus<T extends DocumentSummary>(
  documents: T[],
  status: StatusFilter,
): T[] {
  if (status === "all") return documents;
  return documents.filter((document) => document.status === status);
}

export function bibliotecaUrl(status?: DocumentStatus): string {
  if (!status) return "/biblioteca";
  return `/biblioteca?status=${status}`;
}
