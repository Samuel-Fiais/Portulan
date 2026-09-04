import { randomUUID } from "node:crypto";

/** RFC 4122 UUID (v1–v5). Slugs are always a UUID, independent of title. */
export const UUID_SLUG_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidSlug(value: string): boolean {
  return UUID_SLUG_PATTERN.test(value);
}

/** Stable public slug for a new document — UUID v4, not derived from title. */
export function createDocumentSlug(existingId?: string): string {
  return existingId ?? randomUUID();
}
