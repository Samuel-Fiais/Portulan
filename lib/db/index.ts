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
  setDocumentVisibility,
  setDocumentWorkspace,
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
  canManageTemplate,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getDefaultTemplate,
  getTemplate,
  getTemplateForUser,
  listTemplates,
  previewTemplateContent,
  setTemplateWorkspace,
  updateTemplate,
  type TemplateAccessContext,
} from "@/lib/db/templates";

export {
  countWorkspaceDocuments,
  countWorkspaceOwners,
  createWorkspace,
  createWorkspaceInvite,
  deleteWorkspace,
  ensurePersonalWorkspace,
  findWorkspaceInviteByToken,
  getWorkspace,
  getWorkspaceMembership,
  listUserWorkspaceIds,
  listUserWorkspaces,
  listWorkspaceCrewOtherThan,
  listWorkspaceInvites,
  listWorkspaceMemberIds,
  listWorkspaceMembers,
  redeemWorkspaceInvite,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  setWorkspaceMemberRole,
  transferWorkspaceCaptaincy,
  updateWorkspaceIdentity,
} from "@/lib/db/workspaces";

export { createMcpToken, listMcpTokens, revokeMcpToken, validateMcpToken } from "@/lib/db/mcp-tokens";

export { isDatabaseConfigured } from "@/lib/db/client";
