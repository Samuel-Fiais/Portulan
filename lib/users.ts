import "server-only";

import { eq, sql } from "drizzle-orm";
import {
  decideGitHubSignIn,
  fallbackLoginSeed,
  nextLoginCandidate,
  normalizeHandle,
  validateHandle,
} from "@/lib/auth-account-policy";
import { ensurePersonalWorkspace } from "@/lib/db/workspaces";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { PublicAccount } from "@/lib/account-types";
import { normalizeShareEmail } from "@/lib/db/document-shares";

export type PortulanUser = typeof users.$inferSelect;

export type GitHubProfile = {
  id: number | string;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

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

export async function getUserByLogin(login: string) {
  const db = await getDb();
  const normalized = normalizeHandle(login);
  const [user] = await db
    .select()
    .from(users)
    .where(sql`LOWER(${users.login}) = ${normalized}`)
    .limit(1);
  return user ?? null;
}

export async function getUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return getUserByEmail(trimmed);
  return getUserByLogin(trimmed);
}

export async function allocateUniqueLogin(preferred: string) {
  const validated = validateHandle(preferred);
  const seed = validated.ok ? validated.handle : fallbackLoginSeed(preferred);

  for (let attempt = 1; attempt < 10_000; attempt += 1) {
    const candidate = nextLoginCandidate(seed, attempt);
    if (!(await getUserByLogin(candidate))) return candidate;
  }

  throw new Error("Não foi possível gerar um usuário único.");
}

async function applyGitHubProfile(userId: string, profile: GitHubProfile, attachGithub: boolean) {
  const db = await getDb();
  const existing = await getUserById(userId);
  if (!existing) return null;

  const githubId = String(profile.id);
  const email = profile.email ? normalizeShareEmail(profile.email) : null;
  const [updated] = await db
    .update(users)
    .set({
      githubId: attachGithub ? githubId : existing.githubId,
      avatarUrl: profile.avatar_url ?? existing.avatarUrl,
      email: existing.email ?? email,
      name: existing.name ?? profile.name ?? null,
    })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function createUserFromGitHub(profile: GitHubProfile) {
  const db = await getDb();
  const githubId = String(profile.id);
  const login = await allocateUniqueLogin(profile.login ?? githubId);
  const email = profile.email ? normalizeShareEmail(profile.email) : null;
  const [created] = await db
    .insert(users)
    .values({
      githubId,
      login,
      name: profile.name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      email,
    })
    .returning();
  return created;
}

export async function createPasswordUser(input: {
  login: string;
  email: string;
  name: string;
  passwordHash: string;
}) {
  const db = await getDb();
  const [created] = await db
    .insert(users)
    .values({
      githubId: null,
      login: input.login,
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
    })
    .returning();
  return created;
}

export async function updateUserProfile(
  userId: string,
  input: { name?: string; login?: string },
) {
  const db = await getDb();
  const [updated] = await db.update(users).set(input).where(eq(users.id, userId)).returning();
  return updated ?? null;
}

export async function setUserPasswordHash(userId: string, passwordHash: string | null) {
  const db = await getDb();
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function clearUserGitHub(userId: string) {
  const db = await getDb();
  const [updated] = await db
    .update(users)
    .set({ githubId: null })
    .where(eq(users.id, userId))
    .returning();
  return updated ?? null;
}

export async function resolveGitHubUser(profile: GitHubProfile, linkUserId?: string | null) {
  const githubId = String(profile.id);
  if (!githubId) {
    return { ok: false as const, error: "Não foi possível ler a conta GitHub." };
  }

  const email = profile.email ? normalizeShareEmail(profile.email) : null;
  const existingByGithub = await getUserByGitHubId(githubId);
  const existingByEmail = email ? await getUserByEmail(email) : null;
  const decision = decideGitHubSignIn({
    existingByGithub: existingByGithub ? { id: existingByGithub.id } : null,
    existingByEmail: existingByEmail
      ? { id: existingByEmail.id, githubId: existingByEmail.githubId }
      : null,
    linkUserId: linkUserId ?? null,
  });

  if (!decision.ok) return decision;

  if (decision.action === "use" && decision.userId) {
    const user = await applyGitHubProfile(decision.userId, profile, Boolean(linkUserId));
    if (!user) return { ok: false as const, error: "Conta não encontrada." };
    return { ok: true as const, user };
  }

  if (decision.action === "attach" && decision.userId) {
    const user = await applyGitHubProfile(decision.userId, profile, true);
    if (!user) return { ok: false as const, error: "Conta não encontrada." };
    return { ok: true as const, user };
  }

  const user = await createUserFromGitHub(profile);
  await ensurePersonalWorkspace(user.id);
  return { ok: true as const, user };
}

export function accountMethods(user: Pick<PortulanUser, "githubId" | "passwordHash">) {
  return {
    hasGithub: Boolean(user.githubId),
    hasPassword: Boolean(user.passwordHash),
  };
}

export function toPublicAccount(user: PortulanUser): PublicAccount {
  const methods = accountMethods(user);
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    email: user.email,
    image: user.avatarUrl,
    hasGithub: methods.hasGithub,
    hasPassword: methods.hasPassword,
  };
}
