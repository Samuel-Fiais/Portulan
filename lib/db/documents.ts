import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  getDocumentShareRole,
  listSharedDocumentIds,
} from "@/lib/db/document-shares";
import { documentReleases, documents, templates, users } from "@/lib/db/schema";
import { getDefaultTemplate, resolveTemplateForUser } from "@/lib/db/templates";
import type {
  DocumentAccessLevel,
  DocumentInput,
  DocumentRecord,
  DocumentRelease,
  DocumentStatus,
  PublicReleaseResult,
} from "@/lib/documents";

export type DocumentAccessContext = {
  userId?: string | null;
  userEmail?: string | null;
  bypassOwnership?: boolean;
  shareRole?: "viewer" | "editor" | null;
};

type DocumentRow = typeof documents.$inferSelect;
type TemplateRow = typeof templates.$inferSelect;

function mapRow(row: DocumentRow, template: Pick<TemplateRow, "name" | "primaryColor" | "secondaryColor" | "logoUrl">): DocumentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    templateId: row.templateId,
    templateName: template.name,
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    logoUrl: template.logoUrl ?? null,
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
    disabled: row.disabled,
  };
}

function mapReleaseRow(
  row: typeof documentReleases.$inferSelect,
  publisher?: { login: string | null; name: string | null; avatarUrl: string | null } | null,
): DocumentRelease {
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
    logoUrl: row.logoUrl ?? null,
    author: row.author,
    team: row.team,
    tags: JSON.parse(row.tags) as string[],
    content: row.content,
    publishedAt: row.publishedAt,
    disabled: row.disabled,
    publishedByUserId: row.publishedByUserId ?? null,
    publishedByLogin: publisher?.login ?? null,
    publishedByName: publisher?.name ?? null,
    publishedByAvatarUrl: publisher?.avatarUrl ?? null,
  };
}

function visibilityClause(userId?: string | null, userEmail?: string | null, sharedDocumentIds?: string[]) {
  const clauses = [isNull(documents.userId)];
  if (userId) {
    clauses.push(eq(documents.userId, userId));
  }
  if (sharedDocumentIds?.length) {
    clauses.push(inArray(documents.id, sharedDocumentIds));
  }
  return or(...clauses);
}

export function isDocumentOwner(document: DocumentRecord, ctx: DocumentAccessContext = {}) {
  if (ctx.bypassOwnership) return true;
  if (!ctx.userId) return false;
  return document.userId === ctx.userId;
}

export async function getDocumentAccessLevel(
  document: DocumentRecord,
  ctx: DocumentAccessContext = {},
): Promise<DocumentAccessLevel> {
  if (ctx.bypassOwnership) return "owner";
  if (document.userId === null) return "legacy";
  if (ctx.userId && document.userId === ctx.userId) return "owner";

  const shareRole =
    ctx.shareRole ??
    (await getDocumentShareRole(document.id, ctx.userId, ctx.userEmail ?? null));
  if (shareRole === "editor") return "editor";
  if (shareRole === "viewer") return "viewer";
  return null;
}

export async function canReadDocument(document: DocumentRecord, ctx: DocumentAccessContext = {}) {
  const level = await getDocumentAccessLevel(document, ctx);
  return level !== null;
}

export async function canEditDocument(document: DocumentRecord, ctx: DocumentAccessContext = {}) {
  const level = await getDocumentAccessLevel(document, ctx);
  return level === "owner" || level === "editor" || level === "legacy";
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
      logoUrl: templates.logoUrl,
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
  const sharedDocumentIds =
    ctx.userId && !ctx.bypassOwnership
      ? await listSharedDocumentIds(ctx.userId, ctx.userEmail ?? null)
      : [];

  if (!ctx.bypassOwnership) {
    clauses.push(visibilityClause(ctx.userId, ctx.userEmail, sharedDocumentIds));
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
      logoUrl: templates.logoUrl,
    })
    .from(documents)
    .innerJoin(templates, eq(documents.templateId, templates.id))
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(documents.updatedAt));

  return rows.map(({ document, templateName, primaryColor, secondaryColor, logoUrl }) =>
    mapRow(document, { name: templateName, primaryColor, secondaryColor, logoUrl }),
  );
}

