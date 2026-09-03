export {
  canMutateDocument,
  canReadDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentRelease,
  getDocumentStats,
  getLatestDocumentReleaseBySlug,
  listDocumentReleases,
  listDocuments,
  listLinkableDocuments,
  publishDocument,
  updateDocument,
  type DocumentAccessContext,
} from "@/lib/db/documents";

export {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getDefaultTemplate,
  getTemplate,
  getTemplateForUser,
  listTemplates,
  previewTemplateContent,
  updateTemplate,
} from "@/lib/db/templates";

export { createMcpToken, listMcpTokens, revokeMcpToken, validateMcpToken } from "@/lib/db/mcp-tokens";

export { isDatabaseConfigured } from "@/lib/db/client";
