import {
  documentStatuses,
  type DocumentStatus,
  type DocumentSummary,
} from "./documents.ts";

export type StatusFilter = DocumentStatus | "all";

export const ownershipFilters = ["all", "mine", "shared"] as const;
export type OwnershipFilter = (typeof ownershipFilters)[number];

export function parseStatusFilter(value: string | null | undefined): StatusFilter {
  if (value && documentStatuses.includes(value as DocumentStatus)) {
    return value as DocumentStatus;
  }
  return "all";
}

export function parseOwnershipFilter(
  value: string | null | undefined,
): OwnershipFilter {
  if (value === "mine" || value === "shared") return value;
  return "all";
}

export function isDocumentOwnedByUser(
  document: Pick<DocumentSummary, "userId">,
  userId: string,
): boolean {
  return document.userId === userId;
}

export function filterDocumentsByStatus<T extends DocumentSummary>(
  documents: T[],
  status: StatusFilter,
): T[] {
  if (status === "all") return documents;
  return documents.filter((document) => document.status === status);
}

export function filterDocumentsByOwnership<T extends DocumentSummary>(
  documents: T[],
  userId: string,
  ownership: OwnershipFilter,
): T[] {
  if (ownership === "all") return documents;
  if (ownership === "mine") {
    return documents.filter((document) => isDocumentOwnedByUser(document, userId));
  }
  return documents.filter((document) => !isDocumentOwnedByUser(document, userId));
}

export function buildBibliotecaUrl(filters?: {
  status?: StatusFilter;
  ownership?: OwnershipFilter;
}): string {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters?.ownership && filters.ownership !== "all") {
    params.set("ownership", filters.ownership);
  }
  const query = params.toString();
  return query ? `/biblioteca?${query}` : "/biblioteca";
}

export function bibliotecaUrl(status?: DocumentStatus): string {
  if (!status) return "/biblioteca";
  return buildBibliotecaUrl({ status });
}
