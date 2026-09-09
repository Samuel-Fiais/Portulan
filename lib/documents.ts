export const documentStatuses = ["draft", "review", "published", "archived"] as const;

export type DocumentStatus = (typeof documentStatuses)[number];

export const DEFAULT_TEMPLATE_ID = "portulan-default";

export const DEFAULT_TEMPLATE_COLORS = {
  primary: "#1a2847",
  secondary: "#8b2735",
} as const;

export const builtinTemplates = [
  {
    id: DEFAULT_TEMPLATE_ID,
    name: "Default",
    primaryColor: "#1a2847",
    secondaryColor: "#8b2735",
    content: "## Visão geral\n\nDescreva o contexto, objetivo e público deste documento.\n\n## Conteúdo principal\n\nDesenvolva o assunto com clareza e evidências.\n\n:::callout{title=\"Destaque\"}\nInformação relevante para o leitor.\n:::\n\n## Próximos passos\n\n- Ação ou decisão pendente\n- Responsável e prazo",
  },
] as const;

export type TemplateRecord = {
  id: string;
  userId: string | null;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  content: string;
  isBuiltin: boolean;
  createdAt: string;
};

export type DocumentRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  templateId: string;
  templateName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  status: DocumentStatus;
  author: string;
  team: string;
  tags: string[];
  content: string;
  version: number;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  disabled: boolean;
};

export type DocumentSummary = Omit<DocumentRecord, "content">;

/** Biblioteca: metadados para listagem + conteúdo só para busca local. */
export type DocumentLibraryItem = DocumentSummary & { content: string };

export type DocumentStats = {
  total: number;
  published: number;
  review: number;
  draft: number;
  archived: number;
};

export type DocumentRelease = {
  id: string;
  documentId: string;
  version: number;
  title: string;
  summary: string;
  templateId: string;
  templateName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  author: string;
  team: string;
  tags: string[];
  content: string;
  publishedAt: string;
  disabled: boolean;
  publishedByUserId: string | null;
  publishedByLogin: string | null;
  publishedByName: string | null;
  publishedByAvatarUrl: string | null;
};

export type DocumentShareRole = "viewer" | "editor";

export type DocumentShareRecord = {
  id: string;
  documentId: string;
  email: string;
  role: DocumentShareRole;
  invitedBy: string;
  userId: string | null;
  createdAt: string;
  userLogin: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
};

export type DocumentCollaborator = {
  id: string;
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: DocumentShareRole | "owner";
  email?: string;
};

export type DocumentCommentRecord = {
  id: string;
  documentId: string;
  userId: string;
  body: string;
  sectionAnchor: string | null;
  createdAt: string;
  userLogin: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
};

export type DocumentAccessLevel = "owner" | "editor" | "viewer" | "legacy" | null;

export function releaseToDocumentRecord(release: DocumentRelease): DocumentRecord {
  return {
    id: release.documentId,
    slug: "",
    title: release.title,
    summary: release.summary,
    templateId: release.templateId,
    templateName: release.templateName,
    primaryColor: release.primaryColor,
    secondaryColor: release.secondaryColor,
    logoUrl: release.logoUrl,
    status: "published",
    author: release.author,
    team: release.team,
    tags: release.tags,
    content: release.content,
    version: release.version,
    userId: null,
    createdAt: release.publishedAt,
    updatedAt: release.publishedAt,
    publishedAt: release.publishedAt,
    disabled: false,
  };
}

export type PublicAccessDenied = "not_found" | "document_disabled" | "release_disabled" | "no_enabled_release";

export type PublicReleaseResult =
  | { access: "ok"; release: DocumentRelease; slug: string }
  | { access: Exclude<PublicAccessDenied, "not_found"> | "not_found"; slug?: string };

export type DocumentInput = Pick<
  DocumentRecord,
  "title" | "summary" | "templateId" | "status" | "author" | "team" | "tags" | "content"
>;

export type DocumentPublishSnapshot = Pick<
  DocumentRecord,
  | "title"
  | "summary"
  | "templateId"
  | "templateName"
  | "primaryColor"
  | "secondaryColor"
  | "logoUrl"
  | "author"
  | "team"
  | "tags"
  | "content"
>;

export function documentToPublishSnapshot(document: DocumentRecord): DocumentPublishSnapshot {
  return {
    title: document.title,
    summary: document.summary,
    templateId: document.templateId,
    templateName: document.templateName,
    primaryColor: document.primaryColor,
    secondaryColor: document.secondaryColor,
    logoUrl: document.logoUrl,
    author: document.author,
    team: document.team,
    tags: document.tags,
    content: document.content,
  };
}

export function releaseToPublishSnapshot(release: DocumentRelease): DocumentPublishSnapshot {
  return {
    title: release.title,
    summary: release.summary,
    templateId: release.templateId,
    templateName: release.templateName,
    primaryColor: release.primaryColor,
    secondaryColor: release.secondaryColor,
    logoUrl: release.logoUrl,
    author: release.author,
    team: release.team,
    tags: release.tags,
    content: release.content,
  };
}

function publishTagsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((tag, index) => tag === sortedRight[index]);
}

export function publishSnapshotsEqual(left: DocumentPublishSnapshot, right: DocumentPublishSnapshot) {
  return (
    left.title === right.title
    && left.summary === right.summary
    && left.templateId === right.templateId
    && left.templateName === right.templateName
    && left.primaryColor === right.primaryColor
    && left.secondaryColor === right.secondaryColor
    && left.logoUrl === right.logoUrl
    && left.author === right.author
    && left.team === right.team
    && publishTagsEqual(left.tags, right.tags)
    && left.content === right.content
  );
}

export function hasUnpublishedChanges(
  document: DocumentPublishSnapshot,
  latestRelease: DocumentRelease | null | undefined,
) {
  if (!latestRelease) return true;
  return !publishSnapshotsEqual(document, releaseToPublishSnapshot(latestRelease));
}

export type TemplateInput = Pick<TemplateRecord, "name" | "primaryColor" | "secondaryColor" | "logoUrl" | "content">;

export const statusMeta: Record<DocumentStatus, { label: string; tone: string }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  review: { label: "Em revisão", tone: "warning" },
  published: { label: "Publicado", tone: "success" },
  archived: { label: "Arquivado", tone: "neutral" },
};

export const defaultDocumentContent = builtinTemplates[0].content;
