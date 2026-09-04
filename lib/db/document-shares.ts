import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { documentShares, documents, users } from "@/lib/db/schema";
import { normalizeShareEmail, validateShareInvite, validateShareRoleUpdate } from "@/lib/document-share-policy";
import type { DocumentShareRecord, DocumentShareRole } from "@/lib/documents";
import { getUserById } from "@/lib/users";

export { normalizeShareEmail } from "@/lib/document-share-policy";

function mapShareRow(
  row: typeof documentShares.$inferSelect,
  user?: { login: string | null; name: string | null; avatarUrl: string | null } | null,
): DocumentShareRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    email: row.email,
    role: row.role as DocumentShareRole,
    invitedBy: row.invitedBy,
    userId: row.userId,
    createdAt: row.createdAt,
    userLogin: user?.login ?? null,
    userName: user?.name ?? null,
    userAvatarUrl: user?.avatarUrl ?? null,
  };
}

export async function resolveDocumentSharesForUser(userId: string, email: string | null) {
  if (!email) return;

  const db = await getDb();
  const normalized = normalizeShareEmail(email);
  await db
    .update(documentShares)
    .set({ userId })
    .where(and(isNull(documentShares.userId), eq(documentShares.email, normalized)));
}

export async function getDocumentShareRole(
  documentId: string,
  userId?: string | null,
  userEmail?: string | null,
): Promise<DocumentShareRole | null> {
  if (!userId && !userEmail) return null;

  const db = await getDb();
  const clauses = [];
  if (userId) clauses.push(eq(documentShares.userId, userId));
  if (userEmail) clauses.push(eq(documentShares.email, normalizeShareEmail(userEmail)));

  const [row] = await db
    .select({ role: documentShares.role })
    .from(documentShares)
    .where(and(eq(documentShares.documentId, documentId), or(...clauses)))
    .limit(1);

  return row ? (row.role as DocumentShareRole) : null;
}

export async function listSharedDocumentIds(userId: string, userEmail?: string | null) {
  const db = await getDb();
  const clauses = [eq(documentShares.userId, userId)];
  if (userEmail) {
    clauses.push(eq(documentShares.email, normalizeShareEmail(userEmail)));
  }

  const rows = await db
    .selectDistinct({ documentId: documentShares.documentId })
    .from(documentShares)
    .where(or(...clauses));

  return rows.map((row) => row.documentId);
}

export async function listDocumentShares(documentId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      share: documentShares,
      userLogin: users.login,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(documentShares)
    .leftJoin(users, eq(documentShares.userId, users.id))
    .where(eq(documentShares.documentId, documentId))
    .orderBy(documentShares.createdAt);

  return rows.map(({ share, userLogin, userName, userAvatarUrl }) =>
    mapShareRow(share, { login: userLogin, name: userName, avatarUrl: userAvatarUrl }),
  );
}

export async function addDocumentShare(
  documentId: string,
  email: string,
  role: DocumentShareRole,
  invitedBy: string,
): Promise<{ ok: true; share: DocumentShareRecord } | { ok: false; error: string }> {
  const db = await getDb();
  const normalized = normalizeShareEmail(email);

  const [document] = await db
    .select({ userId: documents.userId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  const owner = document?.userId ? await getUserById(document.userId) : null;
  const existingShares = await listDocumentShares(documentId);

  const [invitee] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(or(eq(users.email, normalized), sql`LOWER(${users.email}) = ${normalized}`))
    .limit(1);

  const validation = validateShareInvite({
    email: normalized,
    role,
    ownerId: document?.userId ?? null,
    ownerEmail: owner?.email ?? null,
    inviteeUserId: invitee?.id ?? null,
    existingShares,
  });
  if (!validation.ok) return validation;

  const [created] = await db
    .insert(documentShares)
    .values({
      documentId,
      email: normalized,
      role,
      invitedBy,
      userId: invitee?.id ?? null,
    })
    .returning();

  const [row] = await db
    .select({
      share: documentShares,
      userLogin: users.login,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(documentShares)
    .leftJoin(users, eq(documentShares.userId, users.id))
    .where(eq(documentShares.id, created.id))
    .limit(1);

  return row
    ? { ok: true as const, share: mapShareRow(row.share, { login: row.userLogin, name: row.userName, avatarUrl: row.userAvatarUrl }) }
    : { ok: false as const, error: "Não foi possível adicionar o compartilhamento." };
}

export async function updateDocumentShareRole(
  shareId: string,
  documentId: string,
  role: DocumentShareRole,
): Promise<{ ok: true; share: DocumentShareRecord } | { ok: false; error: string }> {
  const existingShares = await listDocumentShares(documentId);
  const current = existingShares.find((share) => share.id === shareId);
  if (!current) return { ok: false, error: "Compartilhamento não encontrado." };

  const validation = validateShareRoleUpdate(current.role, role);
  if (!validation.ok) return validation;

  const db = await getDb();
  const updated = await db
    .update(documentShares)
    .set({ role })
    .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
    .returning({ id: documentShares.id });

  if (!updated.length) return { ok: false, error: "Compartilhamento não encontrado." };
  const shares = await listDocumentShares(documentId);
  const share = shares.find((item) => item.id === shareId);
  return share
    ? { ok: true, share }
    : { ok: false, error: "Compartilhamento não encontrado." };
}

export async function revokeDocumentShare(shareId: string, documentId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(documentShares)
    .where(and(eq(documentShares.id, shareId), eq(documentShares.documentId, documentId)))
    .returning({ id: documentShares.id });
  return deleted.length > 0;
}

export async function documentHasAnyShares(documentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: documentShares.id })
    .from(documentShares)
    .where(eq(documentShares.documentId, documentId))
    .limit(1);
  return Boolean(row);
}

export async function listDocumentCollaborators(documentId: string, ownerId: string | null) {
  const db = await getDb();
  const shares = await listDocumentShares(documentId);

  const collaborators: Array<{
    id: string;
    login: string | null;
    name: string | null;
    avatarUrl: string | null;
    role: DocumentShareRole | "owner";
    email?: string;
  }> = [];

  if (ownerId) {
    const [owner] = await db
      .select({ id: users.id, login: users.login, name: users.name, avatarUrl: users.avatarUrl, email: users.email })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);
    if (owner) {
      collaborators.push({
        id: owner.id,
        login: owner.login,
        name: owner.name,
        avatarUrl: owner.avatarUrl,
        role: "owner",
        email: owner.email ?? undefined,
      });
    }
  }

  for (const share of shares) {
    collaborators.push({
      id: share.userId ?? share.id,
      login: share.userLogin,
      name: share.userName,
      avatarUrl: share.userAvatarUrl,
      role: share.role,
      email: share.email,
    });
  }

  return collaborators;
}

export async function isPrivateOwnedDocument(documentId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ userId: documents.userId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  return Boolean(row?.userId);
}
