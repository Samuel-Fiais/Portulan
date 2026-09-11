export {
  canEditDocument,
  canMutateDocument,
  canReadDocument,
  createDocument,
  duplicateDocument,
  deleteDocument,
  getDocument,
  getDocumentAccessLevel,
  getDocumentRelease,
  getDocumentStats,
  getLatestDocumentReleaseBySlug,
  isDocumentOwner,
  listDocumentReleases,
  listDocuments,
  listLinkableDocuments,
  publishDocument,
  restoreDocumentRelease,
  resolvePublicLatestReleaseBySlug,
  resolvePublicReleaseById,
  setDocumentDisabled,
  setDocumentPublic,
  setDocumentReleaseDisabled,
  updateDocument,
  updateDocumentLivingContent,
  type DocumentAccessContext,
} from "@/lib/db/documents";

export {
  addDocumentShare,
  documentHasAnyShares,
  isPrivateOwnedDocument,
  listDocumentCollaborators,
  listDocumentShares,
  revokeDocumentShare,
  updateDocumentShareRole,
} from "@/lib/db/document-shares";

export {
  addDocumentComment,
  deleteDocumentComment,
  listDocumentComments,
  setDocumentCommentResolved,
} from "@/lib/db/document-comments";

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
