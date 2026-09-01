import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documentReleases, documents } from "@/lib/db/schema";
import type {
  DocumentInput,
  DocumentRecord,
  DocumentRelease,
  DocumentStatus,
  DocumentType,
} from "@/lib/documents";

export type DocumentAccessContext = {
  userId?: string | null;
  bypassOwnership?: boolean;
};

type DocumentRow = typeof documents.$inferSelect;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

function mapRow(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type as DocumentType,
    status: row.status as DocumentStatus,
    author: row.author,
    team: row.team,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    version: row.version,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

function mapReleaseRow(row: typeof documentReleases.$inferSelect): DocumentRelease {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    title: row.title,
    summary: row.summary,
    type: row.type as DocumentType,
    author: row.author,
    team: row.team,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    publishedAt: row.publishedAt,
  };
}

function visibilityClause(userId?: string | null) {
  if (userId) {
    return or(isNull(documents.userId), eq(documents.userId, userId));
  }
  return isNull(documents.userId);
}

export function canReadDocument(document: DocumentRecord, ctx: DocumentAccessContext = {}) {
  if (ctx.bypassOwnership) return true;
  if (document.userId === null) return true;
  if (ctx.userId && document.userId === ctx.userId) return true;
  return false;
}

export function canMutateDocument(document: DocumentRecord, ctx: DocumentAccessContext = {}) {
  if (ctx.bypassOwnership) return true;
  if (!ctx.userId) return false;
  return document.userId === ctx.userId;
}

async function uniqueSlug(title: string, currentId?: string) {
  const db = await getDb();
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const [match] = await db.select({ id: documents.id }).from(documents).where(eq(documents.slug, slug)).limit(1);
    if (!match || match.id === currentId) return slug;
    slug = `${base}-${suffix++}`;
  }
}

export async function listDocuments(
  filters?: { query?: string; type?: DocumentType; status?: DocumentStatus },
  ctx: DocumentAccessContext = {},
) {
  const db = await getDb();
  const clauses = [];

  if (!ctx.bypassOwnership) {
    clauses.push(visibilityClause(ctx.userId));
  }

  if (filters?.query) {
    const query = `%${filters.query}%`;
    clauses.push(
      sql`(${documents.title} ILIKE ${query} OR ${documents.summary} ILIKE ${query} OR ${documents.tags} ILIKE ${query})`,
    );
  }
  if (filters?.type) clauses.push(eq(documents.type, filters.type));
  if (filters?.status) clauses.push(eq(documents.status, filters.status));

  const rows = await db
    .select()
    .from(documents)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(documents.updatedAt));

  return rows.map(mapRow);
}

export async function getDocument(idOrSlug: string, ctx: DocumentAccessContext = {}) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(documents)
    .where(or(eq(documents.id, idOrSlug), eq(documents.slug, idOrSlug)))
    .limit(1);

  if (!row) return null;
  const document = mapRow(row);
  return canReadDocument(document, ctx) ? document : null;
}

export async function createDocument(
  input: DocumentInput,
  options?: { id?: string; slug?: string; userId?: string | null },
) {
  const db = await getDb();
  const id = options?.id ?? randomUUID();
  const now = new Date().toISOString();
  const slug = options?.slug ?? (await uniqueSlug(input.title, id));
  const publishedAt = input.status === "published" ? now : null;

  await db.insert(documents).values({
    id,
    slug,
    title: input.title,
    summary: input.summary,
    type: input.type,
    status: input.status,
    author: input.author,
    team: input.team,
    tags: JSON.stringify(input.tags),
    content: input.content,
    version: 1,
    userId: options?.userId ?? null,
    createdAt: now,
    updatedAt: now,
    publishedAt,
  });

  return (await getDocument(id, { bypassOwnership: true }))!;
}

export async function updateDocument(
  id: string,
  input: Partial<DocumentInput>,
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return null;

  const next = { ...current, ...input };
  const now = new Date().toISOString();
  const publishedAt = next.status === "published" ? current.publishedAt ?? now : null;
  const slug = input.title ? await uniqueSlug(input.title, id) : current.slug;
  const db = await getDb();

  await db
    .update(documents)
    .set({
      slug,
      title: next.title,
      summary: next.summary,
      type: next.type,
      status: next.status,
      author: next.author,
      team: next.team,
      tags: JSON.stringify(next.tags),
      content: next.content,
      version: current.version + 1,
      updatedAt: now,
      publishedAt,
    })
    .where(eq(documents.id, id));

  return getDocument(id, { userId: ctx.userId, bypassOwnership: ctx.bypassOwnership });
}

