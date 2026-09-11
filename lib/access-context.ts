import "server-only";

import { resolveDocumentSharesForUser } from "@/lib/db/document-shares";
import type { DocumentAccessContext } from "@/lib/db";
import { getUserById } from "@/lib/users";

export async function documentAccessContext(userId?: string | null): Promise<DocumentAccessContext> {
  if (!userId) return { userId: null, userEmail: null };
  const user = await getUserById(userId);
  const userEmail = user?.email ?? null;
  await resolveDocumentSharesForUser(userId, userEmail);
  return { userId, userEmail };
}
