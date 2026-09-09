import type { DocumentRecord } from "@/lib/documents";

export type DocumentSearchFields = Pick<
  DocumentRecord,
  "title" | "summary" | "tags" | "content"
>;

export function documentMatchesSearchQuery(
  document: DocumentSearchFields,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack =
    `${document.title} ${document.summary} ${document.tags.join(" ")} ${document.content}`.toLowerCase();
  return haystack.includes(normalized);
}
