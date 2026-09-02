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
  author: string;
  team: string;
  tags: string[];
  content: string;
  publishedAt: string;
};

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
  };
}

export type DocumentInput = Pick<
  DocumentRecord,
  "title" | "summary" | "templateId" | "status" | "author" | "team" | "tags" | "content"
>;

export type TemplateInput = Pick<TemplateRecord, "name" | "primaryColor" | "secondaryColor" | "content">;

export const statusMeta: Record<DocumentStatus, { label: string; tone: string }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  review: { label: "Em revisão", tone: "warning" },
  published: { label: "Publicado", tone: "success" },
  archived: { label: "Arquivado", tone: "neutral" },
};

export const defaultDocumentContent = builtinTemplates[0].content;
