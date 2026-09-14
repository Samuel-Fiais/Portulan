import type { ThemeMode, ThemePaperId } from "./workspace-themes.ts";

export const workspaceRoles = ["owner", "admin", "member"] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];

/** Papéis que podem ser atribuídos a um convite (capitania não se convida, se transfere). */
export const workspaceInviteRoles = ["admin", "member"] as const;

export type WorkspaceInviteRole = (typeof workspaceInviteRoles)[number];

export const documentVisibilities = ["private", "workspace", "public"] as const;

export type DocumentVisibility = (typeof documentVisibilities)[number];

export type WorkspaceRecord = {
  id: string;
  slug: string;
  name: string;
  themePaper: ThemePaperId;
  themeMode: ThemeMode;
  themeInk: string;
  isPersonal: boolean;
  createdBy: string | null;
  createdAt: string;
};

export type WorkspaceMembership = WorkspaceRecord & {
  role: WorkspaceRole;
  memberCount: number;
};

export type WorkspaceMemberRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  login: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type WorkspaceInviteRecord = {
  id: string;
  workspaceId: string;
  role: WorkspaceInviteRole;
  createdBy: string;
  createdByName: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  revokedAt: string | null;
  createdAt: string;
  /** Só volta preenchido no momento da criação. */
  token?: string;
};

export const WORKSPACE_NAME_MIN = 2;
export const WORKSPACE_NAME_MAX = 60;

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && (workspaceRoles as readonly string[]).includes(value);
}

export function isDocumentVisibility(value: unknown): value is DocumentVisibility {
  return typeof value === "string" && (documentVisibilities as readonly string[]).includes(value);
}

/** Rótulos de tripulação usados na UI. Papel de código em inglês, copy em português náutico. */
export const workspaceRoleMeta: Record<WorkspaceRole, { label: string; blurb: string }> = {
  owner: { label: "Capitão", blurb: "Comanda o porto: tripulação, tema, nome e capitania" },
  admin: { label: "Imediato", blurb: "Cuida da tripulação: convida, remove e muda papéis" },
  member: { label: "Tripulante", blurb: "Navega o porto: cria as próprias cartas e lê as do porto" },
};

export const documentVisibilityMeta: Record<
  DocumentVisibility,
  { label: string; blurb: string; shortLabel: string }
> = {
  private: {
    label: "Camarote",
    shortLabel: "Camarote",
    blurb: "Só o cartógrafo e quem foi convidado nominalmente",
  },
  workspace: {
    label: "Porto",
    shortLabel: "Porto",
    blurb: "Toda a tripulação do porto pode ler a versão publicada e o rascunho",
  },
  public: {
    label: "Mar aberto",
    shortLabel: "Mar aberto",
    blurb: "Qualquer pessoa com o link vê a versão publicada",
  },
};

export function workspaceInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").toUpperCase();
}

export function personalWorkspaceName(displayName: string | null | undefined, login: string) {
  const base = (displayName?.trim() || login).split(/\s+/)[0];
  return `Porto de ${base}`.slice(0, WORKSPACE_NAME_MAX);
}
