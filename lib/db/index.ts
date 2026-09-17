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
  countWorkspacePacks,
  countWorkspaceProjects,
  countWorkspaceRepositories,
  createProject,
  createRepository,
  deleteProject,
  findRepositoryByName,
  findRepositoryByRemote,
  getProject,
  getRepository,
  linkProjectRepository,
  listProjectRepositories,
  listProjects,
  listProjectsForRepository,
  listRepositories,
  unlinkProjectRepository,
  updateProject,
  updateRepository,
} from "@/lib/db/projects";

export {
  addAcceptanceCriterion,
  addContextPackItem,
  addContextPackSource,
  approveContextPack,
  createContextPack,
  deleteAcceptanceCriterion,
  deleteContextPackItem,
  deleteContextPackSource,
  getContextPack,
  getDraftPlan,
  getImplementationPlan,
  getRevision,
  listContextPacks,
  listDraftCriteria,
  listDraftItems,
  listDraftSources,
  listPacksUsingDocument,
  listRevisionCriteria,
  listRevisionItems,
  listRevisionSources,
  listRevisions,
  markPacksNeedingReviewForDocument,
  startNewContextPackRevision,
  updateContextPack,
  upsertDraftPlan,
} from "@/lib/db/context-packs";

export {
  addImplementationTaskSource,
  deleteImplementationTaskSource,
  listTaskSources,
  type ImplementationTaskSourceRecord,
} from "@/lib/db/implementation-task-sources";

export {
  addImplementationTask,
  addProgressReport,
  claimImplementationTask,
  registerAuthorizedProgress,
  getImplementationTask,
  listAvailableTasks,
  listChildTasks,
  listClaimedTasksForToken,
  listDraftTasks,
  listProgressReports,
  listRevisionTasks,
  releaseImplementationTask,
  renewImplementationTaskLease,
  assignImplementationTask,
  acceptReportedChildren,
  deleteImplementationTask,
  setTaskStatus,
  updateImplementationTaskStatus,
} from "@/lib/db/implementation-tasks";

export {
  addCoordinationMessage,
  countOpenBlockerThreads,
  createCoordinationThread,
  findOpenDiscussionThread,
  getCoordinationThread,
  listCoordinationMessages,
  listCoordinationThreads,
  listMentionsForActor,
  resolveCoordinationThread,
} from "@/lib/db/coordination";

export {
  createAgentIdentity,
  deleteAgentIdentity,
  getAgentIdentity,
  listAgentIdentities,
  setAgentIdentityStatus,
  updateAgentIdentity,
} from "@/lib/db/agent-identities";

export { listAuditEvents, listAuditEventsForIdentity, recordAuditEvent } from "@/lib/db/audit-events";

export {
  ensureCollabRoom,
  getCollabRoom,
  getCollabRoomById,
  listCollabRooms,
} from "@/lib/db/collab-rooms";

export {
  appendCollabEvent,
  collabEventStore,
  getCollabEventByIdempotencyKey,
  getLatestCollabSeq,
  listCollabEvents,
  readCollabEventsSince,
} from "@/lib/db/collab-events";

export { isDatabaseConfigured } from "@/lib/db/client";
