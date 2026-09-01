import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type GitHubProfile = {
  id: number | string;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
};

export async function upsertUserFromGitHub(profile: GitHubProfile) {
  const db = await getDb();
  const githubId = String(profile.id);
  const login = profile.login ?? githubId;
  const name = profile.name ?? null;
  const avatarUrl = profile.avatar_url ?? null;

  const [existing] = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ login, name, avatarUrl })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({ githubId, login, name, avatarUrl })
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
