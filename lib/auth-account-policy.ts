export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_HANDLE_LENGTH = 3;
export const MAX_HANDLE_LENGTH = 30;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 100;

export type PolicyResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export function normalizeHandle(login: string) {
  return login.trim().toLowerCase();
}

export function isEmailIdentifier(value: string) {
  return value.trim().includes("@");
}

export function validateHandle(login: string): PolicyResult<{ handle: string }> {
  const handle = normalizeHandle(login);
  if (handle.length < MIN_HANDLE_LENGTH || handle.length > MAX_HANDLE_LENGTH) {
    return { ok: false, error: "O usuário deve ter entre 3 e 30 caracteres." };
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(handle)) {
    return { ok: false, error: "Use letras, números, ponto, hífen ou sublinhado." };
  }
  return { ok: true, handle };
}

export function validatePassword(password: string): PolicyResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: "A senha é longa demais." };
  }
  return { ok: true };
}

export function validateDisplayName(name: string): PolicyResult<{ name: string }> {
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "O nome deve ter entre 2 e 100 caracteres." };
  }
  return { ok: true, name: trimmed };
}

export function canDisconnectMethod(
  account: { hasGithub: boolean; hasPassword: boolean },
  method: "github" | "password",
): PolicyResult {
  const remaining = method === "github" ? account.hasPassword : account.hasGithub;
  if (!remaining) {
    return { ok: false, error: "Não é possível desligar o último método de entrada." };
  }
  return { ok: true };
}

export type GitHubSignInDecision =
  | { ok: true; action: "use" | "attach" | "create"; userId?: string }
  | { ok: false; error: string };

export function decideGitHubSignIn(input: {
  existingByGithub: { id: string } | null;
  existingByEmail: { id: string; githubId: string | null } | null;
  linkUserId: string | null;
}): GitHubSignInDecision {
  const { existingByGithub, existingByEmail, linkUserId } = input;

  if (linkUserId) {
    if (existingByGithub && existingByGithub.id !== linkUserId) {
      return { ok: false, error: "Este GitHub já está ligado a outra conta." };
    }
    if (existingByEmail && existingByEmail.id !== linkUserId) {
      return { ok: false, error: "Este e-mail do GitHub já pertence a outra conta." };
    }
    return existingByGithub
      ? { ok: true, action: "use", userId: linkUserId }
      : { ok: true, action: "attach", userId: linkUserId };
  }

  if (existingByGithub) {
    return { ok: true, action: "use", userId: existingByGithub.id };
  }

  if (existingByEmail) {
    if (existingByEmail.githubId) {
      return { ok: false, error: "Este e-mail já tem conta. Entre para continuar." };
    }
    return { ok: true, action: "attach", userId: existingByEmail.id };
  }

  return { ok: true, action: "create" };
}

export function decidePasswordRegisterConflict(input: {
  existingByLogin: { id: string } | null;
  existingByEmail: { id: string } | null;
}): PolicyResult {
  if (input.existingByLogin) {
    return { ok: false, error: "Este usuário já está em uso. Entre para continuar." };
  }
  if (input.existingByEmail) {
    return { ok: false, error: "Este e-mail já tem conta. Entre para continuar." };
  }
  return { ok: true };
}

export function fallbackLoginSeed(preferred: string) {
  const cleaned = normalizeHandle(preferred).replace(/[^a-z0-9._-]/g, "");
  const seed = cleaned || "user";
  if (seed.length >= MIN_HANDLE_LENGTH) return seed.slice(0, MAX_HANDLE_LENGTH);
  return `${seed}user`.slice(0, MAX_HANDLE_LENGTH);
}

export function nextLoginCandidate(seed: string, attempt: number) {
  if (attempt <= 1) return seed.slice(0, MAX_HANDLE_LENGTH);
  const suffix = `-${attempt}`;
  return `${seed.slice(0, MAX_HANDLE_LENGTH - suffix.length)}${suffix}`;
}
