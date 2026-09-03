import "server-only";

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { normalizeShareEmail } from "@/lib/db/document-shares";

export type GitHubProfile = {
  id: number | string;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export async function upsertUserFromGitHub(profile: GitHubProfile) {
  const db = await getDb();
  const githubId = String(profile.id);
  const login = profile.login ?? githubId;
  const name = profile.name ?? null;
  const avatarUrl = profile.avatar_url ?? null;
  const email = profile.email ? normalizeShareEmail(profile.email) : null;

  const [existing] = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ login, name, avatarUrl, email: email ?? existing.email })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({ githubId, login, name, avatarUrl, email })
    .returning();
  return created;
}

export async function getUserByGitHubId(githubId: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
  return user ?? null;
}

export async function getUserById(id: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const normalized = normalizeShareEmail(email);
  const [user] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.email}) = ${normalized}`)
    .limit(1);
  return user ?? null;
}
