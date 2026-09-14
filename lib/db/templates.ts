import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documents, templates } from "@/lib/db/schema";
import {
  builtinTemplates,
  DEFAULT_TEMPLATE_ID,
  defaultDocumentContent,
  type TemplateInput,
  type TemplateRecord,
} from "@/lib/documents";

/** Um gabarito pertence ao porto (tripulação inteira usa) e tem um autor. */
export type TemplateAccessContext = {
  userId: string;
  /** Porto ativo: onde nascem os gabaritos novos. */
  workspaceId?: string | null;
  /** Todos os portos da pessoa: definem o que ela enxerga. */
  workspaceIds?: string[];
  /** Portos em que a pessoa é capitão ou imediato: definem o que ela altera. */
  manageableWorkspaceIds?: string[];
};

function mapRow(row: typeof templates.$inferSelect): TemplateRecord {
  return {
    id: row.id,
    userId: row.userId,
    workspaceId: row.workspaceId,
    name: row.name,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    logoUrl: row.logoUrl ?? null,
    content: row.content,
    isBuiltin: row.isBuiltin,
    createdAt: row.createdAt,
  };
}

export function canUseTemplate(template: TemplateRecord, ctx: TemplateAccessContext) {
  if (template.isBuiltin) return true;
  if (template.userId === ctx.userId) return true;
  return Boolean(template.workspaceId && ctx.workspaceIds?.includes(template.workspaceId));
}

export function canManageTemplate(template: TemplateRecord, ctx: TemplateAccessContext) {
  if (template.isBuiltin) return true;
  if (template.userId === ctx.userId) return true;
  return Boolean(template.workspaceId && ctx.manageableWorkspaceIds?.includes(template.workspaceId));
}

export async function getTemplate(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function listTemplates(ctx: TemplateAccessContext) {
  await ensureDefaultTemplate();
  const db = await getDb();
  const clauses = [eq(templates.isBuiltin, true), and(eq(templates.userId, ctx.userId), isNull(templates.workspaceId))!];
  if (ctx.workspaceId) {
    clauses.push(eq(templates.workspaceId, ctx.workspaceId));
  }
  const rows = await db
    .select()
    .from(templates)
    .where(or(...clauses))
    .orderBy(desc(templates.isBuiltin), desc(templates.createdAt));
  return rows.map(mapRow);
}

export async function createTemplate(ctx: TemplateAccessContext, input: TemplateInput) {
  const db = await getDb();
  const id = randomUUID();
  const [row] = await db
    .insert(templates)
    .values({
      id,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId ?? null,
      name: input.name,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      logoUrl: input.logoUrl ?? null,
      content: input.content || defaultDocumentContent,
      isBuiltin: false,
    })
    .returning();

  return mapRow(row);
}

export async function updateTemplate(ctx: TemplateAccessContext, id: string, input: Partial<TemplateInput>) {
  const current = await getTemplate(id);
  if (!current) return null;

  const db = await getDb();

  if (current.isBuiltin) {
    const [row] = await db
      .update(templates)
      .set({
        name: input.name ?? current.name,
        primaryColor: input.primaryColor ?? current.primaryColor,
        secondaryColor: input.secondaryColor ?? current.secondaryColor,
        logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
        content: input.content ?? current.content,
      })
      .where(eq(templates.id, id))
      .returning();

    return row ? mapRow(row) : null;
  }

  if (!canManageTemplate(current, ctx)) return null;

  const [row] = await db
    .update(templates)
    .set({
      name: input.name ?? current.name,
      primaryColor: input.primaryColor ?? current.primaryColor,
      secondaryColor: input.secondaryColor ?? current.secondaryColor,
      logoUrl: input.logoUrl !== undefined ? input.logoUrl : current.logoUrl,
      content: input.content ?? current.content,
    })
    .where(eq(templates.id, id))
    .returning();

  return row ? mapRow(row) : null;
}

export async function deleteTemplate(ctx: TemplateAccessContext, id: string) {
  if (id === DEFAULT_TEMPLATE_ID) return false;

  const current = await getTemplate(id);
  if (!current || current.isBuiltin || !canManageTemplate(current, ctx)) return false;

  const db = await getDb();
  const deleted = await db
    .delete(templates)
    .where(eq(templates.id, id))
    .returning({ id: templates.id });

  return deleted.length > 0;
}

export async function getTemplateForUser(id: string, ctx: TemplateAccessContext) {
  const template = await getTemplate(id);
  if (!template || !canUseTemplate(template, ctx)) return null;
  return template;
}

export async function duplicateTemplate(ctx: TemplateAccessContext, id: string, input?: { name?: string }) {
  const source = await getTemplate(id);
  if (!source || !canUseTemplate(source, ctx)) return null;

  const requestedName = input?.name?.trim();
  const name = (requestedName || `Cópia de ${source.name}`).slice(0, 80);

  return createTemplate(ctx, {
    name,
    primaryColor: source.primaryColor,
    secondaryColor: source.secondaryColor,
    logoUrl: source.logoUrl,
    content: source.content,
  });
}

export function previewTemplateContent(content: string, maxChars = 400) {
  const headings = Array.from(content.matchAll(/^#{2,3}\s+(.+)$/gm), (match) => match[0].trim());
  const contentPreview = content.length <= maxChars ? content : `${content.slice(0, maxChars).trimEnd()}…`;
  return { headings, contentPreview };
}

export async function resolveTemplateForUser(templateId: string, ctx: TemplateAccessContext) {
  const template = await getTemplate(templateId);
  if (!template || !canUseTemplate(template, ctx)) {
    return getTemplate(DEFAULT_TEMPLATE_ID);
  }
  return template;
}

export async function ensureDefaultTemplate() {
  const db = await getDb();
  await db
    .insert(templates)
    .values(builtinTemplates.map((template) => ({ ...template, userId: null, isBuiltin: true })))
    .onConflictDoNothing({ target: templates.id });

  // Versões anteriores ofereciam modelos internos adicionais. Documentos que
  // ainda os referenciam passam ao Default antes de remover esses registros.
  const obsoleteTemplates = await db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.isBuiltin, true), ne(templates.id, DEFAULT_TEMPLATE_ID)));
  const obsoleteTemplateIds = obsoleteTemplates.map((template) => template.id);

  if (obsoleteTemplateIds.length === 0) return;

  await db
    .update(documents)
    .set({ templateId: DEFAULT_TEMPLATE_ID })
    .where(inArray(documents.templateId, obsoleteTemplateIds));
  await db.delete(templates).where(inArray(templates.id, obsoleteTemplateIds));
}

export async function getDefaultTemplate() {
  await ensureDefaultTemplate();
  return (await getTemplate(DEFAULT_TEMPLATE_ID))!;
}
