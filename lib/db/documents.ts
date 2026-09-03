import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documentReleases, documents, templates } from "@/lib/db/schema";
import { getDefaultTemplate, resolveTemplateForUser } from "@/lib/db/templates";
import type { DocumentInput, DocumentRecord, DocumentRelease, DocumentStatus } from "@/lib/documents";

export type DocumentAccessContext = {
  userId?: string | null;
  bypassOwnership?: boolean;
};

type DocumentRow = typeof documents.$inferSelect;
type TemplateRow = typeof templates.$inferSelect;

function mapRow(row: DocumentRow, template: Pick<TemplateRow, "name" | "primaryColor" | "secondaryColor">): DocumentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    templateId: row.templateId,
    templateName: template.name,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
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
    templateId: row.templateId,
    templateName: row.templateName,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "documento";
}

async function fetchDocumentRow(idOrSlug: string) {
  const db = await getDb();
  return db
    .select({
      document: documents,
      templateName: templates.name,
      primaryColor: templates.primaryColor,
      secondaryColor: templates.secondaryColor,
    })
    .from(documents)
    .innerJoin(templates, eq(documents.templateId, templates.id))
    .where(or(eq(documents.id, idOrSlug), eq(documents.slug, idOrSlug)))
    .limit(1);
}

export async function listDocuments(
  filters?: { query?: string; templateId?: string; status?: DocumentStatus },
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
  if (filters?.templateId) clauses.push(eq(documents.templateId, filters.templateId));
  if (filters?.status) clauses.push(eq(documents.status, filters.status));

  const rows = await db
    .select({
      document: documents,
      templateName: templates.name,
      primaryColor: templates.primaryColor,
      secondaryColor: templates.secondaryColor,
    })
    .from(documents)
    .innerJoin(templates, eq(documents.templateId, templates.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(documents.updatedAt));

  return rows.map(({ document, templateName, primaryColor, secondaryColor }) =>
    mapRow(document, { name: templateName, primaryColor, secondaryColor }),
  );
}

export async function getDocument(idOrSlug: string, ctx: DocumentAccessContext = {}) {
  const [row] = await fetchDocumentRow(idOrSlug);
  if (!row) return null;

  const document = mapRow(row.document, {
    name: row.templateName,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
  });
  return canReadDocument(document, ctx) ? document : null;
}

export async function createDocument(
  input: DocumentInput,
  options?: { id?: string; slug?: string; userId?: string | null },
) {
  const db = await getDb();
  const userId = options?.userId ?? null;
  const template =
    userId != null
      ? (await resolveTemplateForUser(input.templateId, userId)) ?? (await getDefaultTemplate())
      : (await getDefaultTemplate());
  const id = options?.id ?? randomUUID();
  const now = new Date().toISOString();
  const slug = options?.slug ?? (await uniqueSlug(input.title, id));
  const publishedAt = input.status === "published" ? now : null;

  await db.insert(documents).values({
    id,
    slug,
    title: input.title,
    summary: input.summary,
    templateId: template.id,
    status: input.status,
    author: input.author,
    team: input.team,
    tags: JSON.stringify(input.tags),
    content: input.content,
    version: 1,
    userId,
    createdAt: now,
    updatedAt: now,
    publishedAt,
  });

  return (await getDocument(id, { userId, bypassOwnership: true }))!;
}

export async function updateDocument(
  id: string,
  input: Partial<DocumentInput>,
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return null;

  let templateId = current.templateId;
  if (input.templateId && ctx.userId) {
    const template = await resolveTemplateForUser(input.templateId, ctx.userId);
    if (template) templateId = template.id;
  }

  const next = { ...current, ...input, templateId };
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
      templateId: next.templateId,
      status: next.status,
      author: next.author,
      team: next.team,
      tags: JSON.stringify(next.tags),
      content: next.content,
      // O rascunho pode ser salvo quantas vezes for necessário. A versão só
      // avança ao criar um snapshot publicado em publishDocument.
      version: current.version,
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

export async function getDocumentRelease(releaseId: string) {
  const db = await getDb();
  const [row] = await db.select().from(documentReleases).where(eq(documentReleases.id, releaseId)).limit(1);
  return row ? mapReleaseRow(row) : null;
}

export async function getLatestDocumentReleaseBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ release: documentReleases })
    .from(documents)
    .innerJoin(documentReleases, eq(documents.id, documentReleases.documentId))
    .where(eq(documents.slug, slug))
    .orderBy(desc(documentReleases.version), desc(documentReleases.publishedAt))
    .limit(1);
  return row ? mapReleaseRow(row.release) : null;
}

export async function listLinkableDocuments(
  ctx: DocumentAccessContext = {},
  options?: { excludeDocumentId?: string },
) {
  const db = await getDb();
  const clauses = [];

  if (!ctx.bypassOwnership) {
    clauses.push(visibilityClause(ctx.userId));
  }
  if (options?.excludeDocumentId) {
    clauses.push(sql`${documents.id} <> ${options.excludeDocumentId}`);
  }

  const rows = await db
    .selectDistinct({
      id: documents.id,
      slug: documents.slug,
      title: documents.title,
    })
    .from(documents)
    .innerJoin(documentReleases, eq(documents.id, documentReleases.documentId))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(documents.updatedAt));

  return rows;
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
  let templateId = current.templateId;
  if (input.templateId && ctx.userId) {
    const template = await resolveTemplateForUser(input.templateId, ctx.userId);
    if (template) templateId = template.id;
  }

  const merged = {
    title: input.title ?? current.title,
    summary: input.summary ?? current.summary,
    templateId,
    author: input.author ?? current.author,
    team: input.team ?? current.team,
    tags: input.tags ?? current.tags,
    content: input.content ?? current.content,
  };
  const now = new Date().toISOString();
  const slug = input.title ? await uniqueSlug(input.title, id) : current.slug;
  const [latestRelease] = await db
    .select({ version: documentReleases.version })
    .from(documentReleases)
    .where(eq(documentReleases.documentId, id))
    .orderBy(desc(documentReleases.version))
    .limit(1);
  const nextVersion = (latestRelease?.version ?? 0) + 1;

  // Publicar é uma decisão explícita: cada publicação cria um snapshot
  // imutável, inclusive quando o rascunho não mudou desde a última versão.
  await db
    .update(documents)
    .set({
      slug,
      title: merged.title,
      summary: merged.summary,
      templateId: merged.templateId,
      status: "published",
      author: merged.author,
      team: merged.team,
      tags: JSON.stringify(merged.tags),
      content: merged.content,
      version: nextVersion,
      updatedAt: now,
      publishedAt: now,
    })
    .where(eq(documents.id, id));

  const document = (await getDocument(id, { userId: ctx.userId, bypassOwnership: ctx.bypassOwnership }))!;
  const releaseId = randomUUID();
  await db.insert(documentReleases).values({
    id: releaseId,
    documentId: id,
    version: document.version,
    title: document.title,
    summary: document.summary,
    templateId: document.templateId,
    templateName: document.templateName,
    primaryColor: document.primaryColor,
    secondaryColor: document.secondaryColor,
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
