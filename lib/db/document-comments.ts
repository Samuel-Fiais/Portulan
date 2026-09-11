import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documentComments, users } from "@/lib/db/schema";
import type { DocumentCommentRecord } from "@/lib/documents";

function mapCommentRow(
  row: typeof documentComments.$inferSelect,
  user?: { login: string | null; name: string | null; avatarUrl: string | null } | null,
): DocumentCommentRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    userId: row.userId,
    body: row.body,
    sectionAnchor: row.sectionAnchor,
    quotedText: row.quotedText,
    parentId: row.parentId,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
    userLogin: user?.login ?? null,
    userName: user?.name ?? null,
    userAvatarUrl: user?.avatarUrl ?? null,
  };
}

export async function listDocumentComments(documentId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      comment: documentComments,
      userLogin: users.login,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(documentComments)
    .innerJoin(users, eq(documentComments.userId, users.id))
    .where(eq(documentComments.documentId, documentId))
    .orderBy(documentComments.createdAt);

  return rows.map(({ comment, userLogin, userName, userAvatarUrl }) =>
    mapCommentRow(comment, { login: userLogin, name: userName, avatarUrl: userAvatarUrl }),
  );
}

export async function addDocumentComment(
  documentId: string,
  userId: string,
  input: {
    body: string;
    sectionAnchor?: string | null;
    quotedText?: string | null;
    parentId?: string | null;
  },
) {
  const db = await getDb();
  const [row] = await db
    .insert(documentComments)
    .values({
      documentId,
      userId,
      body: input.body.trim(),
      sectionAnchor: input.parentId ? null : input.sectionAnchor?.trim() || null,
      quotedText: input.parentId ? null : input.quotedText?.trim() || null,
      parentId: input.parentId || null,
    })
    .returning();

  if (!row) return null;

  const [user] = await db
    .select({ login: users.login, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return mapCommentRow(row, user ?? null);
}

export async function setDocumentCommentResolved(
  commentId: string,
  documentId: string,
  resolved: boolean,
) {
  const db = await getDb();
  const [row] = await db
    .update(documentComments)
    .set({ resolvedAt: resolved ? new Date().toISOString() : null })
    .where(
      and(
        eq(documentComments.id, commentId),
        eq(documentComments.documentId, documentId),
      ),
    )
    .returning();

  if (!row) return null;

  const [user] = await db
    .select({ login: users.login, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  return mapCommentRow(row, user ?? null);
}

export async function deleteDocumentComment(commentId: string, documentId: string, userId: string) {
  const db = await getDb();
  const result = await db
    .delete(documentComments)
    .where(
      and(
        eq(documentComments.id, commentId),
        eq(documentComments.documentId, documentId),
        eq(documentComments.userId, userId),
      ),
    )
    .returning({ id: documentComments.id });

  return result.length > 0;
}