export async function getDocument(idOrSlug: string, ctx: DocumentAccessContext = {}) {
  const [row] = await fetchDocumentRow(idOrSlug);
  if (!row) return null;

  const document = mapRow(row.document, {
    name: row.templateName,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    logoUrl: row.logoUrl,
  });
  return (await canReadDocument(document, ctx)) ? document : null;
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
    disabled: false,
  });

  return (await getDocument(id, { userId, bypassOwnership: true }))!;
}

export async function updateDocument(
  id: string,
  input: Partial<DocumentInput>,
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !(await canEditDocument(current, ctx))) return null;

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
  const [row] = await db
    .select({
      release: documentReleases,
      publisherLogin: users.login,
      publisherName: users.name,
      publisherAvatarUrl: users.avatarUrl,
    })
    .from(documentReleases)
    .leftJoin(users, eq(documentReleases.publishedByUserId, users.id))
    .where(eq(documentReleases.id, releaseId))
    .limit(1);
  return row
    ? mapReleaseRow(row.release, {
        login: row.publisherLogin,
        name: row.publisherName,
        avatarUrl: row.publisherAvatarUrl,
      })
    : null;
}

export async function resolvePublicReleaseById(releaseId: string): Promise<PublicReleaseResult> {
  const db = await getDb();
  const [row] = await db
    .select({
      release: documentReleases,
      documentDisabled: documents.disabled,
      slug: documents.slug,
      publisherLogin: users.login,
      publisherName: users.name,
      publisherAvatarUrl: users.avatarUrl,
    })
    .from(documentReleases)
    .innerJoin(documents, eq(documentReleases.documentId, documents.id))
    .leftJoin(users, eq(documentReleases.publishedByUserId, users.id))
    .where(eq(documentReleases.id, releaseId))
    .limit(1);

  if (!row) return { access: "not_found" };
  if (row.documentDisabled) return { access: "document_disabled", slug: row.slug };
  if (row.release.disabled) return { access: "release_disabled", slug: row.slug };
  return {
    access: "ok",
    release: mapReleaseRow(row.release, {
      login: row.publisherLogin,
      name: row.publisherName,
      avatarUrl: row.publisherAvatarUrl,
    }),
    slug: row.slug,
  };
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

export async function resolvePublicLatestReleaseBySlug(slug: string): Promise<PublicReleaseResult> {
  const db = await getDb();
  const [documentRow] = await db
    .select({ id: documents.id, disabled: documents.disabled, slug: documents.slug })
    .from(documents)
    .where(eq(documents.slug, slug))
    .limit(1);

  if (!documentRow) return { access: "not_found" };
  if (documentRow.disabled) return { access: "document_disabled", slug: documentRow.slug };

  const [releaseRow] = await db
    .select({
      release: documentReleases,
      publisherLogin: users.login,
      publisherName: users.name,
      publisherAvatarUrl: users.avatarUrl,
    })
    .from(documentReleases)
    .leftJoin(users, eq(documentReleases.publishedByUserId, users.id))
    .where(and(eq(documentReleases.documentId, documentRow.id), eq(documentReleases.disabled, false)))
    .orderBy(desc(documentReleases.version), desc(documentReleases.publishedAt))
    .limit(1);

  if (!releaseRow) return { access: "no_enabled_release", slug: documentRow.slug };
  return {
    access: "ok",
    release: mapReleaseRow(releaseRow.release, {
      login: releaseRow.publisherLogin,
      name: releaseRow.publisherName,
      avatarUrl: releaseRow.publisherAvatarUrl,
    }),
    slug: documentRow.slug,
  };
}

export async function listLinkableDocuments(
  ctx: DocumentAccessContext = {},
  options?: { excludeDocumentId?: string },
) {
  const db = await getDb();
  const clauses = [];
  const sharedDocumentIds =
    ctx.userId && !ctx.bypassOwnership
      ? await listSharedDocumentIds(ctx.userId, ctx.userEmail ?? null)
      : [];

  if (!ctx.bypassOwnership) {
    clauses.push(visibilityClause(ctx.userId, ctx.userEmail, sharedDocumentIds));
  }
  if (options?.excludeDocumentId) {
    clauses.push(sql`${documents.id} <> ${options.excludeDocumentId}`);
  }

  const rows = await db
    .selectDistinct({
      id: documents.id,
      slug: documents.slug,
      title: documents.title,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .innerJoin(documentReleases, eq(documents.id, documentReleases.documentId))
    .where(
      and(
        ...(clauses.length ? clauses : []),
        eq(documents.disabled, false),
        eq(documentReleases.disabled, false),
      ),
    )
    .orderBy(desc(documents.updatedAt));

  return rows.map(({ id, slug, title }) => ({ id, slug, title }));
}

export async function listDocumentReleases(documentId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      release: documentReleases,
      publisherLogin: users.login,
      publisherName: users.name,
      publisherAvatarUrl: users.avatarUrl,
    })
    .from(documentReleases)
    .leftJoin(users, eq(documentReleases.publishedByUserId, users.id))
    .where(eq(documentReleases.documentId, documentId))
    .orderBy(desc(documentReleases.version));
  return rows.map(({ release, publisherLogin, publisherName, publisherAvatarUrl }) =>
    mapReleaseRow(release, {
      login: publisherLogin,
      name: publisherName,
      avatarUrl: publisherAvatarUrl,
    }),
  );
}

export async function publishDocument(
  id: string,
  input: Partial<DocumentInput> = {},
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !(await canEditDocument(current, ctx))) return null;

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
    logoUrl: document.logoUrl,
    author: document.author,
    team: document.team,
    tags: JSON.stringify(document.tags),
    content: document.content,
    publishedAt: now,
    disabled: false,
    publishedByUserId: ctx.userId ?? null,
  });

  return { document, release: (await getDocumentRelease(releaseId))! };
}