export async function deleteDocument(id: string, ctx: DocumentAccessContext = {}) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return false;

  const db = await getDb();
  const deleted = await db.delete(documents).where(eq(documents.id, id)).returning({ id: documents.id });
  return deleted.length > 0;
}

function documentContentChanged(current: DocumentRecord, input: Partial<DocumentInput>) {
  const title = input.title ?? current.title;
  const summary = input.summary ?? current.summary;
  const type = input.type ?? current.type;
  const author = input.author ?? current.author;
  const team = input.team ?? current.team;
  const tags = input.tags ?? current.tags;
  const content = input.content ?? current.content;
  return (
    title !== current.title ||
    summary !== current.summary ||
    type !== current.type ||
    author !== current.author ||
    team !== current.team ||
    JSON.stringify(tags) !== JSON.stringify(current.tags) ||
    content !== current.content
  );
}

export async function getDocumentRelease(releaseId: string) {
  const db = await getDb();
  const [row] = await db.select().from(documentReleases).where(eq(documentReleases.id, releaseId)).limit(1);
  return row ? mapReleaseRow(row) : null;
}

export async function listDocumentReleases(documentId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(documentReleases)
    .where(eq(documentReleases.documentId, documentId))
    .orderBy(desc(documentReleases.version));
  return rows.map(mapReleaseRow);
}

export async function publishDocument(
  id: string,
  input: Partial<DocumentInput> = {},
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return null;

  const db = await getDb();
  const merged = {
    title: input.title ?? current.title,
    summary: input.summary ?? current.summary,
    type: input.type ?? current.type,
    author: input.author ?? current.author,
    team: input.team ?? current.team,
    tags: input.tags ?? current.tags,
    content: input.content ?? current.content,
  };
  const now = new Date().toISOString();
  const changed = documentContentChanged(current, input);

  if (changed) {
    const slug = input.title ? await uniqueSlug(input.title, id) : current.slug;
    await db
      .update(documents)
      .set({
        slug,
        title: merged.title,
        summary: merged.summary,
        type: merged.type,
        status: "published",
        author: merged.author,
        team: merged.team,
        tags: JSON.stringify(merged.tags),
        content: merged.content,
        version: current.version + 1,
        updatedAt: now,
        publishedAt: current.publishedAt ?? now,
      })
      .where(eq(documents.id, id));
  } else {
    await db
      .update(documents)
      .set({
        status: "published",
        updatedAt: now,
        publishedAt: current.publishedAt ?? now,
      })
      .where(eq(documents.id, id));
  }

  const document = (await getDocument(id, { userId: ctx.userId, bypassOwnership: ctx.bypassOwnership }))!;
  const [existing] = await db
    .select()
    .from(documentReleases)
    .where(and(eq(documentReleases.documentId, id), eq(documentReleases.version, document.version)))
    .limit(1);

  if (existing) {
    return { document, release: mapReleaseRow(existing) };
  }

  const releaseId = randomUUID();
  await db.insert(documentReleases).values({
    id: releaseId,
    documentId: id,
    version: document.version,
    title: document.title,
    summary: document.summary,
    type: document.type,
    author: document.author,
    team: document.team,
    tags: JSON.stringify(document.tags),
    content: document.content,
    publishedAt: now,
  });

  return { document, release: (await getDocumentRelease(releaseId))! };
}

export async function getDocumentStats(ctx: DocumentAccessContext = {}) {
  const db = await getDb();
  const visible = ctx.bypassOwnership ? undefined : visibilityClause(ctx.userId);
  const query = db
    .select({
      total: count(),
      published: sql<number>`SUM(CASE WHEN ${documents.status} = 'published' THEN 1 ELSE 0 END)`,
      review: sql<number>`SUM(CASE WHEN ${documents.status} = 'review' THEN 1 ELSE 0 END)`,
      draft: sql<number>`SUM(CASE WHEN ${documents.status} = 'draft' THEN 1 ELSE 0 END)`,
    })
    .from(documents);

  const [result] = visible ? await query.where(visible) : await query;

  return {
    total: result?.total ?? 0,
    published: Number(result?.published ?? 0),
    review: Number(result?.review ?? 0),
    draft: Number(result?.draft ?? 0),
  };
}
