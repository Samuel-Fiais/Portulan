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

export {
  createMcpToken,
  listMcpTokens,
  recordMcpClientInfo,
  revokeMcpToken,
  revokeMcpTokensForAgentIdentity,
  revokeMcpTokensForWorkspaceUser,
  validateMcpToken,
  validateMcpTokenWithReason,
} from "@/lib/db/mcp-tokens";

export {
  createAgentIdentity,
  deleteAgentIdentity,
  getAgentIdentity,
  listAgentIdentities,
  setAgentIdentityStatus,
  updateAgentIdentity,
} from "@/lib/db/agent-identities";

export {
  countAuditEventsForWorkspace,
  listAuditEvents,
  listAuditEventsForIdentity,
  queryAuditEvents,
  recordAuditEvent,
  type AuditEventQuery,
} from "@/lib/db/audit-events";

export {
  announceCollabCommandApplied,
  announceCollabCommandWithWorkspaceFeed,
  type CollabCommandAnnounceInput,
} from "@/lib/db/collab-command-announce";

export {
  bumpCollabRoomPolicyVersion,
  bumpCollabRoomPolicyVersions,
  ensureCollabRoom,
  getCollabRoom,
  getCollabRoomById,
  listCollabRooms,
} from "@/lib/db/collab-rooms";

export {
  findPresenceSessionForActor,
  joinOrHeartbeatPresence,
  leavePresenceSession,
  listActivePresenceViews,
  listPresenceSessionsForRoom,
  revokePresenceForAgentIdentity,
  revokePresenceForMcpToken,
  revokePresenceForWorkspaceUser,
  revokePresenceSessions,
  type PresenceSessionView,
} from "@/lib/db/presence-sessions";

export {
  appendCollabEvent,
  collabEventStore,
  getCollabEventByIdempotencyKey,
  getLatestCollabSeq,
  listCollabEvents,
  readCollabEventsSince,
} from "@/lib/db/collab-events";

export {
  applyCollabContentOperation,
  getCollabContentSnapshot,
} from "@/lib/db/collab-content-apply";

export { isDatabaseConfigured } from "@/lib/db/client";