export async function setDocumentDisabled(id: string, disabled: boolean, ctx: DocumentAccessContext = {}) {
  const current = await getDocument(id, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return null;

  const db = await getDb();
  const now = new Date().toISOString();
  await db.update(documents).set({ disabled, updatedAt: now }).where(eq(documents.id, id));
  return getDocument(id, { userId: ctx.userId, bypassOwnership: ctx.bypassOwnership });
}

export async function setDocumentReleaseDisabled(
  documentId: string,
  releaseId: string,
  disabled: boolean,
  ctx: DocumentAccessContext = {},
) {
  const current = await getDocument(documentId, { ...ctx, bypassOwnership: ctx.bypassOwnership ?? false });
  if (!current || !canMutateDocument(current, ctx)) return null;

  const db = await getDb();
  const updated = await db
    .update(documentReleases)
    .set({ disabled })
    .where(and(eq(documentReleases.id, releaseId), eq(documentReleases.documentId, documentId)))
    .returning({ id: documentReleases.id });

  if (!updated.length) return null;
  return getDocumentRelease(releaseId);
}

export async function getDocumentStats(ctx: DocumentAccessContext = {}) {
  const db = await getDb();
  const sharedDocumentIds =
    ctx.userId && !ctx.bypassOwnership
      ? await listSharedDocumentIds(ctx.userId, ctx.userEmail ?? null)
      : [];
  const visible = ctx.bypassOwnership ? undefined : visibilityClause(ctx.userId, ctx.userEmail, sharedDocumentIds);
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
