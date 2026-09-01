import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { templates } from "@/lib/db/schema";
import {
  DEFAULT_TEMPLATE_COLORS,
  DEFAULT_TEMPLATE_ID,
  defaultDocumentContent,
  type TemplateInput,
  type TemplateRecord,
} from "@/lib/documents";

function mapRow(row: typeof templates.$inferSelect): TemplateRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    content: row.content,
    isBuiltin: row.isBuiltin,
    createdAt: row.createdAt,
  };
}

export function canUseTemplate(template: TemplateRecord, userId: string) {
  return template.isBuiltin || template.userId === userId;
}

export async function getTemplate(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function listTemplates(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(templates)
    .where(or(eq(templates.isBuiltin, true), eq(templates.userId, userId)))
    .orderBy(desc(templates.isBuiltin), desc(templates.createdAt));
  return rows.map(mapRow);
}

export async function createTemplate(userId: string, input: TemplateInput) {
  const db = await getDb();
  const id = randomUUID();
  const [row] = await db
    .insert(templates)
    .values({
      id,
      userId,
      name: input.name,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      content: input.content || defaultDocumentContent,
      isBuiltin: false,
    })
    .returning();

  return mapRow(row);
}

export async function updateTemplate(userId: string, id: string, input: Partial<TemplateInput>) {
  const current = await getTemplate(id);
  if (!current || current.isBuiltin || current.userId !== userId) return null;

  const db = await getDb();
  const [row] = await db
    .update(templates)
    .set({
      name: input.name ?? current.name,
      primaryColor: input.primaryColor ?? current.primaryColor,
      secondaryColor: input.secondaryColor ?? current.secondaryColor,
      content: input.content ?? current.content,
    })
    .where(and(eq(templates.id, id), eq(templates.userId, userId)))
    .returning();

  return row ? mapRow(row) : null;
}

export async function deleteTemplate(userId: string, id: string) {
  if (id === DEFAULT_TEMPLATE_ID) return false;

  const current = await getTemplate(id);
  if (!current || current.isBuiltin || current.userId !== userId) return false;

  const db = await getDb();
  const deleted = await db
    .delete(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId)))
    .returning({ id: templates.id });

  return deleted.length > 0;
}

export async function resolveTemplateForUser(templateId: string, userId: string) {
  const template = await getTemplate(templateId);
  if (!template || !canUseTemplate(template, userId)) {
    return getTemplate(DEFAULT_TEMPLATE_ID);
  }
  return template;
}

export async function ensureDefaultTemplate() {
  const db = await getDb();
  const [existing] = await db.select({ id: templates.id }).from(templates).where(eq(templates.id, DEFAULT_TEMPLATE_ID)).limit(1);
  if (existing) return;

  await db.insert(templates).values({
    id: DEFAULT_TEMPLATE_ID,
    userId: null,
    name: "Default",
    primaryColor: DEFAULT_TEMPLATE_COLORS.primary,
    secondaryColor: DEFAULT_TEMPLATE_COLORS.secondary,
    content: defaultDocumentContent,
    isBuiltin: true,
  });
}

export async function getDefaultTemplate() {
  await ensureDefaultTemplate();
  return (await getTemplate(DEFAULT_TEMPLATE_ID))!;
}
