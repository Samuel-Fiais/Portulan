import "server-only";

import type { DocumentAccessContext } from "@/lib/db";
import { getUserById } from "@/lib/users";

export async function documentAccessContext(userId?: string | null): Promise<DocumentAccessContext> {
  if (!userId) return { userId: null, userEmail: null };
  const user = await getUserById(userId);
  return { userId, userEmail: user?.email ?? null };
}
