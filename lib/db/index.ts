export {
  canMutateDocument,
  canReadDocument,
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentRelease,
  getDocumentStats,
  listDocumentReleases,
  listDocuments,
  publishDocument,
  updateDocument,
  type DocumentAccessContext,
} from "@/lib/db/documents";

export {
  createTemplate,
  deleteTemplate,
  getDefaultTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from "@/lib/db/templates";

export { createMcpToken, listMcpTokens, revokeMcpToken, validateMcpToken } from "@/lib/db/mcp-tokens";

export { isDatabaseConfigured } from "@/lib/db/client";
