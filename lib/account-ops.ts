import "server-only";

import {
  canDisconnectMethod,
  decidePasswordRegisterConflict,
  validatePassword,
} from "@/lib/auth-account-policy";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  accountMethods,
  clearUserGitHub,
  createPasswordUser,
  getUserByEmail,
  getUserById,
  getUserByLogin,
  setUserPasswordHash,
  toPublicAccount,
  updateUserProfile,
} from "@/lib/users";
import { resolveDocumentSharesForUser } from "@/lib/db/document-shares";
import { ensurePersonalWorkspace } from "@/lib/db/workspaces";
import { normalizeShareEmail } from "@/lib/document-share-policy";
import {
  accountProfileSchema,
  accountRegisterSchema,
  accountSetPasswordSchema,
} from "@/lib/validation";

function uniqueViolation(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  return /duplicate key|23505/i.test(text);
}

export async function registerPasswordAccount(input: unknown) {
  const parsed = accountRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Revise nome, usuário, e-mail e senha." };
  }

  const login = parsed.data.login;
  const email = normalizeShareEmail(parsed.data.email);
  const conflict = decidePasswordRegisterConflict({
    existingByLogin: (await getUserByLogin(login)) ? { id: "taken" } : null,
    existingByEmail: (await getUserByEmail(email)) ? { id: "taken" } : null,
  });
  if (!conflict.ok) return conflict;

  try {
    const user = await createPasswordUser({
      login,
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
    });
    await resolveDocumentSharesForUser(user.id, user.email);
    await ensurePersonalWorkspace(user.id);
    return { ok: true as const, user: toPublicAccount(user) };
  } catch (error) {
    if (uniqueViolation(error)) {
      return { ok: false as const, error: "Este usuário ou e-mail já tem conta. Entre para continuar." };
    }
    throw error;
  }
}

export async function updateSignedInProfile(userId: string, input: unknown) {
  const parsed = accountProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Revise o nome e o usuário." };
  }

  const current = await getUserById(userId);
  if (!current) return { ok: false as const, error: "Conta não encontrada." };

  const taken = await getUserByLogin(parsed.data.login);
  if (taken && taken.id !== userId) {
    return { ok: false as const, error: "Este usuário já está em uso." };
  }

  try {
    const user = await updateUserProfile(userId, {
      name: parsed.data.name,
      login: parsed.data.login,
    });
    if (!user) return { ok: false as const, error: "Não foi possível salvar." };
    return { ok: true as const, user: toPublicAccount(user) };
  } catch (error) {
    if (uniqueViolation(error)) {
      return { ok: false as const, error: "Este usuário já está em uso." };
    }
    throw error;
  }
}

export async function setSignedInPassword(userId: string, input: unknown) {
  const parsed = accountSetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const user = await getUserById(userId);
  if (!user) return { ok: false as const, error: "Conta não encontrada." };

  if (user.passwordHash) {
    const current = parsed.data.currentPassword ?? "";
    if (!current || !(await verifyPassword(current, user.passwordHash))) {
      return { ok: false as const, error: "A senha atual não confere." };
    }
  }

  const strength = validatePassword(parsed.data.password);
  if (!strength.ok) return strength;

  const updated = await setUserPasswordHash(userId, await hashPassword(parsed.data.password));
  if (!updated) return { ok: false as const, error: "Não foi possível salvar a senha." };
  return { ok: true as const, user: toPublicAccount(updated) };
}

export async function removeSignedInPassword(userId: string) {
  const user = await getUserById(userId);
  if (!user) return { ok: false as const, error: "Conta não encontrada." };

  const allowed = canDisconnectMethod(accountMethods(user), "password");
  if (!allowed.ok) return allowed;

  const updated = await setUserPasswordHash(userId, null);
  if (!updated) return { ok: false as const, error: "Não foi possível remover a senha." };
  return { ok: true as const, user: toPublicAccount(updated) };
}

export async function disconnectSignedInGitHub(userId: string) {
  const user = await getUserById(userId);
  if (!user) return { ok: false as const, error: "Conta não encontrada." };

  const allowed = canDisconnectMethod(accountMethods(user), "github");
  if (!allowed.ok) return allowed;

  const updated = await clearUserGitHub(userId);
  if (!updated) return { ok: false as const, error: "Não foi possível desligar o GitHub." };
  return { ok: true as const, user: toPublicAccount(updated) };
}
